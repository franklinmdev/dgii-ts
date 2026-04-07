import { describe, it, expect } from 'vitest';
import * as dgii from '../src/index.js';

describe('public API exports', () => {
  it('exporta los validadores', () => {
    expect(dgii.validateRnc).toBeTypeOf('function');
    expect(dgii.validateCedula).toBeTypeOf('function');
    expect(dgii.validateNcf).toBeTypeOf('function');
    expect(dgii.validateEcf).toBeTypeOf('function');
  });

  it('exporta las constantes de tipos', () => {
    expect(dgii.NCF_TYPE_NAMES).toBeTypeOf('object');
    expect(dgii.ECF_TYPE_NAMES).toBeTypeOf('object');
  });

  it('exporta el cliente SOAP', () => {
    expect(dgii.DgiiSoapClient).toBeTypeOf('function');
  });

  it('exporta las constantes SOAP', () => {
    expect(dgii.DGII_SOAP_BASE_URL).toBeTypeOf('string');
    expect(dgii.SOAP_ACTIONS).toBeTypeOf('object');
  });

  it('exporta las funciones bulk', () => {
    expect(dgii.downloadBulkFile).toBeTypeOf('function');
    expect(dgii.parseBulkFile).toBeTypeOf('function');
  });

  it('exporta las clases de error', () => {
    expect(dgii.DgiiError).toBeTypeOf('function');
    expect(dgii.DgiiConnectionError).toBeTypeOf('function');
    expect(dgii.DgiiNotFoundError).toBeTypeOf('function');
    expect(dgii.DgiiServiceError).toBeTypeOf('function');
    expect(dgii.AllStrategiesFailedError).toBeTypeOf('function');
  });

  it('exporta la URL del archivo masivo', () => {
    expect(dgii.DGII_BULK_URL).toBeTypeOf('string');
    expect(dgii.DGII_BULK_URL).toContain('DGII_RNC.zip');
  });

  it('exporta el cliente de scraping', () => {
    expect(dgii.ScrapingClient).toBeTypeOf('function');
    expect(dgii.DGII_RNC_URL).toBeTypeOf('string');
    expect(dgii.DGII_NCF_URL).toBeTypeOf('string');
  });

  it('exporta el cliente resiliente', () => {
    expect(dgii.DgiiClient).toBeTypeOf('function');
    expect(dgii.ConsecutiveBreaker).toBeTypeOf('function');
    expect(dgii.withRetry).toBeTypeOf('function');
    expect(dgii.isRetryableError).toBeTypeOf('function');
  });
});
