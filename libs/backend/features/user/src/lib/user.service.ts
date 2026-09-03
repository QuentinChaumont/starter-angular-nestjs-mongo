import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  hashPassword,
  verifyPassword,
} from '@org/backend-core';
import type {
  PaginatedResponse,
  UserProfile,
  UserSummary,
} from '@org/shared-contracts';
import { UserEvents } from './user-events';
import { UserRepository } from './user.repository';
import { User, UserDocument } from './user.schema';

const ADMIN_ROLE = 'admin';

/** Whitelisted `?sort=` values for the admin list → the Mongo field they
 * order by. Anything else falls back to `createdAt`. */
export const USER_SORT_FIELDS = {
  email: 'email',
  name: 'firstName',
  status: 'disabledAt',
  verified: 'emailVerifiedAt',
  createdAt: 'createdAt',
} as const;
type UserSortKey = keyof typeof USER_SORT_FIELDS;

/** Maps a persisted user to the profile contract shared with the frontend. */
export function toUserProfile(user: UserDocument): UserProfile {
  return {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    emailVerifiedAt: user.emailVerifiedAt
      ? user.emailVerifiedAt.toISOString()
      : null,
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    createdAt: user.createdAt.toISOString(),
  };
}

/** The admin-list row: `UserProfile` plus `disabledAt`. */
export function toUserSummary(user: UserDocument): UserSummary {
  return {
    ...toUserProfile(user),
    disabledAt: user.disabledAt ? user.disabledAt.toISOString() : null,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MONGO_DUPLICATE_KEY_CODE = 11000;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === MONGO_DUPLICATE_KEY_CODE
  );
}

@Injectable()
export class UserService {
  constructor(
    private readonly repository: UserRepository,
    private readonly events: UserEvents,
  ) {}

