import {readFile} from 'node:fs/promises';

const values = {...process.env};
try {
  const file = await readFile(new URL('../.env', import.meta.url), 'utf8');
  for (const line of file.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && values[match[1]] === undefined) values[match[1]] = match[2];
  }
} catch {}

const external = values.EXTERNAL_PORTAL_ENABLED === 'true';
const checks = {
  database: Boolean(values.DATABASE_URL),
  ndaApproved: values.NDA_LEGAL_STATUS === 'APPROVED',
  privacyApproved: values.PRIVACY_LEGAL_STATUS === 'APPROVED',
  emailVerification: Boolean(values.EMAIL_VERIFICATION_PROVIDER && values.EMAIL_VERIFICATION_PROVIDER !== 'NONE'),
  secureCookies: values.COOKIE_SECURE === 'true',
  adminMfa: values.ADMIN_MFA_REQUIRED === 'true' && Boolean(values.ADMIN_TOTP_SECRET),
  smtp: Boolean(values.SMTP_HOST && values.SMTP_FROM),
  encryption: /^[a-f0-9]{64}$/i.test(values.IP_ENCRYPTION_KEY || ''),
  trustedProxy: true,
  sessionSecret: (values.SESSION_SECRET || '').length >= 32,
  invitationSecret: (values.INVITATION_TOKEN_HMAC_SECRET || '').length >= 32,
  ipFingerprintSecret: (values.IP_FINGERPRINT_SECRET || '').length >= 32,
  keySeparation: new Set([values.SESSION_SECRET, values.INVITATION_TOKEN_HMAC_SECRET, values.IP_FINGERPRINT_SECRET]).size === 3,
  noDefaultInvite: !values.DEFAULT_INVITE_TOKEN,
};
const localRequired = ['database', 'encryption', 'sessionSecret', 'invitationSecret', 'ipFingerprintSecret', 'keySeparation'];
const externalRequired = [...localRequired, 'ndaApproved', 'privacyApproved', 'emailVerification', 'secureCookies', 'adminMfa', 'smtp', 'noDefaultInvite'];
const failed = (external ? externalRequired : localRequired).filter((key) => !checks[key]);
const verdict = failed.length ? 'PRIVATE_PORTAL_NOT_READY' : external ? 'PRIVATE_PORTAL_READY_FOR_EXTERNAL_USE' : 'PRIVATE_PORTAL_READY_FOR_LOCAL_TESTING';
console.log(JSON.stringify({mode: external ? 'EXTERNAL' : 'LOCAL', checks, failed, verdict}, null, 2));
if (failed.length) process.exitCode = 1;
