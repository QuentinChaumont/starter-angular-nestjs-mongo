import { nonExistentObjectId } from './fixtures';

describe('nonExistentObjectId', () => {
  it('returns a well-formed 24-hex-character id', () => {
    const id = nonExistentObjectId();

    expect(id).toHaveLength(24);
    expect(id).toMatch(/^[0-9a-f]{24}$/);
  });
});
