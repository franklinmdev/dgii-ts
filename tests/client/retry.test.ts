import { describe, it, expect, vi } from 'vitest';
import { withRetry, isRetryableError } from '../../src/client/retry.js';
import {
  DgiiConnectionError,
  DgiiNotFoundError,
  DgiiServiceError,
} from '../../src/errors/index.js';

describe('isRetryableError', () => {
  it('DgiiConnectionError es reintentable', () => {
    expect(isRetryableError(new DgiiConnectionError('timeout'))).toBe(true);
  });

  it('DgiiServiceError con 500 es reintentable', () => {
    expect(
      isRetryableError(new DgiiServiceError('error', { statusCode: 500 })),
    ).toBe(true);
  });

  it('DgiiServiceError con 503 es reintentable', () => {
    expect(
      isRetryableError(new DgiiServiceError('error', { statusCode: 503 })),
    ).toBe(true);
  });

  it('DgiiServiceError con 403 no es reintentable', () => {
    expect(
      isRetryableError(new DgiiServiceError('error', { statusCode: 403 })),
    ).toBe(false);
  });

  it('DgiiServiceError sin statusCode no es reintentable', () => {
    expect(isRetryableError(new DgiiServiceError('error'))).toBe(false);
  });

  it('DgiiNotFoundError nunca es reintentable', () => {
    expect(isRetryableError(new DgiiNotFoundError('no'))).toBe(false);
  });

  it('Error generico no es reintentable', () => {
    expect(isRetryableError(new Error('generic'))).toBe(false);
  });
});

describe('withRetry', () => {
  it('retorna el resultado si la primera llamada tiene exito', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, {
      maxRetries: 2,
      baseDelayMs: 1,
      maxDelayMs: 10,
    });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('reintenta en DgiiConnectionError y tiene exito', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new DgiiConnectionError('fallo'))
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, {
      maxRetries: 2,
      baseDelayMs: 1,
      maxDelayMs: 10,
    });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('agota reintentos y lanza el ultimo error', async () => {
    const fn = vi.fn().mockRejectedValue(
      new DgiiConnectionError('siempre falla'),
    );

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10 }),
    ).rejects.toThrow('siempre falla');
    expect(fn).toHaveBeenCalledTimes(3); // 1 + 2 reintentos
  });

  it('no reintenta DgiiNotFoundError', async () => {
    const fn = vi.fn().mockRejectedValue(
      new DgiiNotFoundError('no encontrado'),
    );

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10 }),
    ).rejects.toThrow(DgiiNotFoundError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('no reintenta DgiiServiceError con 403', async () => {
    const fn = vi.fn().mockRejectedValue(
      new DgiiServiceError('forbidden', { statusCode: 403 }),
    );

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10 }),
    ).rejects.toThrow(DgiiServiceError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('reintenta DgiiServiceError con 500', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(
        new DgiiServiceError('server error', { statusCode: 500 }),
      )
      .mockResolvedValueOnce('recovered');

    const result = await withRetry(fn, {
      maxRetries: 2,
      baseDelayMs: 1,
      maxDelayMs: 10,
    });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
