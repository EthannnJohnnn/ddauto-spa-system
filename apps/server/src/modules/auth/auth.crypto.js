import { createHash, randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const PASSWORD_HASH_LENGTH = 64;
const SCRYPT_OPTIONS = {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};
const DUMMY_PASSWORD_SALT = 'ddauto-login-timing-salt';
const DUMMY_PASSWORD_HASH = scryptSync(
  'this-is-not-a-real-user-password',
  DUMMY_PASSWORD_SALT,
  PASSWORD_HASH_LENGTH,
  SCRYPT_OPTIONS,
).toString('base64url');

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const derivedKey = await derivePasswordKey(password, salt);

  return {
    hash: derivedKey.toString('base64url'),
    salt,
  };
}

export async function verifyPassword(password, storedHash, salt) {
  try {
    const actualHash = await derivePasswordKey(password, salt);
    const expectedHash = Buffer.from(storedHash, 'base64url');

    return expectedHash.length === actualHash.length && timingSafeEqual(expectedHash, actualHash);
  } catch {
    return false;
  }
}

export function verifyAgainstDummyPassword(password) {
  return verifyPassword(password, DUMMY_PASSWORD_HASH, DUMMY_PASSWORD_SALT);
}

export function generateSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function generateCsrfToken() {
  return randomBytes(24).toString('base64url');
}

export function generateRecoveryCode() {
  return randomBytes(20)
    .toString('hex')
    .toUpperCase()
    .match(/.{1,5}/g)
    .join('-');
}

export function hashOpaqueValue(value) {
  return createHash('sha256').update(value).digest('base64url');
}

export function normalizeRecoveryCode(value) {
  return value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
}

export function safeEqualText(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function derivePasswordKey(password, salt) {
  return scryptAsync(password, salt, PASSWORD_HASH_LENGTH, SCRYPT_OPTIONS);
}
