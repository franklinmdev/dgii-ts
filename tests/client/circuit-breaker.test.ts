import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsecutiveBreaker } from '../../src/client/circuit-breaker.js';
import { DgiiServiceError } from '../../src/errors/index.js';

describe('ConsecutiveBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('empieza en estado CLOSED', () => {
    const breaker = new ConsecutiveBreaker();
    expect(breaker.state).toBe('CLOSED');
  });

  it('permanece CLOSED mientras haya éxitos', async () => {
    const breaker = new ConsecutiveBreaker({ failureThreshold: 3 });
    await breaker.execute(() => Promise.resolve('ok'));
    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.state).toBe('CLOSED');
  });

  it('se abre después de failureThreshold fallos consecutivos', async () => {
    const breaker = new ConsecutiveBreaker({ failureThreshold: 3 });

    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fallo')))
        .catch(() => { /* ignorar */ });
    }

    expect(breaker.state).toBe('OPEN');
  });

  it('rechaza inmediatamente cuando está OPEN', async () => {
    const breaker = new ConsecutiveBreaker({ failureThreshold: 1 });

    await breaker.execute(() => Promise.reject(new Error('fallo')))
      .catch(() => { /* ignorar */ });

    await expect(
      breaker.execute(() => Promise.resolve('ok')),
    ).rejects.toThrow(DgiiServiceError);
  });

  it('transiciona a HALF_OPEN después de recoveryTimeoutMs', async () => {
    const breaker = new ConsecutiveBreaker({
      failureThreshold: 1,
      recoveryTimeoutMs: 5000,
    });

    await breaker.execute(() => Promise.reject(new Error('fallo')))
      .catch(() => { /* ignorar */ });

    expect(breaker.state).toBe('OPEN');

    vi.advanceTimersByTime(5000);
    expect(breaker.state).toBe('HALF_OPEN');
  });

  it('cierra después de successThreshold éxitos en HALF_OPEN', async () => {
    const breaker = new ConsecutiveBreaker({
      failureThreshold: 1,
      recoveryTimeoutMs: 1000,
      successThreshold: 2,
    });

    // Abrir el circuito
    await breaker.execute(() => Promise.reject(new Error('fallo')))
      .catch(() => { /* ignorar */ });

    // Avanzar al HALF_OPEN
    vi.advanceTimersByTime(1000);
    expect(breaker.state).toBe('HALF_OPEN');

    // Dos éxitos para cerrar
    await breaker.execute(() => Promise.resolve('ok'));
    await breaker.execute(() => Promise.resolve('ok'));

    expect(breaker.state).toBe('CLOSED');
  });

  it('re-abre si falla en HALF_OPEN', async () => {
    const breaker = new ConsecutiveBreaker({
      failureThreshold: 1,
      recoveryTimeoutMs: 1000,
      successThreshold: 2,
    });

    // Abrir
    await breaker.execute(() => Promise.reject(new Error('fallo')))
      .catch(() => { /* ignorar */ });

    // HALF_OPEN
    vi.advanceTimersByTime(1000);

    // Fallo en HALF_OPEN
    await breaker.execute(() => Promise.reject(new Error('fallo2')))
      .catch(() => { /* ignorar */ });

    expect(breaker.state).toBe('OPEN');
  });

  it('reset devuelve a CLOSED', async () => {
    const breaker = new ConsecutiveBreaker({ failureThreshold: 1 });

    await breaker.execute(() => Promise.reject(new Error('fallo')))
      .catch(() => { /* ignorar */ });

    expect(breaker.state).toBe('OPEN');

    breaker.reset();
    expect(breaker.state).toBe('CLOSED');
  });

  it('un éxito en CLOSED resetea el contador de fallos', async () => {
    const breaker = new ConsecutiveBreaker({ failureThreshold: 3 });

    // 2 fallos
    await breaker.execute(() => Promise.reject(new Error('1')))
      .catch(() => { /* ignorar */ });
    await breaker.execute(() => Promise.reject(new Error('2')))
      .catch(() => { /* ignorar */ });

    // 1 éxito resetea el contador
    await breaker.execute(() => Promise.resolve('ok'));

    // 2 fallos más -- todavía no llega al threshold de 3
    await breaker.execute(() => Promise.reject(new Error('3')))
      .catch(() => { /* ignorar */ });
    await breaker.execute(() => Promise.reject(new Error('4')))
      .catch(() => { /* ignorar */ });

    expect(breaker.state).toBe('CLOSED');
  });
});
