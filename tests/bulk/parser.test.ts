import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseBulkFile } from '../../src/bulk/parser.js';
import { BulkFormatError } from '../../src/errors/index.js';

// Construye una fila con el layout REAL de 11 columnas del archivo DGII.
// Índices: 0 rnc | 1 nombre | 2 nombreComercial | 3 actividad |
// 4-7 reservadas (vacías) | 8 fechaConstitucion | 9 estado | 10 regimen
function row(parts: {
  rnc: string;
  nombre: string;
  nombreComercial?: string;
  actividad?: string;
  fechaConstitucion?: string;
  estado: string;
  regimen?: string;
}): string {
  return [
    parts.rnc,
    parts.nombre,
    parts.nombreComercial ?? '',
    parts.actividad ?? '',
    '',
    '',
    '',
    '',
    parts.fechaConstitucion ?? '',
    parts.estado,
    parts.regimen ?? '',
  ].join('|');
}

describe('parseBulkFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dgii-parse-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('mapea el layout real de 11 columnas a BulkContribuyente', async () => {
    const content = [
      row({
        rnc: '131098193',
        nombre: 'EMPRESA UNO SRL',
        nombreComercial: 'COMERCIAL UNO',
        actividad: 'COMERCIO',
        fechaConstitucion: '15/03/2020',
        estado: 'ACTIVO',
        regimen: 'NORMAL',
      }),
      row({
        rnc: '401007738',
        nombre: 'EMPRESA DOS SRL',
        nombreComercial: 'COMERCIAL DOS',
        actividad: 'MANUFACTURA',
        fechaConstitucion: '10/06/2019',
        estado: 'SUSPENDIDO',
        regimen: 'RST',
      }),
    ].join('\n');

    const filePath = join(tempDir, 'data.txt');
    await writeFile(filePath, content, 'latin1');

    const results = await parseBulkFile({ filePath });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      rnc: '131098193',
      nombre: 'EMPRESA UNO SRL',
      nombreComercial: 'COMERCIAL UNO',
      actividad: 'COMERCIO',
      estado: 'ACTIVO',
      regimen: 'NORMAL',
      fechaConstitucion: '15/03/2020',
    });
    expect(results[1]).toEqual({
      rnc: '401007738',
      nombre: 'EMPRESA DOS SRL',
      nombreComercial: 'COMERCIAL DOS',
      actividad: 'MANUFACTURA',
      estado: 'SUSPENDIDO',
      regimen: 'RST',
      fechaConstitucion: '10/06/2019',
    });
  });

  it('decodifica nombres acentuados con codificación latin-1', async () => {
    const content = row({
      rnc: '09200033133',
      nombre: 'RAMON MARIA DIAZ MUÑOZ',
      nombreComercial: 'COMERCIAL PEÑA',
      actividad: 'AGRICULTURA',
      fechaConstitucion: '07/08/2013',
      estado: 'ACTIVO',
      regimen: 'NORMAL',
    });

    const filePath = join(tempDir, 'data.txt');
    await writeFile(filePath, content, 'latin1');

    const results = await parseBulkFile({ filePath });
    expect(results[0]!.nombre).toBe('RAMON MARIA DIAZ MUÑOZ');
    expect(results[0]!.nombreComercial).toBe('COMERCIAL PEÑA');
  });

  it('ignora líneas vacías', async () => {
    const content = [
      row({ rnc: '131098193', nombre: 'EMPRESA UNO SRL', estado: 'ACTIVO' }),
      '',
      row({ rnc: '401007738', nombre: 'EMPRESA DOS SRL', estado: 'ACTIVO' }),
    ].join('\n');

    const filePath = join(tempDir, 'data.txt');
    await writeFile(filePath, content, 'latin1');

    const results = await parseBulkFile({ filePath });
    expect(results).toHaveLength(2);
  });

  it('ignora filas con menos de 11 columnas', async () => {
    const content = [
      row({ rnc: '131098193', nombre: 'EMPRESA UNO SRL', estado: 'ACTIVO' }),
      'only|three|fields',
    ].join('\n');

    const filePath = join(tempDir, 'data.txt');
    await writeFile(filePath, content, 'latin1');

    const results = await parseBulkFile({ filePath });
    expect(results).toHaveLength(1);
  });

  it('colapsa espacios dobles en nombres', async () => {
    const content = row({
      rnc: '131098193',
      nombre: 'FOO  BAR  SRL',
      nombreComercial: 'NOMBRE  COM',
      estado: 'ACTIVO',
    });

    const filePath = join(tempDir, 'data.txt');
    await writeFile(filePath, content, 'latin1');

    const results = await parseBulkFile({ filePath });
    expect(results[0]!.nombre).toBe('FOO BAR SRL');
    expect(results[0]!.nombreComercial).toBe('NOMBRE COM');
  });

  it('mantiene fechaConstitucion vacía cuando la columna 8 está vacía', async () => {
    const content = row({
      rnc: '131098193',
      nombre: 'EMPRESA',
      actividad: 'COMERCIO',
      fechaConstitucion: '',
      estado: 'ACTIVO',
      regimen: 'NORMAL',
    });

    const filePath = join(tempDir, 'data.txt');
    await writeFile(filePath, content, 'latin1');

    const results = await parseBulkFile({ filePath });
    expect(results).toHaveLength(1);
    expect(results[0]!.fechaConstitucion).toBe('');
  });

  it('retorna array vacío para archivo vacío', async () => {
    const filePath = join(tempDir, 'empty.txt');
    await writeFile(filePath, '', 'latin1');

    const results = await parseBulkFile({ filePath });
    expect(results).toEqual([]);
  });

  it('lanza BulkFormatError ante el layout viejo de 9 columnas', async () => {
    // Formato viejo (9 columnas): cada fila tiene ≠11 columnas y se
    // descarta por malformada; al no quedar ninguna fila válida, el guard
    // de formato falla ruidosamente en vez de devolver datos en silencio.
    const content = [
      '131098193|EMPRESA UNO SRL|COMERCIAL UNO|CAT1|NORMAL|ACTIVO|COMERCIO|2020-01-01|SANTO DOMINGO',
      '401007738|EMPRESA DOS SRL|COMERCIAL DOS|CAT2|RST|SUSPENDIDO|MANUFACTURA|2019-06-15|SANTIAGO',
    ].join('\n');

    const filePath = join(tempDir, 'old.txt');
    await writeFile(filePath, content, 'latin1');

    await expect(parseBulkFile({ filePath })).rejects.toThrow(BulkFormatError);
  });

  it('lanza BulkFormatError cuando la columna estado no trae un valor reconocido', async () => {
    // 11 columnas pero col 9 ya no es estado (la DGII movió/insertó
    // columnas): debe fallar en vez de devolver un estado sin sentido.
    const content = [
      '131098193',
      'EMPRESA UNO SRL',
      'COMERCIAL UNO',
      'COMERCIO',
      '',
      '',
      '',
      '',
      '15/03/2020',
      'OTRA-COSA',
      'NORMAL',
    ].join('|');

    const filePath = join(tempDir, 'drift.txt');
    await writeFile(filePath, content, 'latin1');

    await expect(parseBulkFile({ filePath })).rejects.toThrow(BulkFormatError);
  });

  it('normaliza estado a mayúsculas y acepta capitalización mixta', async () => {
    // Si la fuente trae 'Activo' (no ACTIVO) no debe fallar: estado se
    // normaliza a mayúsculas y el guard lo reconoce.
    const content = row({
      rnc: '131098193',
      nombre: 'EMPRESA UNO SRL',
      estado: 'Activo',
    });

    const filePath = join(tempDir, 'data.txt');
    await writeFile(filePath, content, 'latin1');

    const results = await parseBulkFile({ filePath });
    expect(results).toHaveLength(1);
    expect(results[0]!.estado).toBe('ACTIVO');
  });

  it('lanza BulkFormatError si solo una minoría trae un estado reconocido', async () => {
    // Layout cambiado: la col 9 ya no es estado. Un solo acierto casual no
    // debe alcanzar para aceptar todo el archivo (1 de 4 = 25% < 50%).
    const content = [
      row({ rnc: '1', nombre: 'A', estado: 'ACTIVO' }),
      row({ rnc: '2', nombre: 'B', estado: 'CALLE DUARTE' }),
      row({ rnc: '3', nombre: 'C', estado: 'SANTO DOMINGO' }),
      row({ rnc: '4', nombre: 'D', estado: 'SANTIAGO' }),
    ].join('\n');

    const filePath = join(tempDir, 'minoria.txt');
    await writeFile(filePath, content, 'latin1');

    await expect(parseBulkFile({ filePath })).rejects.toThrow(BulkFormatError);
  });

  it('acepta el archivo si la mayoría trae un estado reconocido', async () => {
    // Un valor de estado nuevo y minoritario no debe romper el parseo.
    const content = [
      row({ rnc: '1', nombre: 'A', estado: 'ACTIVO' }),
      row({ rnc: '2', nombre: 'B', estado: 'SUSPENDIDO' }),
      row({ rnc: '3', nombre: 'C', estado: 'NUEVO-ESTADO' }),
    ].join('\n');

    const filePath = join(tempDir, 'mayoria.txt');
    await writeFile(filePath, content, 'latin1');

    const results = await parseBulkFile({ filePath });
    expect(results).toHaveLength(3);
    expect(results[2]!.estado).toBe('NUEVO-ESTADO');
  });

  it('respeta la codificación indicada en options (UTF-8)', async () => {
    const content = row({
      rnc: '09200033133',
      nombre: 'RAMON MARIA DIAZ MUÑOZ',
      nombreComercial: 'COMERCIAL PEÑA',
      estado: 'ACTIVO',
    });

    const filePath = join(tempDir, 'utf8.txt');
    await writeFile(filePath, content, 'utf8');

    const results = await parseBulkFile({ filePath, encoding: 'utf8' });
    expect(results[0]!.nombre).toBe('RAMON MARIA DIAZ MUÑOZ');
    expect(results[0]!.nombreComercial).toBe('COMERCIAL PEÑA');
  });

  it('ignora un BOM inicial sin corromper el primer rnc', async () => {
    const body = row({
      rnc: '131098193',
      nombre: 'EMPRESA UNO SRL',
      estado: 'ACTIVO',
    });
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const filePath = join(tempDir, 'bom.txt');
    await writeFile(filePath, Buffer.concat([bom, Buffer.from(body, 'latin1')]));

    const results = await parseBulkFile({ filePath });
    expect(results).toHaveLength(1);
    expect(results[0]!.rnc).toBe('131098193');
  });

  it('ignora un BOM UTF-8 al leer con encoding utf8', async () => {
    const body = row({
      rnc: '131098193',
      nombre: 'EMPRESA MUÑOZ',
      estado: 'ACTIVO',
    });
    const filePath = join(tempDir, 'bom-utf8.txt');
    // El prefijo U+FEFF escrito como UTF-8 produce los bytes EF BB BF.
    await writeFile(filePath, `\uFEFF${body}`, 'utf8');

    const results = await parseBulkFile({ filePath, encoding: 'utf8' });
    expect(results).toHaveLength(1);
    expect(results[0]!.rnc).toBe('131098193');
    expect(results[0]!.nombre).toBe('EMPRESA MUÑOZ');
  });

  it('descarta filas con más de 11 columnas', async () => {
    const valida = row({
      rnc: '131098193',
      nombre: 'EMPRESA UNO SRL',
      estado: 'ACTIVO',
    });
    const content = [
      valida,
      `${valida}|COLUMNA_EXTRA`, // 12 columnas
    ].join('\n');

    const filePath = join(tempDir, 'extra.txt');
    await writeFile(filePath, content, 'latin1');

    const results = await parseBulkFile({ filePath });
    expect(results).toHaveLength(1);
  });

  it('lanza BulkFormatError cuando todas las filas traen una columna de más', async () => {
    // La DGII añade/inserta una columna: el conteo exacto descarta todas las
    // filas y el guard falla ruidosamente en vez de mapear campos corridos.
    const content = [
      `${row({ rnc: '1', nombre: 'A', estado: 'ACTIVO' })}|EXTRA`,
      `${row({ rnc: '2', nombre: 'B', estado: 'ACTIVO' })}|EXTRA`,
    ].join('\n');

    const filePath = join(tempDir, 'todas-extra.txt');
    await writeFile(filePath, content, 'latin1');

    await expect(parseBulkFile({ filePath })).rejects.toThrow(BulkFormatError);
  });
});
