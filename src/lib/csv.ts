import { downloadBlob } from './pdf';

/** Builds a CSV (UTF-8 with BOM so Excel opens accents correctly) and downloads it. */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
  downloadBlob(filename, new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }));
}
