import { describe, it, expect } from 'vitest';
import {
  DgiiError,
  DgiiConnectionError,
  DgiiNotFoundError,
  DgiiServiceError,
} from '../../src/soap/errors.js';

describe('DgiiError', () => {
  it('tiene code y message', () => {
    const error = new DgiiError('test message', 'TEST_CODE');
    expect(error.message).toBe('test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('DgiiError');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('DgiiConnectionError', () => {
  it('tiene code DGII_CONNECTION_ERROR', () => {
    const error = new DgiiConnectionError('timeout');
    expect(error.code).toBe('DGII_CONNECTION_ERROR');
    expect(error.name).toBe('DgiiConnectionError');
  });

  it('preserva cause', () => {
    const cause = new Error('network');
    const error = new DgiiConnectionError('fallo', { cause });
    expect(error.cause).toBe(cause);
  });

  it('extiende DgiiError', () => {
    const error = new DgiiConnectionError('test');
    expect(error).toBeInstanceOf(DgiiError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('DgiiNotFoundError', () => {
  it('tiene code DGII_NOT_FOUND', () => {
    const error = new DgiiNotFoundError('no encontrado');
    expect(error.code).toBe('DGII_NOT_FOUND');
    expect(error.name).toBe('DgiiNotFoundError');
  });

  it('extiende DgiiError', () => {
    const error = new DgiiNotFoundError('test');
    expect(error).toBeInstanceOf(DgiiError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('DgiiServiceError', () => {
  it('tiene statusCode opcional', () => {
    const error = new DgiiServiceError('forbidden', { statusCode: 403 });
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('DGII_SERVICE_ERROR');
    expect(error.name).toBe('DgiiServiceError');
  });

  it('statusCode es undefined por defecto', () => {
    const error = new DgiiServiceError('error');
    expect(error.statusCode).toBeUndefined();
  });

  it('extiende DgiiError', () => {
    const error = new DgiiServiceError('test');
    expect(error).toBeInstanceOf(DgiiError);
    expect(error).toBeInstanceOf(Error);
  });
});
