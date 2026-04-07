import { describe, it, expect } from 'vitest';
import { downloadBulkFile } from '../../src/bulk/downloader.js';

describe('downloadBulkFile', () => {
  it('lanza error de no implementado', async () => {
    await expect(
      downloadBulkFile({ outputDir: '/tmp' }),
    ).rejects.toThrow('downloadBulkFile: no implementado');
  });
});
