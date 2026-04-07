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
});
