import {
  BACKUP_CODE_COUNT,
  consumeBackupCode,
  generateBackupCodes,
  hashBackupCodes,
} from './backup-codes';

describe('backup codes', () => {
  it('generates 10 distinct xxxxx-xxxxx codes', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(BACKUP_CODE_COUNT);
    expect(new Set(codes).size).toBe(BACKUP_CODE_COUNT);
    for (const code of codes) {
      expect(code).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}$/);
    }
  });

  it('hashes are opaque (not the code itself)', async () => {
    const [code] = generateBackupCodes(1);
    const [hash] = await hashBackupCodes([code]);
    expect(hash).not.toContain(code);
  });

  it('consumes a matching code exactly once', async () => {
    const codes = generateBackupCodes(3);
    const hashes = await hashBackupCodes(codes);

    const afterFirst = await consumeBackupCode(codes[1], hashes);
    expect(afterFirst).toHaveLength(2);

    // the same code no longer matches the reduced list
    expect(await consumeBackupCode(codes[1], afterFirst as string[])).toBeNull();
  });

  it('accepts a code without its dash and in any case', async () => {
    const codes = generateBackupCodes(1);
    const hashes = await hashBackupCodes(codes);
    const noDash = codes[0].replace('-', '').toUpperCase();

    expect(await consumeBackupCode(noDash, hashes)).toHaveLength(0);
  });

  it('returns null when nothing matches', async () => {
    const hashes = await hashBackupCodes(generateBackupCodes(2));
    expect(await consumeBackupCode('00000-00000', hashes)).toBeNull();
  });
});
