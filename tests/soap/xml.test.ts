import { describe, it, expect } from 'vitest';
import { escapeXml, extractTagContent } from '../../src/soap/xml.js';

describe('escapeXml', () => {
  it('escapa los 5 caracteres XML', () => {
    expect(escapeXml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&apos;');
  });

  it('no modifica texto sin caracteres especiales', () => {
    expect(escapeXml('hello world')).toBe('hello world');
  });

  it('maneja string vacio', () => {
    expect(escapeXml('')).toBe('');
  });
});

describe('extractTagContent', () => {
  it('extrae contenido entre tags', () => {
    expect(extractTagContent('<foo>bar</foo>', 'foo')).toBe('bar');
  });

  it('retorna undefined si tag no existe', () => {
    expect(extractTagContent('<foo>bar</foo>', 'baz')).toBeUndefined();
  });

  it('maneja contenido con XML anidado', () => {
    expect(
      extractTagContent('<outer><inner>val</inner></outer>', 'inner'),
    ).toBe('val');
  });

  it('retorna undefined si falta el tag de cierre', () => {
    expect(
      extractTagContent('<foo>sin cierre', 'foo'),
    ).toBeUndefined();
  });
});
