import { describe, it, expect } from 'vitest';
import {
  DgiiError,
  DgiiConnectionError,
  DgiiNotFoundError,
  DgiiServiceError,
  AllStrategiesFailedError,
} from '../../src/errors/index.js';

describe('AllStrategiesFailedError', () => {
  it('tiene code DGII_ALL_STRATEGIES_FAILED', () => {
    const errors = [new Error('a'), new Error('b')];
    const error = new AllStrategiesFailedError('todo fallo', errors);
    expect(error.code).toBe('DGII_ALL_STRATEGIES_FAILED');
    expect(error.name).toBe('AllStrategiesFailedError');
  });

  it('contiene el array de errores', () => {
    const errors = [new Error('a'), new Error('b')];
    const error = new AllStrategiesFailedError('fallo', errors);
    expect(error.errors).toHaveLength(2);
    expect(error.errors[0]?.message).toBe('a');
  });

  it('usa el primer error como cause', () => {
    const cause = new Error('primero');
    const error = new AllStrategiesFailedError('fallo', [cause]);
    expect(error.cause).toBe(cause);
  });

  it('extiende DgiiError', () => {
    const error = new AllStrategiesFailedError('fallo', []);
    expect(error).toBeInstanceOf(DgiiError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('errores re-exportados desde errors/', () => {
  it('DgiiError tiene code y message', () => {
    const error = new DgiiError('test', 'TEST');
    expect(error.code).toBe('TEST');
    expect(error.message).toBe('test');
  });

  it('DgiiConnectionError tiene code correcto', () => {
    const error = new DgiiConnectionError('timeout');
    expect(error.code).toBe('DGII_CONNECTION_ERROR');
  });

  it('DgiiNotFoundError tiene code correcto', () => {
    const error = new DgiiNotFoundError('no encontrado');
    expect(error.code).toBe('DGII_NOT_FOUND');
  });

  it('DgiiServiceError tiene statusCode opcional', () => {
    const error = new DgiiServiceError('error', { statusCode: 500 });
    expect(error.statusCode).toBe(500);
  });
});
