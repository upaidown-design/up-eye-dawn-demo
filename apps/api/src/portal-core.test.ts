import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalIp,
  base32Decode,
  base32Encode,
  decryptSecret,
  decryptIp,
  encryptIp,
  evidenceHash,
  encryptSecret,
  generateTotpSecret,
  invitationAllowsEmail,
  maskIp,
  normalizeEmail,
  randomOpaqueToken,
  safeEqual,
  splitName,
  totp,
  verifyTotp,
} from './portal-core.js';

test('IP canonicalization handles IPv4, IPv6 and IPv4-mapped IPv6', () => {
  assert.equal(canonicalIp('81.002.003.42'), '81.2.3.42');
  assert.equal(canonicalIp('::ffff:192.0.2.128'), '192.0.2.128');
  assert.equal(canonicalIp('::ffff:c000:0280'), '192.0.2.128');
  assert.equal(canonicalIp('2001:0db8:0:0:0:0:0:1'), '2001:db8::1');
  assert.equal(maskIp('81.2.3.42'), '81.***.***.42');
});

test('encrypted IP evidence round-trips without storing plaintext', () => {
  const key = '11'.repeat(32);
  const encrypted = encryptIp('203.0.113.44', key, 7);
  assert.equal(encrypted.startsWith('7:'), true);
  assert.equal(encrypted.includes('203.0.113.44'), false);
  assert.equal(decryptIp(encrypted, key), '203.0.113.44');
});

test('evidence hash is deterministic for canonical payloads', () => {
  const a = evidenceHash({email: 'person@example.com', version: 'v1', nested: {b: 2, a: 1}});
  const b = evidenceHash({nested: {a: 1, b: 2}, version: 'v1', email: 'person@example.com'});
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{64}$/);
});

test('invitation email and domain restrictions are exact and normalized', () => {
  assert.equal(invitationAllowsEmail({allowedEmailDomain: 'Fund.COM'}, ' Analyst@fund.com '), true);
  assert.equal(invitationAllowsEmail({allowedEmailDomain: 'fund.com'}, 'analyst@sub.fund.com'), false);
  assert.equal(invitationAllowsEmail({intendedRecipientEmail: 'Partner@Fund.com'}, 'partner@fund.com'), true);
  assert.equal(invitationAllowsEmail({intendedRecipientEmail: 'partner@fund.com'}, 'other@fund.com'), false);
});

test('opaque tokens provide at least 256 bits and are independent', () => {
  const first = randomOpaqueToken();
  const second = randomOpaqueToken();
  assert.notEqual(first, second);
  assert.ok(Buffer.from(first, 'base64url').byteLength >= 32);
});

test('TOTP validation accepts the current window and rejects a wrong code', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const at = 1_700_000_000_000;
  const code = totp(secret, at);
  assert.equal(verifyTotp(secret, code, at), true);
  assert.equal(verifyTotp(secret, code === '000000' ? '000001' : '000000', at), false);
});

test('encrypted team MFA secrets round-trip and generated secrets work with TOTP', () => {
  const key = '22'.repeat(32);
  const secret = generateTotpSecret();
  const encrypted = encryptSecret(secret, key, 3);
  assert.equal(encrypted.includes(secret), false);
  assert.equal(decryptSecret(encrypted, key), secret);
  const at = 1_700_000_000_000;
  assert.equal(verifyTotp(decryptSecret(encrypted, key), totp(secret, at), at), true);
});

test('base32 codec round-trips and rejects malformed or empty secrets', () => {
  const source = Buffer.from('12345678901234567890');
  assert.deepEqual(base32Decode(base32Encode(source)), source);
  assert.throws(() => base32Decode(''), /Invalid base32/);
  assert.throws(() => base32Decode('ABC!234'), /Invalid base32/);
});

test('TOTP matches the RFC 6238 SHA-1 vector truncated to six digits', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  assert.equal(totp(secret, 59_000), '287082');
});

test('encrypted evidence rejects tampering and invalid IP input', () => {
  const key = '33'.repeat(32);
  const encrypted = encryptIp('203.0.113.9', key);
  const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith('0') ? '1' : '0'}`;
  assert.throws(() => decryptIp(tampered, key));
  assert.throws(() => canonicalIp('999.1.1.1'), /Invalid source IP/);
});

test('identity normalization is stable and timing-safe equality rejects unequal lengths', () => {
  assert.equal(normalizeEmail(' PERSON@Example.COM '), 'person@example.com');
  assert.deepEqual(splitName('  Ana   María   López  '), {firstName: 'Ana', lastName: 'María López', fullName: 'Ana María López'});
  assert.equal(safeEqual('same', 'same'), true);
  assert.equal(safeEqual('same', 'different'), false);
});
