import type { RoleRepository } from './role.repository';
import { RoleCatalogService } from './role-catalog.service';

function build(known: string[]): RoleCatalogService {
  const repo = {
    existingNames: async (names: string[]) =>
      names.filter((n) => known.includes(n)),
  } as unknown as RoleRepository;
  return new RoleCatalogService(repo);
}

describe('RoleCatalogService', () => {
  it('accepts an empty list', async () => {
    await expect(build([]).assertAllExist([])).resolves.toBeUndefined();
  });

  it('accepts names that all exist (dedupes first)', async () => {
    await expect(
      build(['admin', 'editor']).assertAllExist(['admin', 'admin', 'editor']),
    ).resolves.toBeUndefined();
  });

  it('rejects with UNKNOWN_ROLE listing the missing names', async () => {
    await expect(
      build(['admin']).assertAllExist(['admin', 'ghost', 'phantom']),
    ).rejects.toMatchObject({
      code: 'UNKNOWN_ROLE',
      message: expect.stringContaining('ghost, phantom'),
    });
  });
});