  async findById(id: string): Promise<UserDocument> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    }
    return found;
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.repository.findByEmailWithPassword(email);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.repository.findByEmail(email);
  }

  async findByIdWithPassword(id: string): Promise<UserDocument> {
    const found = await this.repository.findByIdWithPassword(id);
    if (!found) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    }
    return found;
  }

  /** Loads the account with its `select: false` two-factor fields (auth's
   * 2FA setup / verify flows mutate the returned document directly). */
  async findByIdWithTwoFactor(id: string): Promise<UserDocument> {
    const found = await this.repository.findByIdWithTwoFactor(id);
    if (!found) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    }
    return found;
  }

  /** The connected account's own profile. */
  async getProfile(id: string): Promise<UserProfile> {
    return toUserProfile(await this.findById(id));
  }

  /**
   * Edits the connected account. Changing `email` clears `emailVerifiedAt`
   * and fires `user.email-changed` (the `auth-reset` brick then re-sends a
   * verification link). A duplicate email is a `409`.
   */
  async updateProfile(
    id: string,
    input: { firstName?: string; lastName?: string; email?: string },
  ): Promise<UserProfile> {
    const user = await this.findById(id);

    if (input.firstName !== undefined) user.firstName = input.firstName;
    if (input.lastName !== undefined) user.lastName = input.lastName;

    const emailChanged =
      input.email !== undefined &&
      input.email.trim().toLowerCase() !== user.email.toLowerCase();
    if (emailChanged) {
      user.email = input.email as string;
      user.emailVerifiedAt = undefined;
    }

    try {
      await user.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError(
          'USER_EMAIL_ALREADY_EXISTS',
          'A user with this email already exists',
        );
      }
      throw error;
    }

    if (emailChanged) {
      this.events.emitEmailChanged({
        userId: id,
        email: user.email,
        firstName: user.firstName,
      });
    }

    return toUserProfile(user);
  }

  /** Permanent, irreversible. Re-confirms the password first (accounts with
   * no password — OIDC-only — skip that check). Orphaned refresh tokens
   * fail on their next use and are swept by their TTL index. */
  async deleteAccount(id: string, password: string): Promise<void> {
    const user = await this.findByIdWithPassword(id);
    if (user.password && !(await verifyPassword(password, user.password))) {
      throw new ValidationError(
        'INVALID_PASSWORD',
        'The password is incorrect',
      );
    }
    await this.repository.deleteById(id);
  }

  async findAll(): Promise<UserDocument[]> {
    return this.repository.findMany();
  }

  /* ---- admin console (V2.1 step 35) ---- */

  /**
   * Paginated user list. `search` matches email / first / last name at
   * once; `filters` is per-column (contains, case-insensitive); `sort` is
   * one of {@link USER_SORT_FIELDS} with `dir` (default `createdAt` desc).
   */
  async listUsers(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    filters?: Partial<Record<'email' | 'name' | 'roles', string>>;
    sort?: string;
    dir?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<UserSummary>> {
    const clauses: Record<string, unknown>[] = [];

    const contains = (value: string) => ({
      $regex: escapeRegex(value.trim()),
      $options: 'i',
    });

    const search = query.search?.trim();
    if (search) {
      clauses.push({
        $or: (['email', 'firstName', 'lastName'] as const).map((field) => ({
          [field]: contains(search),
        })),
      });
    }
    if (query.filters?.email?.trim()) {
      clauses.push({ email: contains(query.filters.email) });
    }
    if (query.filters?.name?.trim()) {
      const name = contains(query.filters.name);
      clauses.push({ $or: [{ firstName: name }, { lastName: name }] });
    }
    if (query.filters?.roles?.trim()) {
      clauses.push({ roles: contains(query.filters.roles) });
    }

    const filter = clauses.length ? { $and: clauses } : {};
    const sortField =
      USER_SORT_FIELDS[query.sort as UserSortKey] ?? 'createdAt';
    const sort: Record<string, 1 | -1> = {
      [sortField]: query.dir === 'asc' ? 1 : -1,
    };

    const page = await this.repository.findPage(
      filter,
      { page: query.page, pageSize: query.pageSize },
      sort,
    );
    return { ...page, items: page.items.map(toUserSummary) };
  }

  /** Sets a user's roles. Refuses to remove `admin` from the last admin. */
  async setRoles(id: string, roles: string[]): Promise<UserSummary> {
    const user = await this.findById(id);

    const losesAdmin =
      user.roles.includes(ADMIN_ROLE) && !roles.includes(ADMIN_ROLE);
    if (
      losesAdmin &&
      (await this.repository.count({ roles: ADMIN_ROLE })) <= 1
    ) {
      throw new ValidationError(
        'LAST_ADMIN',
        'Cannot remove the last administrator',
      );
    }

    user.roles = [...new Set(roles)];
    await user.save();
    return toUserSummary(user);
  }

  /** Enables / disables an account. A disabled account can't `login` or
   * `refresh` — see the `403 ACCOUNT_DISABLED` gate in `AuthService`. */
  async setStatus(id: string, active: boolean): Promise<UserSummary> {
    const user = await this.findById(id);

    if (active) {
      user.disabledAt = undefined;
    } else if (!user.disabledAt) {
      user.disabledAt = new Date();
    }
    await user.save();

    return toUserSummary(user);
  }

  async create(input: Partial<User>): Promise<UserDocument> {
    try {
      const toCreate = input.password
        ? { ...input, password: await hashPassword(input.password) }
        : input;
      return await this.repository.create(toCreate);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError(
          'USER_EMAIL_ALREADY_EXISTS',
          'A user with this email already exists',
        );
      }
      throw error;
    }
  }

  async updateById(id: string, update: Partial<User>): Promise<UserDocument> {
    const toUpdate = update.password
      ? { ...update, password: await hashPassword(update.password) }
      : update;
    const updated = await this.repository.updateById(id, toUpdate);
    if (!updated) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    }
    return updated;
  }

  /** Idempotent: stamps `emailVerifiedAt` once, keeps the first value. */
  async markEmailVerified(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date();
      await user.save();
    }
    return user;
  }

  async deleteById(id: string): Promise<void> {
    const deleted = await this.repository.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    }
  }
}
