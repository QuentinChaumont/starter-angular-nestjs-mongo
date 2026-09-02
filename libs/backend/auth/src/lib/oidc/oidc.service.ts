import { Injectable } from '@nestjs/common';
import { AppConfigService, NotFoundError } from '@org/backend-core';
import { Issuer, generators } from 'openid-client';
import type { Client } from 'openid-client';
import { OidcClaims } from './oidc-claims';
import {
  ResolvedOidcProvider,
  resolveOidcProvider,
  resolveOidcProviders,
} from './resolve-oidc-config';

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
 * Thin wrapper around `openid-client`: lazy provider discovery (cached per
 * provider id), PKCE Authorization-Code request building, and the callback
 * exchange. The provider's own tokens never leave this class — only the
 * mapped {@link OidcClaims}.
 */
@Injectable()
export class OidcService {
  private readonly clients = new Map<string, Promise<Client>>();

  constructor(private readonly config: AppConfigService) {}

  /** Active providers, as `{ id, label }` — the login page renders one button each. */
  listProviders(): { id: string; label: string }[] {
    return resolveOidcProviders(this.config).map(({ id, label }) => ({
      id,
      label,
    }));
  }

  requireProvider(providerId: string): ResolvedOidcProvider {
    const provider = resolveOidcProvider(this.config, providerId);
    if (!provider) {
      throw new NotFoundError(
        'OIDC_PROVIDER_UNKNOWN',
        `No active OIDC provider "${providerId}"`,
      );
    }
    return provider;
  }

  private getClient(provider: ResolvedOidcProvider): Promise<Client> {
    let client = this.clients.get(provider.id);
    if (!client) {
      client = this.discoverClient(provider);
      this.clients.set(provider.id, client);
    }
    return client;
  }

  private async discoverClient(
    provider: ResolvedOidcProvider,
  ): Promise<Client> {
    try {
      const issuer = await Issuer.discover(provider.issuer);
      if (provider.clientSecret) {
        return new issuer.Client({
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
          redirect_uris: [provider.redirectUri],
          response_types: ['code'],
        });
      }
      return new issuer.Client({
        client_id: provider.clientId,
        token_endpoint_auth_method: 'none',
        redirect_uris: [provider.redirectUri],
        response_types: ['code'],
      });
    } catch (error) {
      // A failed discovery must not be cached forever.
      this.clients.delete(provider.id);
      throw error;
    }
  }

  async createAuthRequest(providerId: string): Promise<OidcAuthRequest> {
    const provider = this.requireProvider(providerId);
    const client = await this.getClient(provider);

    const codeVerifier = generators.codeVerifier();
    const state = generators.state();
    const nonce = generators.nonce();

    const url = client.authorizationUrl({
      scope: provider.scopes,
      state,
      nonce,
      code_challenge: generators.codeChallenge(codeVerifier),
      code_challenge_method: 'S256',
    });

    return { url, state, nonce, codeVerifier };
  }

  async exchange(
    providerId: string,
    params: { code: string; state: string },
    checks: OidcCallbackChecks,
  ): Promise<OidcClaims> {
    const provider = this.requireProvider(providerId);
    const client = await this.getClient(provider);

    const tokenSet = await client.callback(
      provider.redirectUri,
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
