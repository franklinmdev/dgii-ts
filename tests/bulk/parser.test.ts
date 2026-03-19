import { describe, it, expect } from 'vitest';
import { parseBulkFile } from '../../src/bulk/parser.js';

describe('parseBulkFile', () => {
  it('lanza error de no implementado', async () => {
    await expect(
      parseBulkFile({ filePath: '/tmp/data.txt' }),
    ).rejects.toThrow('No implementado');
  });
});
