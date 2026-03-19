import { describe, it, expect } from 'vitest';
import { DGII_SOAP_BASE_URL, SOAP_ACTIONS } from '../../src/soap/endpoints.js';

describe('SOAP endpoints', () => {
  it('DGII_SOAP_BASE_URL usa HTTPS', () => {
    expect(DGII_SOAP_BASE_URL).toMatch(/^https:\/\//);
  });

  it('DGII_SOAP_BASE_URL apunta al endpoint oficial', () => {
    expect(DGII_SOAP_BASE_URL).toBe(
      'https://dgii.gov.do/wsMovilDGII/WSMovilDGII.asmx',
    );
  });

  it('SOAP_ACTIONS tiene las acciones requeridas', () => {
    expect(SOAP_ACTIONS).toHaveProperty('getContribuyentes');
    expect(SOAP_ACTIONS).toHaveProperty('getNCF');
  });
});
