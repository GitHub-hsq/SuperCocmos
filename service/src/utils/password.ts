import argon2 from 'argon2'

/**
 * 加密密码
 * 使用 Argon2 哈希算法（更安全）
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password)
}

/**
 * 验证密码
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return await argon2.verify(hash, password)
}

