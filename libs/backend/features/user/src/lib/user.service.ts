import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError, hashPassword } from '@org/backend-core';
import { UserRepository } from './user.repository';
import { User, UserDocument } from './user.schema';

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
  constructor(private readonly repository: UserRepository) {}

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

  async findAll(): Promise<UserDocument[]> {
    return this.repository.findMany();
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

  async deleteById(id: string): Promise<void> {
    const deleted = await this.repository.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    }
  }
}
