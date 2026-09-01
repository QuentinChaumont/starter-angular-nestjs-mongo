import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AppConfigService,
  UnauthorizedError,
  verifyPassword,
} from '@org/backend-core';
import { UserService } from '@org/backend-features-user';
import { AuthenticatedUser } from './models/authenticated-user';
import { generateOpaqueToken } from './refresh/opaque-token';
import { parseDurationMs } from './refresh/parse-duration';
import {
  IssuedRefreshToken,
  RefreshTokenService,
  SessionContext,
} from './refresh/refresh-token.service';
import { resolveJwtConfig } from './resolve-jwt-config';

const MILLIS_PER_SECOND = 1000;

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

    const authenticatedUser: AuthenticatedUser = {
      id: user._id.toString(),
      roles: user.roles,
    };

    return this.issueSession(authenticatedUser, context);
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

  async logout(presentedToken: string | undefined): Promise<void> {
    if (presentedToken) {
      await this.refreshTokens.revoke(presentedToken);
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
