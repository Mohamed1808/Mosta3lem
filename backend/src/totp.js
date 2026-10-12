/**
 * Authenticator app codes (TOTP, RFC 6238: HMAC-SHA1, 30-second steps, 6 digits), the kind
 * Google Authenticator, Microsoft Authenticator and similar apps show. A code from the step
 * before or after is accepted too, for clocks a little out; a step already used is refused.
 */
'use strict';

const crypto = require('crypto');

const STEP_SECONDS = 30;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s) {
  const clean = String(s).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

/** A new secret: 20 random bytes, as base32 (what the person types if they cannot scan). */
const newSecret = () => base32Encode(crypto.randomBytes(20));

function codeAt(secret, step) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1000000).padStart(6, '0');
}

const stepAt = (ms) => Math.floor(ms / 1000 / STEP_SECONDS);

/** The step the code belongs to, or null. Steps up to lastStep were used already. */
function check(secret, code, now, lastStep) {
  const c = String(code || '').replace(/\D/g, '');
  if (c.length !== 6) return null;
  const at = stepAt(now);
  for (const step of [at, at - 1, at + 1]) {
    if (step <= (lastStep || 0)) continue;
    const want = codeAt(secret, step);
    if (crypto.timingSafeEqual(Buffer.from(want), Buffer.from(c))) return step;
  }
  return null;
}

/** The link authenticator apps read from the QR code. */
function otpauthUri(secret, account, issuer) {
  return `otpauth://totp/${encodeURIComponent(issuer + ':' + account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}

module.exports = { newSecret, codeAt, check, stepAt, otpauthUri, base32Encode, base32Decode };
