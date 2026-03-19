import { describe, it, expect } from 'vitest';
import * as dgii from '../src/index.js';

describe('public API exports', () => {
  it('exporta los validadores', () => {
    expect(typeof dgii.validateRnc).toBe('function');
    expect(typeof dgii.validateCedula).toBe('function');
    expect(typeof dgii.validateNcf).toBe('function');
    expect(typeof dgii.validateEcf).toBe('function');
  });

  it('exporta las constantes de tipos', () => {
    expect(dgii.NCF_TYPE_NAMES).toBeDefined();
    expect(dgii.ECF_TYPE_NAMES).toBeDefined();
  });

  it('exporta el cliente SOAP', () => {
    expect(typeof dgii.DgiiSoapClient).toBe('function');
  });

  it('exporta las constantes SOAP', () => {
    expect(dgii.DGII_SOAP_BASE_URL).toBeDefined();
    expect(dgii.SOAP_ACTIONS).toBeDefined();
  });

  it('exporta las funciones bulk', () => {
    expect(typeof dgii.downloadBulkFile).toBe('function');
    expect(typeof dgii.parseBulkFile).toBe('function');
  });
});
