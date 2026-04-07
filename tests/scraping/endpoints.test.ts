import { describe, it, expect } from 'vitest';
import {
  DGII_RNC_URL,
  DGII_NCF_URL,
  FORM_FIELDS,
} from '../../src/scraping/endpoints.js';

describe('constantes de scraping', () => {
  it('DGII_RNC_URL es HTTPS y apunta a rnc.aspx', () => {
    expect(DGII_RNC_URL).toMatch(/^https:\/\//);
    expect(DGII_RNC_URL).toContain('rnc.aspx');
  });

  it('DGII_NCF_URL es HTTPS y apunta a ncf.aspx', () => {
    expect(DGII_NCF_URL).toMatch(/^https:\/\//);
    expect(DGII_NCF_URL).toContain('ncf.aspx');
  });

  it('FORM_FIELDS esta congelado', () => {
    expect(Object.isFrozen(FORM_FIELDS)).toBe(true);
  });

  it('FORM_FIELDS contiene los campos esperados', () => {
    expect(FORM_FIELDS.viewState).toBe('__VIEWSTATE');
    expect(FORM_FIELDS.rncInput).toContain('txtRNCCedula');
    expect(FORM_FIELDS.ncfInput).toContain('txtNCF');
  });
});
