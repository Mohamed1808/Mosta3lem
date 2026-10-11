/**
 * Password hashing (scrypt, random salt per password) and the password rules.
 */
'use strict';

const crypto = require('crypto');

const N = 32768, R = 8, P = 1, KEYLEN = 64;
const MAXMEM = 128 * N * R * 2;

function scrypt(password, salt, n, r, p) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEYLEN, { N: n, r, p, maxmem: 128 * n * r * 2 }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, N, R, P);
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64');
  const key = await scrypt(password, Buffer.from(salt, 'base64'), +n, +r, +p);
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

// Spends the same time as a real check, so an unknown email answers as slowly as a known one.
const DUMMY = 'scrypt$' + N + '$' + R + '$' + P + '$' + Buffer.alloc(16).toString('base64') + '$' + Buffer.alloc(KEYLEN).toString('base64');
const burn = (password) => verifyPassword(password, DUMMY).then(() => false);

/** The password rules. Returns a translation key when the password is refused, else null. */
function passwordProblem(password, email) {
  const pw = String(password || '');
  if (pw.length < 10) return 'errors.passwordShort';
  if (pw.length > 200) return 'errors.passwordLong';
  // At least one letter (Latin or Arabic) and one digit (Western or Arabic-Indic).
  if (!/[A-Za-z]|[ء-ي]/.test(pw) || !/[0-9]|[٠-٩]/.test(pw)) return 'errors.passwordMix';
  const name = email ? String(email).split('@')[0].toLowerCase() : '';
  if (name.length >= 4 && pw.toLowerCase().includes(name)) return 'errors.passwordPersonal';
  return null;
}

module.exports = { hashPassword, verifyPassword, burn, passwordProblem, MAXMEM };
