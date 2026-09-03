import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * A single OIDC login method linked to a local `user` (V2.2 step 42).
 * Replaces the implicit "link by email" that `OidcUserLinker` used to do:
 * one row per `(provider, subject)` a user has authenticated with, so the
 * same account can carry a local password **and** Google **and** Keycloak
 * at once.
 *
 * `linkedAt` is the Mongoose `createdAt`, renamed — the row is never
 * updated in place (a re-link of the same `(provider, subject)` is a no-op),
 * so there is no `updatedAt`.
 */
@Schema({ timestamps: { createdAt: 'linkedAt', updatedAt: false } })
export class Identity {
  /** Owning user's `_id`, as a string (same convention as refresh tokens). */
  @Prop({ required: true, index: true })
  userId!: string;

  /** OIDC provider id — `generic`, `google`, `keycloak`. */
  @Prop({ required: true })
  provider!: string;

  /** The `sub` claim from that provider's id-token — stable per user. */
  @Prop({ required: true })
  subject!: string;

  /** Email the provider asserted at link time (informational only). */
  @Prop()
  email?: string;

  linkedAt!: Date;
}

export type IdentityDocument = HydratedDocument<Identity>;

export const IdentitySchema = SchemaFactory.createForClass(Identity);

// One provider identity belongs to exactly one local account.
IdentitySchema.index({ provider: 1, subject: 1 }, { unique: true });
