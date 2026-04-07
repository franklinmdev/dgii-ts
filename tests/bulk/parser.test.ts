import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseBulkFile } from '../../src/bulk/parser.js';

describe('parseBulkFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dgii-parse-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('parsea archivo pipe-delimited correctamente', async () => {
    const content = [
      '131098193|EMPRESA UNO SRL|COMERCIAL UNO|CAT1|NORMAL|Activo|COMERCIO|2020-01-01|SANTO DOMINGO',
      '401007738|EMPRESA DOS SRL|COMERCIAL DOS|CAT2|PST|Suspendido|MANUFACTURA|2019-06-15|SANTIAGO',
      '101012345|PERSONA TRES|TRES|CAT3|N/D|Activo|SERVICIOS|2018-03-20|LA VEGA',
    ].join('\n');

    const filePath = join(tempDir, 'data.txt');
    await writeFile(filePath, content, 'utf-8');

    const results = await parseBulkFile({ filePath });

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      rnc: '131098193',
      nombre: 'EMPRESA UNO SRL',
      nombreComercial: 'COMERCIAL UNO',
      actividad: 'COMERCIO',
      estado: 'Activo',
      regimen: 'NORMAL',
      fechaConstitucion: '2020-01-01',
    });
  });

  it('ignora lineas vacias', async () => {
    const content = [
      '131098193|EMPRESA UNO SRL|COMERCIAL|CAT|NORMAL|Activo|COMERCIO|2020-01-01|SD',
      '',
      '401007738|EMPRESA DOS SRL|COMERCIAL|CAT|PST|Activo|MANUFACTURA|2019-06-15|STI',
    ].join('\n');

    const filePath = join(tempDir, 'data.txt');
    await writeFile(filePath, content, 'utf-8');

    const results = await parseBulkFile({ filePath });
    expect(results).toHaveLength(2);
  });

  it('ignora lineas con campos insuficientes', async () => {
    const content = [
      '131098193|EMPRESA UNO SRL|COMERCIAL|CAT|NORMAL|Activo|COMERCIO|2020-01-01|SD',
      'only|three|fields',
    ].join('\n');

    const filePath = join(tempDir, 'data.txt');
    await writeFile(filePath, content, 'utf-8');

    const results = await parseBulkFile({ filePath });
    expect(results).toHaveLength(1);
  });

  it('colapsa espacios dobles en nombres', async () => {
    const content =
      '131098193|FOO  BAR  SRL|NOMBRE  COM|CAT|NORMAL|Activo|COMERCIO|2020-01-01|SD';

    const filePath = join(tempDir, 'data.txt');
    await writeFile(filePath, content, 'utf-8');

    const results = await parseBulkFile({ filePath });
    expect(results[0]!.nombre).toBe('FOO BAR SRL');
    expect(results[0]!.nombreComercial).toBe('NOMBRE COM');
  });

  it('maneja filas con exactamente 7 campos (sin fechaConstitucion)', async () => {
    const content = '131098193|EMPRESA|COMERCIAL|CAT|NORMAL|Activo|COMERCIO';

    const filePath = join(tempDir, 'data.txt');
    await writeFile(filePath, content, 'utf-8');

    const results = await parseBulkFile({ filePath });
    expect(results).toHaveLength(1);
    expect(results[0]!.fechaConstitucion).toBe('');
  });

  it('retorna array vacio para archivo vacio', async () => {
    const filePath = join(tempDir, 'empty.txt');
    await writeFile(filePath, '', 'utf-8');

    const results = await parseBulkFile({ filePath });
    expect(results).toEqual([]);
  });
});
