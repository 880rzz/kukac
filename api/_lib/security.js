const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scryptAsync = promisify(crypto.scrypt);

function normalizeNickname(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

function validateNickname(value) {
  const nick = String(value || '').normalize('NFKC').trim();
  return /^[\p{L}\p{N}_-]{3,20}$/u.test(nick);
}

function validatePassword(value) {
  const password = String(value || '');
  return password.length >= 8 && password.length <= 128;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  return 'scrypt$16384$8$1$' + salt.toString('base64url') + '$' + Buffer.from(derived).toString('base64url');
}

async function verifyPassword(password, stored) {
  try {
    const [kind, n, r, p, salt64, hash64] = String(stored).split('$');
    if (kind !== 'scrypt') return false;
    const salt = Buffer.from(salt64, 'base64url');
    const expected = Buffer.from(hash64, 'base64url');
    const actual = Buffer.from(await scryptAsync(String(password), salt, expected.length, {
      N: Number(n), r: Number(r), p: Number(p)
    }));
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function createRecoveryCode() {
  const raw = crypto.randomBytes(9).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return 'KUKAC-' + raw.slice(0,4) + '-' + raw.slice(4,8) + '-' + raw.slice(8,12);
}

module.exports = {
  normalizeNickname, validateNickname, validatePassword,
  hashPassword, verifyPassword, randomToken, tokenHash, createRecoveryCode
};
