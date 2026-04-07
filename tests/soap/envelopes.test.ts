import { describe, it, expect } from 'vitest';
import {
  buildGetContribuyentesEnvelope,
  buildGetNcfEnvelope,
} from '../../src/soap/envelopes.js';

describe('buildGetContribuyentesEnvelope', () => {
  it('contiene el RNC en el XML', () => {
    const xml = buildGetContribuyentesEnvelope('131098193');
    expect(xml).toContain('<value>131098193</value>');
  });

  it('escapa caracteres XML', () => {
    const xml = buildGetContribuyentesEnvelope('<test>');
    expect(xml).toContain('<value>&lt;test&gt;</value>');
  });

  it('usa namespace correcto', () => {
    const xml = buildGetContribuyentesEnvelope('123');
    expect(xml).toContain('xmlns="http://dgii.gov.do/"');
  });

  it('usa SOAP 1.2', () => {
    const xml = buildGetContribuyentesEnvelope('123');
    expect(xml).toContain('soap12:Envelope');
  });
});

describe('buildGetNcfEnvelope', () => {
  it('contiene RNC y NCF', () => {
    const xml = buildGetNcfEnvelope('131098193', 'B0100000001');
    expect(xml).toContain('<RNC>131098193</RNC>');
    expect(xml).toContain('<NCF>B0100000001</NCF>');
  });
});
