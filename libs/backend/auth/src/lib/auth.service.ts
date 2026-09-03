import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AppConfigService,
  AuthenticatedUser,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
  verifyPassword,
} from '@org/backend-core';
import { UserService } from '@org/backend-features-user';
import { AuthEvents } from './auth-events';
import { generateOpaqueToken } from './refresh/opaque-token';
import { parseDurationMs } from './refresh/parse-duration';
import {
  IssuedRefreshToken,
  RefreshTokenService,
  SessionContext,
} from './refresh/refresh-token.service';
import { resolveJwtConfig } from './resolve-jwt-config';

const MILLIS_PER_SECOND = 1000;

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** Everything the HTTP layer needs to (re)set the session cookies. */
export interface AuthSession {
  refreshToken: string;
  refreshExpiresAt: Date;
  csrfToken: string;
}

export interface LoginResult {
  accessToken: string;
  expiresIn: number;
  user: AuthenticatedUser;
  session: AuthSession;
}

/**
 * Returned by {@link AuthService.issueSession} when the account has TOTP
 * two-factor on: no session yet, just a short-lived token to exchange for
 * one via `POST /auth/2fa/verify` (V2.2 step 43).
 */
export interface PendingTwoFactorResult {
  twoFactorRequired: true;
  pendingToken: string;
  expiresIn: number;
}

export function isPendingTwoFactor(
  result: LoginResult | PendingTwoFactorResult,
): result is PendingTwoFactorResult {
  return 'twoFactorRequired' in result;
}

/** How long a `pending_2fa` token is valid — one prompt, no lingering. */
const PENDING_TWO_FACTOR_TTL_SECONDS = 5 * 60;

