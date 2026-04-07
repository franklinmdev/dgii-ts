import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PassThrough } from 'node:stream';
import type { IncomingMessage, ClientRequest } from 'node:http';

vi.mock('node:https', () => ({
  get: vi.fn(),
}));

import { get } from 'node:https';
import { downloadBulkFile } from '../../src/bulk/downloader.js';

const mockedGet = vi.mocked(get);

function createMockResponse(statusCode: number, data?: string): IncomingMessage {
  const stream = new PassThrough();
  (stream as unknown as IncomingMessage).statusCode = statusCode;
  (stream as unknown as IncomingMessage).headers = {};
  if (data) {
    stream.end(data);
  } else {
    stream.end();
  }
  return stream as unknown as IncomingMessage;
}

function createMockRequest(): ClientRequest {
  const req = new PassThrough() as unknown as ClientRequest;
  req.setTimeout = vi.fn().mockReturnValue(req);
  req.destroy = vi.fn().mockReturnValue(req);
  return req;
}

describe('downloadBulkFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dgii-test-'));
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('descarga archivo exitosamente', async () => {
    const mockReq = createMockRequest();
    const mockRes = createMockResponse(200, 'ZIP_DATA');

    mockedGet.mockImplementation((_url, callback) => {
      (callback as (res: IncomingMessage) => void)(mockRes);
      return mockReq;
    });

    const result = await downloadBulkFile({ outputDir: tempDir });

    expect(result).toBe(join(tempDir, 'DGII_RNC.zip'));
    const content = await readFile(result, 'utf-8');
    expect(content).toBe('ZIP_DATA');
  });

  it('lanza error para HTTP 404', async () => {
    const mockReq = createMockRequest();
    const mockRes = createMockResponse(404);

    mockedGet.mockImplementation((_url, callback) => {
      (callback as (res: IncomingMessage) => void)(mockRes);
      return mockReq;
    });

    await expect(
      downloadBulkFile({ outputDir: tempDir }),
    ).rejects.toThrow('404');
  });

  it('aplica timeout por defecto de 60s', async () => {
    const mockReq = createMockRequest();
    const mockRes = createMockResponse(200, 'data');

    mockedGet.mockImplementation((_url, callback) => {
      (callback as (res: IncomingMessage) => void)(mockRes);
      return mockReq;
    });

    await downloadBulkFile({ outputDir: tempDir });

    expect(mockReq.setTimeout).toHaveBeenCalledWith(60000, expect.any(Function));
  });

  it('clamps timeout al minimo de 5s', async () => {
    const mockReq = createMockRequest();
    const mockRes = createMockResponse(200, 'data');

    mockedGet.mockImplementation((_url, callback) => {
      (callback as (res: IncomingMessage) => void)(mockRes);
      return mockReq;
    });

    await downloadBulkFile({ outputDir: tempDir, timeout: 1 });

    expect(mockReq.setTimeout).toHaveBeenCalledWith(5000, expect.any(Function));
  });

  it('lanza error para fallo de conexion', async () => {
    const mockReq = createMockRequest();

    mockedGet.mockImplementation((_url, _callback) => {
      // Simulate connection error on next tick
      process.nextTick(() => {
        mockReq.emit('error', new Error('ECONNREFUSED'));
      });
      return mockReq;
    });

    await expect(
      downloadBulkFile({ outputDir: tempDir }),
    ).rejects.toThrow('Error de conexion al descargar archivo masivo');
  });

  it('sigue un redirect y descarga exitosamente', async () => {
    const mockReq = createMockRequest();
    const redirectRes = createMockResponse(302);
    (redirectRes as unknown as Record<string, unknown>).headers = {
      location: 'https://redirected.example.com/file.zip',
    };
    redirectRes.resume = vi.fn();

    const finalRes = createMockResponse(200, 'REDIRECTED_DATA');

    let callCount = 0;
    mockedGet.mockImplementation((_url, callback) => {
      callCount++;
      if (callCount === 1) {
        (callback as (res: IncomingMessage) => void)(redirectRes);
      } else {
        (callback as (res: IncomingMessage) => void)(finalRes);
      }
      return mockReq;
    });

    const result = await downloadBulkFile({ outputDir: tempDir });
    expect(result).toBe(join(tempDir, 'DGII_RNC.zip'));
  });

  it('lanza error de timeout', async () => {
    const mockReq = createMockRequest();

    mockedGet.mockImplementation((_url, _callback) => {
      // Simulate timeout callback firing
      process.nextTick(() => {
        const timeoutCb = (mockReq.setTimeout as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as (() => void) | undefined;
        if (timeoutCb) timeoutCb();
      });
      return mockReq;
    });

    await expect(
      downloadBulkFile({ outputDir: tempDir }),
    ).rejects.toThrow('Timeout');
    expect(mockReq.destroy).toHaveBeenCalled();
  });

  it('lanza error de conexion en redirect', async () => {
    const mockReq = createMockRequest();
    const redirectRes = createMockResponse(302);
    (redirectRes as unknown as Record<string, unknown>).headers = {
      location: 'https://redirected.example.com/file.zip',
    };
    redirectRes.resume = vi.fn();

    const mockReq2 = createMockRequest();

    let callCount = 0;
    mockedGet.mockImplementation((_url, callback) => {
      callCount++;
      if (callCount === 1) {
        (callback as (res: IncomingMessage) => void)(redirectRes);
        return mockReq;
      }
      // Second request errors
      process.nextTick(() => {
        mockReq2.emit('error', new Error('redirect failed'));
      });
      return mockReq2;
    });

    await expect(
      downloadBulkFile({ outputDir: tempDir }),
    ).rejects.toThrow('Error de conexion al descargar archivo masivo');
  });

  it('maneja respuesta sin statusCode', async () => {
    const mockReq = createMockRequest();
    const stream = new PassThrough();
    (stream as unknown as IncomingMessage).headers = {};
    // statusCode deliberately undefined
    stream.end();

    mockedGet.mockImplementation((_url, callback) => {
      (callback as (res: IncomingMessage) => void)(stream as unknown as IncomingMessage);
      return mockReq;
    });

    await expect(
      downloadBulkFile({ outputDir: tempDir }),
    ).rejects.toThrow('desconocido');
  });

  it('lanza error si pipeline falla al escribir', async () => {
    const mockReq = createMockRequest();
    const stream = new PassThrough();
    (stream as unknown as IncomingMessage).statusCode = 200;
    (stream as unknown as IncomingMessage).headers = {};
    // Write to a non-existent directory to cause pipeline error
    const badDir = join(tempDir, 'nonexistent', 'subdir');

    mockedGet.mockImplementation((_url, callback) => {
      (callback as (res: IncomingMessage) => void)(stream as unknown as IncomingMessage);
      // End the stream after the pipe is set up
      process.nextTick(() => stream.end('data'));
      return mockReq;
    });

    await expect(
      downloadBulkFile({ outputDir: badDir }),
    ).rejects.toThrow();
  });
});
