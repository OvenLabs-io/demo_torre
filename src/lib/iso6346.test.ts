import { describe, expect, it } from 'vitest';
import { checkDigit, shippingLineFor, validateContainer, withCheckDigit } from './iso6346';

describe('ISO 6346', () => {
  it('accepts a valid container number', () => {
    expect(validateContainer('MSKU7731403')).toEqual({ ok: true });
    expect(validateContainer('CSQU3054383')).toEqual({ ok: true }); // standard example
  });

  it('rejects the Figma example with a wrong check digit', () => {
    expect(validateContainer('MSKU7731406')).toEqual({ ok: false, reason: 'check_digit', expected: 3 });
  });

  it('rejects malformed values', () => {
    expect(validateContainer('')).toEqual({ ok: false, reason: 'empty' });
    expect(validateContainer('MSK7731403')).toEqual({ ok: false, reason: 'format' });
  });

  it('normalizes case and spaces', () => {
    expect(validateContainer(' mscu 7149205 ').ok).toBeTypeOf('boolean');
    expect(validateContainer('msku7731403')).toEqual({ ok: true });
  });

  it('builds valid numbers and maps shipping lines', () => {
    expect(checkDigit('MSKU773140')).toBe(3);
    expect(validateContainer(withCheckDigit('HLXU123456')).ok).toBe(true);
    expect(shippingLineFor('MSKU7731403')).toBe('Maersk');
    expect(shippingLineFor('CMAU3817294')).toBe('CMA CGM');
  });
});
