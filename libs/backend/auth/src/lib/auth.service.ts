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
  ): Promise<LoginResult> {
    const user = await this.users.findByEmailWithPassword(email);

    if (!user || !(await verifyPassword(password, user.password))) {
      throw new UnauthorizedError(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    }

    if (this.config.auth.requireVerifiedEmail && !user.emailVerifiedAt) {
      throw new ForbiddenError(
        'EMAIL_NOT_VERIFIED',
        'Please verify your email address before signing in',
      );
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user._id.toString(),
      roles: user.roles,
    };

    return this.issueSession(authenticatedUser, context);
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

    return this.issueSession(
      { id: created._id.toString(), roles: created.roles },
      context,
    );
  }

  /**
   * Starts a session for an already-authenticated identity — used by the
   * local login above and by the OIDC callback, which has verified the
   * user through the identity provider instead of a password.
   */
  async issueSession(
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
    if (!(await verifyPassword(currentPassword, user.password))) {
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
  }

  private async currentRoles(userId: string): Promise<string[]> {
    try {
      const user = await this.users.findById(userId);
      return user.roles;
    } catch {
      // The account was removed between issuing the refresh token and now.
      throw new UnauthorizedError(
        'REFRESH_TOKEN_INVALID',
        'Account no longer exists',
      );
    }
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
