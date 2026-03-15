import { describe, it, expect } from 'vitest';
import { makeTrusty } from '../../src/sign/trusty';

describe('makeTrusty()', () => {
  it('returns a string starting with "RA"', async () => {
    expect(await makeTrusty('some input')).toMatch(/^RA/);
  });

  it('is deterministic — same input produces same output', async () => {
    const input = 'hello\nworld\n';
    expect(await makeTrusty(input)).toBe(await makeTrusty(input));
  });

  it('produces URL-safe base64 (no +, /, or = characters)', async () => {
    const result = await makeTrusty('test input string for base64 check');
    expect(result.slice(2)).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('handles empty string', async () => {
    const result = await makeTrusty('');
    expect(result).toMatch(/^RA[A-Za-z0-9\-_]+$/);
  });

  it('different inputs produce different hashes', async () => {
    expect(await makeTrusty('input1')).not.toBe(await makeTrusty('input2'));
  });

  it('output length is consistent (SHA-256 → 43 base64url chars + "RA" prefix)', async () => {
    // SHA-256 = 32 bytes → 43 base64url chars (ceil(32 * 4/3), no padding)
    expect((await makeTrusty('anything')).length).toBe(2 + 43);
  });
});
