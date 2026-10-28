import { describe, expect, it } from 'vitest';
import { buildPdf } from './pdf';

describe('PDF', () => {
  it('writes a valid PDF with accents and several pages', async () => {
    const lines = Array.from({ length: 120 }, (_, i) => ({ text: `Evento ${i} · Salida de terminal (Manzanillo) — señal ok` }));
    const blob = buildPdf([{ text: 'Bitácora del viaje', size: 18, bold: true }, ...lines], 'Bitácora');
    const text = new TextDecoder('latin1').decode(await blob.arrayBuffer());
    expect(blob.type).toBe('application/pdf');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('Bit\xe1cora'); // WinAnsi "á"
    expect(text).toContain(String.raw`\(Manzanillo\)`); // parentheses escaped
    expect(Number(/\/Count (\d+)/.exec(text)?.[1])).toBeGreaterThan(1);
    // xref offset points at the xref table
    const xref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(xref, xref + 4)).toBe('xref');
  });
});
