import * as argon2 from 'argon2';
import { safeEqual } from './auth.guard';

/**
 * Hash รหัสผ่าน หรือ PIN ด้วย argon2id
 */
export async function hashSecret(secret: string): Promise<string> {
  return argon2.hash(secret, {
    type: argon2.argon2id,
  });
}

/**
 * ตรวจสอบรหัสผ่าน หรือ PIN เทียบกับค่าที่ Hash ไว้
 * หากยังเป็นค่าเดิม (ไม่ใช่ $argon2) จะตรวจสอบด้วย safeEqual ชั่วคราวเพื่อความเข้ากันได้
 */
export async function verifySecret(hashed: string | null | undefined, secret: string): Promise<boolean> {
  if (!hashed || !secret) return false;
  if (!hashed.startsWith('$argon2')) {
    return safeEqual(hashed, secret);
  }
  try {
    return await argon2.verify(hashed, secret);
  } catch {
    return false;
  }
}
