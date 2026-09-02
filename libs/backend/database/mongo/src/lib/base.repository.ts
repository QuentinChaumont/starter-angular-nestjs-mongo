import type { PaginatedResponse, PaginationQuery } from '@org/shared-contracts';
import {
  QueryFilter,
  HydratedDocument,
  Model,
  UpdateQuery,
  isValidObjectId,
} from 'mongoose';

export interface FindManyOptions {
  skip?: number;
  limit?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

/**
 * A thin, generic wrapper around a Mongoose Model. It exposes the handful
 * of query primitives features actually need, and normalizes invalid
 * identifiers to "not found" rather than letting a raw Mongoose CastError
 * escape. It does not attempt to hide Mongoose: callers still get real
 * Mongoose documents back, and subclasses have direct access to `model`.
 */
export abstract class BaseRepository<TRawDoc, TCreateInput = Partial<TRawDoc>> {
  protected constructor(protected readonly model: Model<TRawDoc>) {}

  async findById(id: string): Promise<HydratedDocument<TRawDoc> | null> {
    if (!isValidObjectId(id)) {
      return null;
    }
    return this.model.findById(id).exec();
  }

  async findOne(
    filter: QueryFilter<TRawDoc>,
  ): Promise<HydratedDocument<TRawDoc> | null> {
    return this.model.findOne(filter).exec();
  }

  async findMany(
    filter: QueryFilter<TRawDoc> = {},
    options: FindManyOptions = {},
  ): Promise<HydratedDocument<TRawDoc>[]> {
    const query = this.model.find(filter);

    if (options.skip !== undefined) {
      query.skip(options.skip);
    }
    if (options.limit !== undefined) {
      query.limit(options.limit);
    }

    return query.exec();
  }

  async findPage(
    filter: QueryFilter<TRawDoc> = {},
    pagination: PaginationQuery = {},
    sort?: Record<string, 1 | -1>,
  ): Promise<PaginatedResponse<HydratedDocument<TRawDoc>>> {
    const page =
      pagination.page && pagination.page > 0 ? pagination.page : DEFAULT_PAGE;
    const pageSize =
      pagination.pageSize && pagination.pageSize > 0
        ? pagination.pageSize
        : DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    const query = this.model.find(filter).skip(skip).limit(pageSize);
    if (sort) {
      query.sort(sort);
    }

    const [items, total] = await Promise.all([
      query.exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { items, total, page, pageSize };
  }

  async create(input: TCreateInput): Promise<HydratedDocument<TRawDoc>> {
    const created = await this.model.create(input as Partial<TRawDoc>);
    return created as HydratedDocument<TRawDoc>;
  }

  async updateById(
    id: string,
    update: UpdateQuery<TRawDoc>,
  ): Promise<HydratedDocument<TRawDoc> | null> {
    if (!isValidObjectId(id)) {
      return null;
    }
    return this.model
      .findByIdAndUpdate(id, update, { returnDocument: 'after' })
      .exec();
  }

  async deleteById(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) {
      return false;
    }
    const deleted = await this.model.findByIdAndDelete(id).exec();
    return deleted !== null;
  }

  async exists(filter: QueryFilter<TRawDoc>): Promise<boolean> {
    const match = await this.model.exists(filter);
    return match !== null;
  }

  async count(filter: QueryFilter<TRawDoc> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
