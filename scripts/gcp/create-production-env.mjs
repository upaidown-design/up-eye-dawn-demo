import { randomBytes, scryptSync } from "node:crypto";
import { readFile, writeFile, chmod } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const output = process.argv[2];
const previousPath = process.argv[3];
if (!output)
  throw new Error(
    "Usage: node scripts/gcp/create-production-env.mjs OUTPUT_PATH [PREVIOUS_ENV_PATH]",
  );

const parse = (input) =>
  Object.fromEntries(
    input.split(/\r?\n/).flatMap((line) => {
      const clean = line.trim();
      if (!clean || clean.startsWith("#") || !clean.includes("=")) return [];
      const index = clean.indexOf("=");
      return [[clean.slice(0, index), clean.slice(index + 1)]];
    }),
  );

let local = {};
try {
  local = parse(await readFile(resolve(root, ".env"), "utf8"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
let previous = {};
if (previousPath) {
  previous = parse(await readFile(previousPath, "utf8"));
}

const adminEmail =
  local.ADMIN_EMAIL || previous.ADMIN_EMAIL || "upaidown@gmail.com";
let adminPasswordHash = local.ADMIN_PASSWORD_HASH?.startsWith("scrypt:")
  ? local.ADMIN_PASSWORD_HASH
  : previous.ADMIN_PASSWORD_HASH || "";
if (!adminPasswordHash.startsWith("scrypt:")) {
  const password = randomBytes(18).toString("base64url");
  const salt = randomBytes(16);
  adminPasswordHash = `scrypt:${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
  process.stderr.write(
    `Generated one-time admin password (store securely): ${password}\n`,
  );
}

const secret = (bytes = 48) => randomBytes(bytes).toString("base64url");
const stableSecret = (key, create = () => secret()) =>
  previous[key] || create();
const postgresPassword = stableSecret("POSTGRES_PASSWORD", () => secret(32));
const rows = {
  API_PORT: "4010",
  DATABASE_URL: `postgresql://ued:${postgresPassword}@postgres:5432/ued_demo`,
  REDIS_URL: "",
  DEMO_LOCAL_ONLY: "false",
  ROVER_PRODUCT_NAME: "UP-EYE-DAWN Rover",
  INVESTOR_HTML_URL: "/demo/investor-demo",
  PUBLIC_BASE_URL: "https://demo.upaidown.com",
  EXTERNAL_PORTAL_ENABLED: "false",
  WORKFLOW_TEST_PORTAL_ENABLED:
    previous.WORKFLOW_TEST_PORTAL_ENABLED || "false",
  WORKFLOW_TEST_FORCE_MANUAL_APPROVAL:
    previous.WORKFLOW_TEST_FORCE_MANUAL_APPROVAL || "true",
  EMAIL_VERIFICATION_PROVIDER: previous.EMAIL_VERIFICATION_PROVIDER || "NONE",
  IDENTITY_PLATFORM_PROJECT_ID: previous.IDENTITY_PLATFORM_PROJECT_ID || "",
  IDENTITY_PLATFORM_API_KEY: previous.IDENTITY_PLATFORM_API_KEY || "",
  ADMIN_EMAIL: adminEmail,
  ADMIN_PASSWORD_HASH: adminPasswordHash,
  ADMIN_TOTP_SECRET:
    local.ADMIN_TOTP_SECRET || previous.ADMIN_TOTP_SECRET || "",
  ADMIN_MFA_REQUIRED: previous.ADMIN_MFA_REQUIRED || "false",
  ADMIN_SESSION_IDLE_MINUTES: "30",
  ADMIN_SESSION_MAX_HOURS: "8",
  ADMIN_MFA_ENCRYPTION_KEY: stableSecret("ADMIN_MFA_ENCRYPTION_KEY", () =>
    randomBytes(32).toString("hex"),
  ),
  TEMP_ADMIN_DEV_LOGIN_ENABLED:
    previous.TEMP_ADMIN_DEV_LOGIN_ENABLED || "false",
  TEMP_ADMIN_DEV_LOGIN_PUBLIC_BUTTON_ENABLED:
    previous.TEMP_ADMIN_DEV_LOGIN_PUBLIC_BUTTON_ENABLED || "false",
  TEMP_ADMIN_DEV_LOGIN_TOKEN: previous.TEMP_ADMIN_DEV_LOGIN_TOKEN || "",
  TEMP_ADMIN_DEV_LOGIN_EXPIRES_AT:
    previous.TEMP_ADMIN_DEV_LOGIN_EXPIRES_AT || "",
  SESSION_SECRET: stableSecret("SESSION_SECRET"),
  INVITATION_TOKEN_HMAC_SECRET: stableSecret("INVITATION_TOKEN_HMAC_SECRET"),
  IP_FINGERPRINT_SECRET: stableSecret("IP_FINGERPRINT_SECRET"),
  IP_ENCRYPTION_KEY: stableSecret("IP_ENCRYPTION_KEY", () =>
    randomBytes(32).toString("hex"),
  ),
  IP_ENCRYPTION_KEY_VERSION: previous.IP_ENCRYPTION_KEY_VERSION || "1",
  DEFAULT_INVITE_TOKEN: "",
  VISITOR_SESSION_IDLE_MINUTES: "120",
  VISITOR_SESSION_MAX_HOURS: "72",
  COOKIE_SECURE: "true",
  NDA_LEGAL_STATUS:
    local.NDA_LEGAL_STATUS ||
    previous.NDA_LEGAL_STATUS ||
    "DRAFT_FOR_WORKFLOW_TESTING",
  PRIVACY_LEGAL_STATUS:
    local.PRIVACY_LEGAL_STATUS || previous.PRIVACY_LEGAL_STATUS || "DRAFT",
  NDA_RETENTION_NOTICE:
    local.NDA_RETENTION_NOTICE ||
    previous.NDA_RETENTION_NOTICE ||
    "Retention period pending legal approval.",
  PRIVACY_CONTACT_EMAIL:
    local.PRIVACY_CONTACT_EMAIL || previous.PRIVACY_CONTACT_EMAIL || adminEmail,
  SMTP_HOST: previous.SMTP_HOST || "",
  SMTP_PORT: previous.SMTP_PORT || "587",
  SMTP_SECURE: previous.SMTP_SECURE || "false",
  SMTP_REQUIRE_TLS: previous.SMTP_REQUIRE_TLS || "true",
  SMTP_USER: previous.SMTP_USER || "",
  SMTP_PASSWORD: previous.SMTP_PASSWORD || "",
  SMTP_FROM: previous.SMTP_FROM || "UP AI DOWN <nda@upaidown.com>",
  SMTP_REPLY_TO: previous.SMTP_REPLY_TO || "privacy@upaidown.com",
  SMTP_ARCHIVE: previous.SMTP_ARCHIVE || "",
  NDA_ARCHIVE_EMAIL: previous.NDA_ARCHIVE_EMAIL || "",
  MAIL_SERVER_PROVIDER: previous.MAIL_SERVER_PROVIDER || "POSTFIX_DOVECOT",
  MAIL_WEBMAIL_URL: previous.MAIL_WEBMAIL_URL || "",
  MAIL_JMAP_URL: previous.MAIL_JMAP_URL || "",
  MAIL_JMAP_ACCOUNT: previous.MAIL_JMAP_ACCOUNT || "",
  MAIL_JMAP_TOKEN: previous.MAIL_JMAP_TOKEN || "",
  MAIL_IMAP_HOST: previous.MAIL_IMAP_HOST || "",
  MAIL_IMAP_PORT: previous.MAIL_IMAP_PORT || "993",
  MAIL_IMAP_SECURE: previous.MAIL_IMAP_SECURE || "true",
  MAIL_IMAP_TLS_SERVERNAME: previous.MAIL_IMAP_TLS_SERVERNAME || "",
  MAIL_IMAP_ACCOUNT: previous.MAIL_IMAP_ACCOUNT || "",
  MAIL_IMAP_PASSWORD: previous.MAIL_IMAP_PASSWORD || "",
  MAIL_IMAP_IDENTITIES: previous.MAIL_IMAP_IDENTITIES || "",
  VISITOR_SESSION_RETENTION_DAYS:
    previous.VISITOR_SESSION_RETENTION_DAYS || "30",
  AUDIT_EVENT_RETENTION_DAYS: previous.AUDIT_EVENT_RETENTION_DAYS || "365",
  NDA_EVIDENCE_RETENTION_DAYS: previous.NDA_EVIDENCE_RETENTION_DAYS || "2555",
  ENCRYPTED_IP_RETENTION_DAYS: previous.ENCRYPTED_IP_RETENTION_DAYS || "90",
  POSTGRES_USER: "ued",
  POSTGRES_PASSWORD: postgresPassword,
  POSTGRES_DB: "ued_demo",
  TLS_EMAIL: local.TLS_EMAIL || previous.TLS_EMAIL || "upaidown@gmail.com",
};

const content =
  Object.entries(rows)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n";
await writeFile(output, content, { mode: 0o600 });
await chmod(output, 0o600);
