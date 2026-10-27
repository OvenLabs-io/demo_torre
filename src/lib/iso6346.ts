/**
 * ISO 6346 container number validation (owner code + category + serial + check digit).
 * Example: MSKU7731403 is valid; MSKU7731406 is not.
 */

const LETTER_VALUES: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  let value = 10;
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (value % 11 === 0) value++; // skip multiples of 11
    map[ch] = value++;
  }
  return map;
})();

const FORMAT = /^[A-Z]{3}[UJZ][0-9]{7}$/;

/** Check digit for the first 10 characters (e.g. "MSKU773140"). */
export function checkDigit(first10: string): number {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = first10[i];
    const v = /[0-9]/.test(ch) ? Number(ch) : LETTER_VALUES[ch];
    sum += v * 2 ** i;
  }
  return (sum % 11) % 10;
}

export type ContainerValidation =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'format' | 'check_digit'; expected?: number };

export function validateContainer(raw: string): ContainerValidation {
  const value = raw.trim().toUpperCase().replace(/\s|-/g, '');
  if (!value) return { ok: false, reason: 'empty' };
  if (!FORMAT.test(value)) return { ok: false, reason: 'format' };
  const expected = checkDigit(value.slice(0, 10));
  if (expected !== Number(value[10])) return { ok: false, reason: 'check_digit', expected };
  return { ok: true };
}

const SHIPPING_LINES: Record<string, string> = {
  MSKU: 'Maersk',
  MRKU: 'Maersk',
  MSCU: 'MSC',
  MEDU: 'MSC',
  CMAU: 'CMA CGM',
  HLXU: 'Hapag-Lloyd',
  HLBU: 'Hapag-Lloyd',
  ONEU: 'ONE',
  COSU: 'COSCO',
  CSNU: 'COSCO',
  TCLU: 'Triton (arrendado)',
  EGLV: 'Evergreen',
  EISU: 'Evergreen',
};

export function shippingLineFor(containerNumber: string): string {
  return SHIPPING_LINES[containerNumber.slice(0, 4).toUpperCase()] ?? 'Naviera no identificada';
}

/** Completes a 10-char prefix with its valid check digit (used to build valid mocks). */
export function withCheckDigit(first10: string): string {
  return `${first10}${checkDigit(first10)}`;
}
