import * as argon2 from 'argon2';

/**
 * Hash รหัสผ่าน หรือ PIN ด้วย argon2id
 */
export async function hashSecret(secret: string): Promise<string> {
  return argon2.hash(secret, {
    type: argon2.argon2id,
  });
}

/**
 * ตรวจสอบรหัสผ่าน หรือ PIN เทียบกับค่าที่ Hash ไว้ด้วย argon2id
 */
export async function verifySecret(hashed: string | null | undefined, secret: string): Promise<boolean> {
  if (!hashed || !secret || !hashed.startsWith('$argon2')) return false;
  try {
    return await argon2.verify(hashed, secret);
  } catch {
    return false;
  }
}