export interface RefreshResult {
  accessToken: string;
  expiresIn: number;
  session: AuthSession;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserService,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly config: AppConfigService,
    private readonly events: AuthEvents,
  ) {}

  async login(
    email: string,
    password: string,
    context: SessionContext = {},
  ): Promise<LoginResult | PendingTwoFactorResult> {
    const user = await this.users.findByEmailWithPassword(email);

    const fail = (reason: string): never => {
      this.events.emitLoginFailed({
        email,
        ip: context.ip,
        userAgent: context.userAgent,
        reason,
      });
      if (reason === 'ACCOUNT_DISABLED') {
        throw new ForbiddenError(reason, 'This account has been disabled');
      }
      if (reason === 'EMAIL_NOT_VERIFIED') {
        throw new ForbiddenError(
          reason,
          'Please verify your email address before signing in',
        );
      }
      throw new UnauthorizedError(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    };

    if (
      !user ||
      !user.password ||
      !(await verifyPassword(password, user.password))
    ) {
      return fail('INVALID_CREDENTIALS');
    }
    if (user.disabledAt) {
      return fail('ACCOUNT_DISABLED');
    }
    if (this.config.auth.requireVerifiedEmail && !user.emailVerifiedAt) {
      return fail('EMAIL_NOT_VERIFIED');
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user._id.toString(),
      roles: user.roles,
    };

    const result = await this.issueSession(authenticatedUser, context);
    if (!isPendingTwoFactor(result)) {
      this.events.emitLoginSucceeded({
        userId: authenticatedUser.id,
        ip: context.ip,
        userAgent: context.userAgent,
        method: 'password',
      });
    }
    return result;
  }

  /**
   * Self-service email/password registration. Creates the account (with no
   * roles) and immediately starts a session, so the SPA lands the new user
   * straight in. Disabled when `AUTH_REGISTRATION_ENABLED=false`.
   */
  async register(
    input: RegisterInput,
    context: SessionContext = {},
  ): Promise<LoginResult> {
    if (!this.config.auth.registrationEnabled) {
      throw new ForbiddenError(
        'REGISTRATION_DISABLED',
        'Self-service registration is disabled',
      );
    }

    const created = await this.users.create({
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      roles: [],
    });

    // Optional bricks (auth-reset) hook this to send a verification email.
    this.events.emitUserRegistered({
      userId: created._id.toString(),
      email: created.email,
      firstName: created.firstName,
    });

    // A brand-new account can't have 2FA yet — start the session directly.
    return this.startSession(
      { id: created._id.toString(), roles: created.roles },
      context,
    );
  }

  /**
   * Starts a session for an already-authenticated identity — used by local
   * login and by the OIDC callback (which verified the user through the
   * provider). If the account has TOTP two-factor on, returns a
   * {@link PendingTwoFactorResult} instead: the caller must send the user
   * through `POST /auth/2fa/verify` before a real session is issued.
   */
  async issueSession(
    user: AuthenticatedUser,
    context: SessionContext = {},
  ): Promise<LoginResult | PendingTwoFactorResult> {
    const account = await this.users.findById(user.id);
    if (account.twoFactorEnabled) {
      return {
        twoFactorRequired: true,
        pendingToken: await this.jwt.signAsync(
          { sub: user.id, twoFactorPending: true },
          { expiresIn: PENDING_TWO_FACTOR_TTL_SECONDS },
        ),
        expiresIn: PENDING_TWO_FACTOR_TTL_SECONDS,
      };
    }
    return this.startSession(user, context);
  }

  /** The un-gated session core — also the second leg of a 2FA login. */
  async startSession(
    user: AuthenticatedUser,
    context: SessionContext = {},
  ): Promise<LoginResult> {
    const accessToken = await this.signAccessToken(user);
    const issued = await this.refreshTokens.issue(user.id, context);

    return {
      accessToken,
      expiresIn: this.accessTokenTtlSeconds,
      user,
      session: this.toSession(issued),
    };
  }

  /**
   * Validates a `pending_2fa` token (from {@link issueSession}) and returns
   * the user id it was minted for. `401` on anything else — it grants
   * access to nothing but `POST /auth/2fa/verify`.
   */
  async consumePendingTwoFactor(token: string): Promise<string> {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        twoFactorPending?: boolean;
      }>(token);
      if (payload.twoFactorPending && payload.sub) {
        return payload.sub;
      }
    } catch {
      // fall through
    }
    throw new UnauthorizedError(
      'TWO_FACTOR_PENDING_INVALID',
      'This two-factor session has expired — sign in again',
    );
  }

  async refresh(
    presentedToken: string | undefined,
    context: SessionContext = {},
  ): Promise<RefreshResult> {
    if (!presentedToken) {
      throw new UnauthorizedError(
        'REFRESH_TOKEN_MISSING',
        'No refresh token provided',
      );
    }

    const { userId, issued } = await this.refreshTokens.rotate(
      presentedToken,
      context,
    );

    const roles = await this.currentRoles(userId);
    const accessToken = await this.signAccessToken({ id: userId, roles });

    return {
      accessToken,
      expiresIn: this.accessTokenTtlSeconds,
      session: this.toSession(issued),
    };
  }

  isRegistrationEnabled(): boolean {
    return this.config.auth.registrationEnabled;
  }

  /**
   * The `GET /auth/me` payload: the JWT identity (`id` + `roles`) plus
   * `emailVerifiedAt`, which the token doesn't carry. A fuller profile
   * endpoint arrives with V2.1 step 34.
   */
  async currentUser(
    userId: string,
  ): Promise<AuthenticatedUser & { emailVerifiedAt: string | null }> {
    const user = await this.users.findById(userId);
    return {
      id: userId,
      roles: user.roles,
      emailVerifiedAt: user.emailVerifiedAt
        ? user.emailVerifiedAt.toISOString()
        : null,
    };
  }

  async logout(presentedToken: string | undefined): Promise<void> {
    if (presentedToken) {
      await this.refreshTokens.revoke(presentedToken);
    }
  }

  /**
   * Verifies the current password, sets the new one, and revokes every
   * **other** session (`currentToken` — the caller's refresh cookie — is
   * spared, so the browser that made the change stays signed in). A wrong
   * current password is a `400` and touches nothing.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentToken: string | undefined,
  ): Promise<void> {
    const user = await this.users.findByIdWithPassword(userId);
    if (
      !user.password ||
      !(await verifyPassword(currentPassword, user.password))
    ) {
      throw new ValidationError(
        'INVALID_CURRENT_PASSWORD',
        'The current password is incorrect',
      );
    }

    await this.users.updateById(userId, { password: newPassword });

    if (currentToken) {
      await this.refreshTokens.revokeAllForUserExcept(userId, currentToken);
    } else {
      await this.refreshTokens.revokeAllForUser(userId);
    }

    this.events.emitPasswordChanged({ userId });
  }

  private async currentRoles(userId: string): Promise<string[]> {
    const user = await this.users.findById(userId).catch(() => {
      // The account was removed between issuing the refresh token and now.
      throw new UnauthorizedError(
        'REFRESH_TOKEN_INVALID',
        'Account no longer exists',
      );
    });
    if (user.disabledAt) {
      throw new ForbiddenError(
        'ACCOUNT_DISABLED',
        'This account has been disabled',
      );
    }
    return user.roles;
  }

  private signAccessToken(user: AuthenticatedUser): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, roles: user.roles });
  }

  private toSession(issued: IssuedRefreshToken): AuthSession {
    return {
      refreshToken: issued.token,
      refreshExpiresAt: issued.expiresAt,
      csrfToken: generateOpaqueToken(),
    };
  }

  private get accessTokenTtlSeconds(): number {
    const { expiresIn } = resolveJwtConfig(this.config);
    return Math.floor(parseDurationMs(expiresIn) / MILLIS_PER_SECOND);
  }
}
