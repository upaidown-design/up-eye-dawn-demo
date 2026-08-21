import {createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';

export type InvitationPolicy = 'SINGLE_VISITOR' | 'MULTI_VISITOR';

export function randomOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex');
}

export function hmacHex(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function ipv4FromMapped(value: string) {
  const dotted = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)?.[1];
  if (dotted && isIP(dotted) === 4) return dotted;
  const hex = value.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!hex) return null;
  const high = Number.parseInt(hex[1]!, 16);
  const low = Number.parseInt(hex[2]!, 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

export function canonicalIp(input: string) {
  let value = input.trim().replace(/^\[|\]$/g, '').split('%')[0]!.toLowerCase();
  const directMapped = ipv4FromMapped(value);
  if (directMapped) return directMapped;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
    const parts = value.split('.').map(Number);
    if (parts.every((part) => part >= 0 && part <= 255)) return parts.join('.');
  }
  if (isIP(value) === 4) return value.split('.').map((part) => String(Number(part))).join('.');
  if (isIP(value) !== 6) throw new Error('Invalid source IP');
  const hostname = new URL(`http://[${value}]/`).hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return ipv4FromMapped(hostname) ?? hostname;
}

export function maskIp(input: string) {
  const ip = canonicalIp(input);
  if (isIP(ip) === 4) {
    const parts = ip.split('.');
    return `${parts[0]}.***.***.${parts[3]}`;
  }
  const parts = ip.split(':');
  return `${parts.slice(0, 2).join(':')}:****:****:${parts.at(-1) || '0'}`;
}

export function encryptIp(input: string, keyHex: string, keyVersion = 1) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
  const ciphertext = Buffer.concat([cipher.update(canonicalIp(input), 'utf8'), cipher.final()]);
  return [keyVersion, iv.toString('hex'), cipher.getAuthTag().toString('hex'), ciphertext.toString('hex')].join(':');
}

export function decryptIp(payload: string, keyHex: string) {
  const [, ivHex, tagHex, ciphertextHex] = payload.split(':');
  if (!ivHex || !tagHex || !ciphertextHex) throw new Error('Invalid encrypted IP payload');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]).toString('utf8');
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(',')}}`;
}

export function evidenceHash(payload: unknown) {
  return sha256(stableJson(payload));
}

export function splitName(fullName: string) {
  const clean = fullName.trim().replace(/\s+/g, ' ');
  const [firstName, ...rest] = clean.split(' ');
  return {firstName, lastName: rest.join(' '), fullName: clean};
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function invitationAllowsEmail(invitation: {intendedRecipientEmail?: string | null; allowedEmailDomain?: string | null}, email: string) {
  const normalized = normalizeEmail(email);
  if (invitation.intendedRecipientEmail && normalizeEmail(invitation.intendedRecipientEmail) !== normalized) return false;
  if (invitation.allowedEmailDomain) {
    const domain = normalized.split('@')[1] ?? '';
    if (domain !== invitation.allowedEmailDomain.trim().toLowerCase().replace(/^@/, '')) return false;
  }
  return true;
}

export function base32Decode(input: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const character of clean) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error('Invalid base32');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

export function totp(secret: string, at = Date.now(), stepSeconds = 30) {
  const counter = Math.floor(at / 1000 / stepSeconds);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const number = ((digest[offset]! & 0x7f) << 24) | ((digest[offset + 1]! & 0xff) << 16) | ((digest[offset + 2]! & 0xff) << 8) | (digest[offset + 3]! & 0xff);
  return String(number % 1_000_000).padStart(6, '0');
}

export function verifyTotp(secret: string, code: string, at = Date.now()) {
  return [-1, 0, 1].some((window) => safeEqual(totp(secret, at + window * 30_000), code));
}
