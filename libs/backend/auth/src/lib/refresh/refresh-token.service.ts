import { Injectable } from '@nestjs/common';
import {
  AppConfigService,
  NotFoundError,
  UnauthorizedError,
} from '@org/backend-core';
import type { SessionInfo } from '@org/shared-contracts';
import { AuthEvents } from '../auth-events';
import { generateOpaqueToken, hashToken } from './opaque-token';
import { RefreshTokenRepository } from './refresh-token.repository';
import { resolveRefreshTtlMs } from './resolve-refresh-config';

const FAMILY_BYTE_LENGTH = 16;

export interface SessionContext {
  userAgent?: string;
  ip?: string;
}

export interface IssuedRefreshToken {
  /** The raw token — returned once, to be put in the httpOnly cookie. */
  token: string;
  expiresAt: Date;
  family: string;
}

/**
 * Issues, rotates and revokes refresh tokens. The cookie plumbing lives in
 * `AuthCookieService`; this class only deals with the persisted lineage.
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly repository: RefreshTokenRepository,
    private readonly config: AppConfigService,
    private readonly events: AuthEvents,
  ) {}

  async issue(
    userId: string,
    context: SessionContext = {},
    family?: string,
    sessionStartedAt?: Date,
  ): Promise<IssuedRefreshToken> {
    const token = generateOpaqueToken();
    const resolvedFamily = family ?? generateOpaqueToken(FAMILY_BYTE_LENGTH);
    const expiresAt = new Date(Date.now() + resolveRefreshTtlMs(this.config));

    await this.repository.create({
      userId,
      tokenHash: hashToken(token),
      family: resolvedFamily,
      expiresAt,
      userAgent: context.userAgent,
      ip: context.ip,
      sessionStartedAt: sessionStartedAt ?? new Date(),
    });

    return { token, expiresAt, family: resolvedFamily };
  }

  /**
   * Validates a presented refresh token and issues its successor. Throws
   * (uniform `UnauthorizedError`) on anything suspicious; a token that was
   * already rotated is treated as a leak and takes its whole family down.
   */
  async rotate(
    presentedToken: string,
    context: SessionContext = {},
  ): Promise<{ userId: string; issued: IssuedRefreshToken }> {
    const existing = await this.repository.findByHash(
      hashToken(presentedToken),
    );

    if (!existing) {
      throw new UnauthorizedError(
        'REFRESH_TOKEN_INVALID',
        'Invalid refresh token',
      );
    }
    if (existing.revokedAt) {
      await this.repository.revokeFamily(existing.family);
      this.events.emitTokenReused({
        userId: existing.userId,
        familyId: existing.family,
      });
      throw new UnauthorizedError(
        'REFRESH_TOKEN_REUSED',
        'Refresh token has already been used',
      );
    }
    if (existing.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError(
        'REFRESH_TOKEN_EXPIRED',
        'Refresh token has expired',
      );
    }

    const issued = await this.issue(
      existing.userId,
      context,
      existing.family,
      existing.sessionStartedAt ?? existing.createdAt,
    );
    await this.repository.markRotated(existing.id, hashToken(issued.token));
    await this.repository.deleteExpiredForUser(existing.userId);

    return { userId: existing.userId, issued };
  }

  /** Idempotent: a missing or already-revoked token is a no-op. */
  async revoke(presentedToken: string): Promise<void> {
    const existing = await this.repository.findByHash(
      hashToken(presentedToken),
    );
    if (existing && !existing.revokedAt) {
      await this.repository.revokeById(existing.id);
    }
  }

  /** "Sign out everywhere". */
  revokeAllForUser(userId: string): Promise<void> {
    return this.repository.revokeAllForUser(userId);
  }

  /**
   * Revokes every session except the one holding `keepToken` (raw). Used by
   * `change-password`: kill other sessions, leave the caller signed in.
   */
  revokeAllForUserExcept(userId: string, keepToken: string): Promise<void> {
    return this.repository.revokeAllForUserExcept(userId, hashToken(keepToken));
  }

  /* ---- sessions / devices (V2.3 step 46) ---- */

  /**
   * The user's live sessions, one per token `family`, newest activity
   * first. `current` marks the family whose live token hashes to
   * `currentToken` (the caller's refresh cookie).
   */
  async listSessions(
    userId: string,
    currentToken?: string,
  ): Promise<SessionInfo[]> {
    const currentHash = currentToken ? hashToken(currentToken) : undefined;
    const rows = await this.repository.findLiveForUser(userId);

    const seen = new Set<string>();
    const sessions: SessionInfo[] = [];
    for (const row of rows) {
      if (seen.has(row.family)) {
        continue;
      }
      seen.add(row.family);
      sessions.push({
        id: row.family,
        ip: row.ip ?? null,
        userAgent: row.userAgent ?? null,
        createdAt: (row.sessionStartedAt ?? row.createdAt).toISOString(),
        lastUsedAt: row.createdAt.toISOString(),
        current: currentHash !== undefined && row.tokenHash === currentHash,
      });
    }
    return sessions.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  }

  /** `family` of the session that owns `token` (raw), or `undefined`. */
  async familyOfToken(token: string): Promise<string | undefined> {
    const row = await this.repository.findByHash(hashToken(token));
    return row?.family;
  }

  /** Ends one session. `404` when `family` isn't the user's. */
  async revokeSession(userId: string, family: string): Promise<void> {
    const ok = await this.repository.revokeFamilyForUser(userId, family);
    if (!ok) {
      throw new NotFoundError('SESSION_NOT_FOUND', 'No such session');
    }
  }
}
