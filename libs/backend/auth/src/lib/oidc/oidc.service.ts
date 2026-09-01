import { Injectable } from '@nestjs/common';
import { AppConfigService, UnauthorizedError } from '@org/backend-core';
import { Issuer, generators } from 'openid-client';
import type { Client } from 'openid-client';
import { OidcClaims } from './oidc-claims';
import { ResolvedOidcConfig, resolveOidcConfig } from './resolve-oidc-config';

export interface OidcAuthRequest {
  /** Provider URL to redirect the browser to. */
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

export interface OidcCallbackChecks {
  state: string;
  nonce: string;
  codeVerifier: string;
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/**
 * Thin wrapper around `openid-client`: lazy provider discovery (cached),
 * PKCE Authorization-Code request building, and the callback exchange. The
 * provider's own tokens never leave this class — only the mapped
 * {@link OidcClaims}.
 */
@Injectable()
export class OidcService {
  private clientPromise?: Promise<Client>;

  constructor(private readonly config: AppConfigService) {}

  isEnabled(): boolean {
    return resolveOidcConfig(this.config) !== null;
  }

  private requireConfig(): ResolvedOidcConfig {
    const resolved = resolveOidcConfig(this.config);
    if (!resolved) {
      throw new UnauthorizedError(
        'OIDC_NOT_CONFIGURED',
        'OIDC login is not enabled',
      );
    }
    return resolved;
  }

  private getClient(): Promise<Client> {
    if (!this.clientPromise) {
      this.clientPromise = this.discoverClient();
    }
    return this.clientPromise;
  }

  private async discoverClient(): Promise<Client> {
    const cfg = this.requireConfig();
    try {
      const issuer = await Issuer.discover(cfg.issuer);
      if (cfg.clientSecret) {
        return new issuer.Client({
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          redirect_uris: [cfg.redirectUri],
          response_types: ['code'],
        });
      }
      return new issuer.Client({
        client_id: cfg.clientId,
        token_endpoint_auth_method: 'none',
        redirect_uris: [cfg.redirectUri],
        response_types: ['code'],
      });
    } catch (error) {
      // A failed discovery must not be cached forever.
      this.clientPromise = undefined;
      throw error;
    }
  }

  async createAuthRequest(): Promise<OidcAuthRequest> {
    const cfg = this.requireConfig();
    const client = await this.getClient();

    const codeVerifier = generators.codeVerifier();
    const state = generators.state();
    const nonce = generators.nonce();

    const url = client.authorizationUrl({
      scope: cfg.scopes,
      state,
      nonce,
      code_challenge: generators.codeChallenge(codeVerifier),
      code_challenge_method: 'S256',
    });

    return { url, state, nonce, codeVerifier };
  }

  async exchange(
    params: { code: string; state: string },
    checks: OidcCallbackChecks,
  ): Promise<OidcClaims> {
    const cfg = this.requireConfig();
    const client = await this.getClient();

    const tokenSet = await client.callback(
      cfg.redirectUri,
      { code: params.code, state: params.state },
      {
        state: checks.state,
        nonce: checks.nonce,
        code_verifier: checks.codeVerifier,
      },
    );

    const claims = tokenSet.claims();
    return {
      sub: claims.sub,
      email: asString(claims.email),
      emailVerified: claims.email_verified === true,
      givenName: asString(claims.given_name),
      familyName: asString(claims.family_name),
      name: asString(claims.name),
      raw: claims as Record<string, unknown>,
    };
  }
}
