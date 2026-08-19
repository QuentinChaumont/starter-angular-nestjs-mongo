import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model, Schema } from 'mongoose';
import { BaseRepository } from './base.repository';

interface Widget {
  name: string;
  quantity: number;
}

const widgetSchema = new Schema<Widget>({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
});

class WidgetRepository extends BaseRepository<Widget> {
  constructor(model: Model<Widget>) {
    super(model);
  }
}

describe('BaseRepository (integration, real Mongo instance)', () => {
  let mongod: MongoMemoryServer;
  let connection: mongoose.Connection;
  let repository: WidgetRepository;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    connection = await mongoose.createConnection(mongod.getUri()).asPromise();
    const model = connection.model<Widget>('Widget', widgetSchema);
    repository = new WidgetRepository(model);
  }, 60_000);

  afterEach(async () => {
    await connection.collection('widgets').deleteMany({});
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
  });

  describe('create', () => {
    it('creates and returns a hydrated document', async () => {
      const widget = await repository.create({ name: 'bolt', quantity: 5 });

      expect(widget._id).toBeDefined();
      expect(widget.name).toBe('bolt');
      expect(widget.quantity).toBe(5);
    });
  });

  describe('findById', () => {
    it('returns the document when it exists', async () => {
      const created = await repository.create({ name: 'nut', quantity: 3 });

      const found = await repository.findById(created._id.toString());

      expect(found?.name).toBe('nut');
    });

    it('returns null for a well-formed but unknown id', async () => {
      const unknownId = new mongoose.Types.ObjectId().toString();
      expect(await repository.findById(unknownId)).toBeNull();
    });

    it('returns null (not a CastError) for a malformed id', async () => {
      await expect(
        repository.findById('not-a-valid-object-id'),
      ).resolves.toBeNull();
    });
  });

  describe('findOne', () => {
    it('returns the first document matching the filter', async () => {
      await repository.create({ name: 'washer', quantity: 1 });

      const found = await repository.findOne({ name: 'washer' });

      expect(found?.quantity).toBe(1);
    });

    it('returns null when nothing matches', async () => {
      expect(await repository.findOne({ name: 'does-not-exist' })).toBeNull();
    });
  });

  describe('findMany', () => {
    it('returns every document matching the filter', async () => {
      await repository.create({ name: 'screw', quantity: 1 });
      await repository.create({ name: 'screw', quantity: 2 });
      await repository.create({ name: 'other', quantity: 3 });

      const found = await repository.findMany({ name: 'screw' });

      expect(found).toHaveLength(2);
    });

    it('applies skip and limit', async () => {
      await repository.create({ name: 'a', quantity: 1 });
      await repository.create({ name: 'b', quantity: 2 });
      await repository.create({ name: 'c', quantity: 3 });

      const found = await repository.findMany({}, { skip: 1, limit: 1 });

      expect(found).toHaveLength(1);
    });
  });

  describe('findPage', () => {
    it('paginates results and reports the total count', async () => {
      for (let i = 0; i < 5; i += 1) {
        await repository.create({ name: `item-${i}`, quantity: i });
      }

      const page = await repository.findPage({}, { page: 2, pageSize: 2 });

      expect(page.items).toHaveLength(2);
      expect(page.total).toBe(5);
      expect(page.page).toBe(2);
      expect(page.pageSize).toBe(2);
    });

    it('falls back to sensible defaults when no pagination is given', async () => {
      await repository.create({ name: 'solo', quantity: 1 });

      const page = await repository.findPage();

      expect(page.page).toBe(1);
      expect(page.pageSize).toBe(20);
      expect(page.total).toBe(1);
    });
  });

  describe('updateById', () => {
    it('updates and returns the document', async () => {
      const created = await repository.create({ name: 'rivet', quantity: 1 });

      const updated = await repository.updateById(created._id.toString(), {
        quantity: 9,
      });

      expect(updated?.quantity).toBe(9);
    });

    it('returns null for a malformed id', async () => {
      const result = await repository.updateById('not-a-valid-object-id', {
        quantity: 9,
      });
      expect(result).toBeNull();
    });

    it('returns null for a well-formed but unknown id', async () => {
      const unknownId = new mongoose.Types.ObjectId().toString();
      const result = await repository.updateById(unknownId, { quantity: 9 });
      expect(result).toBeNull();
    });
  });

  describe('deleteById', () => {
    it('deletes the document and returns true', async () => {
      const created = await repository.create({ name: 'clip', quantity: 1 });

      const deleted = await repository.deleteById(created._id.toString());
      expect(deleted).toBe(true);
      expect(await repository.findById(created._id.toString())).toBeNull();
    });

    it('returns false for a malformed id', async () => {
      expect(await repository.deleteById('not-a-valid-object-id')).toBe(
        false,
      );
    });

    it('returns false for a well-formed but unknown id', async () => {
      const unknownId = new mongoose.Types.ObjectId().toString();
      expect(await repository.deleteById(unknownId)).toBe(false);
    });
  });

  describe('exists', () => {
    it('returns true when a matching document exists', async () => {
      await repository.create({ name: 'gasket', quantity: 1 });
      expect(await repository.exists({ name: 'gasket' })).toBe(true);
    });

    it('returns false when no document matches', async () => {
      expect(await repository.exists({ name: 'does-not-exist' })).toBe(
        false,
      );
    });
  });

  describe('count', () => {
    it('counts documents matching the filter', async () => {
      await repository.create({ name: 'pin', quantity: 1 });
      await repository.create({ name: 'pin', quantity: 2 });
      await repository.create({ name: 'other', quantity: 3 });

      expect(await repository.count({ name: 'pin' })).toBe(2);
      expect(await repository.count()).toBe(3);
    });
  });
});
