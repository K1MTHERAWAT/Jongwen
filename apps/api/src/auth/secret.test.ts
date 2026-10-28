import { describe, expect, it } from 'vitest';
import { hashSecret, verifySecret } from './secret';
import { assertNotLocked, clearFailures, recordFailure } from './auth.guard';

describe('Auth Security Unit Tests', () => {
  it('hashes passwords with Argon2id and verifies successfully', async () => {
    const raw = 'SecureP@ssw0rd2026';
    const hash = await hashSecret(raw);
    expect(hash.startsWith('$argon2')).toBe(true);

    const match = await verifySecret(hash, raw);
    expect(match).toBe(true);

    const wrong = await verifySecret(hash, 'WrongPassword');
    expect(wrong).toBe(false);
  });

  it('rejects plaintext verification without fallback', async () => {
    const match = await verifySecret('PlaintextPass123', 'PlaintextPass123');
    expect(match).toBe(false);
  });

  describe('Account Lockout Rate Limiting', () => {
    const testKey = 'test-lockout-key';

    it('locks out after 5 consecutive failures', () => {
      clearFailures(testKey);
      expect(() => assertNotLocked(testKey)).not.toThrow();

      recordFailure(testKey);
      recordFailure(testKey);
      recordFailure(testKey);
      recordFailure(testKey);
      recordFailure(testKey); // 5th failure triggers lock

      expect(() => assertNotLocked(testKey)).toThrow(/ลองผิดเกินกำหนด/);

      clearFailures(testKey);
      expect(() => assertNotLocked(testKey)).not.toThrow();
    });
  });
});
