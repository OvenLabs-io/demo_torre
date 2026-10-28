/**
 * Tiny text-only PDF writer (A4, Helvetica, WinAnsi) so the prototype can hand
 * out real PDF files without a dependency. Enough for reports made of lines.
 */

export interface PdfLine {
  text: string;
  size?: number;
  bold?: boolean;
  /** Grey text. */
  muted?: boolean;
  indent?: number;
  /** Extra space before the line (pt). */
  gapBefore?: number;
  /** Thin rule above the line. */
  rule?: boolean;
}

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;

/** Unicode → WinAnsi (cp1252) bytes; unknown characters become "?". */
const CP1252: Record<string, number> = {
  '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
};

function encode(text: string): string {
  let out = '';
  for (const ch of text.replace(/→/g, '->').replace(/≤/g, '<=').replace(/≥/g, '>=')) {
    const code = ch.codePointAt(0)!;
    const b = CP1252[ch] ?? (code < 0x80 || (code >= 0xa0 && code <= 0xff) ? code : 0x3f);
    const c = String.fromCharCode(b);
    out += c === '(' || c === ')' || c === '\\' ? `\\${c}` : c;
  }
  return out;
}

/** Greedy wrap by an average Helvetica glyph width. */
function wrap(text: string, size: number, width: number, bold: boolean): string[] {
  const maxChars = Math.max(10, Math.floor(width / (size * (bold ? 0.56 : 0.5))));
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if (!line) line = word;
      else if ((line + ' ' + word).length <= maxChars) line += ' ' + word;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

export function buildPdf(lines: PdfLine[], footer?: string): Blob {
  const pages: string[] = [];
  let ops: string[] = [];
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    if (ops.length) pages.push(ops.join('\n'));
    ops = [];
    y = PAGE_H - MARGIN;
  };

  for (const l of lines) {
    const size = l.size ?? 10;
    const lead = size * 1.35;
    const indent = l.indent ?? 0;
    y -= l.gapBefore ?? 0;
    const parts = wrap(l.text, size, PAGE_W - MARGIN * 2 - indent, Boolean(l.bold));
    if (y - lead * parts.length < MARGIN + 20) newPage();
    if (l.rule) {
      ops.push(`0.85 G 0.5 w ${MARGIN} ${y + 4} m ${PAGE_W - MARGIN} ${y + 4} l S`);
      y -= 6;
    }
    for (const p of parts) {
      y -= lead;
      ops.push(`BT /${l.bold ? 'F2' : 'F1'} ${size} Tf ${l.muted ? '0.42 g' : '0.07 g'} ${MARGIN + indent} ${y.toFixed(1)} Td (${encode(p)}) Tj ET`);
    }
  }
  newPage();

  // Objects: 1 catalog, 2 pages, 3 F1, 4 F2, then (content, page) per page.
  const objects: string[] = [];
  const kids: number[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  pages.forEach((content, i) => {
    const withFooter = footer
      ? `${content}\nBT /F1 8 Tf 0.5 g ${MARGIN} 28 Td (${encode(`${footer} · página ${i + 1} de ${pages.length}`)}) Tj ET`
      : content;
    const c = 5 + i * 2;
    objects[c] = `<< /Length ${withFooter.length} >>\nstream\n${withFooter}\nendstream`;
    objects[c + 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${c} 0 R >>`;
    kids.push(c + 1);
  });
  objects[2] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: 'application/pdf' });
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
