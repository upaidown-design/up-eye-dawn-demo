import nodemailer from 'nodemailer';
import {ImapFlow} from 'imapflow';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const imapCount = async () => {
  const host = required('MAIL_IMAP_HOST');
  const secure = process.env.MAIL_IMAP_SECURE !== 'false';
  const client = new ImapFlow({
    host,
    port: Number(process.env.MAIL_IMAP_PORT || (secure ? 993 : 143)),
    secure,
    servername: process.env.MAIL_IMAP_TLS_SERVERNAME || host,
    auth: {
      user: required('MAIL_IMAP_ACCOUNT'),
      pass: required('MAIL_IMAP_PASSWORD'),
    },
    logger: false,
    disableAutoIdle: true,
  });
  try {
    await client.connect();
    const mailbox = await client.mailboxOpen('INBOX', {readOnly: true});
    return mailbox.exists;
  } finally {
    await client.logout().catch(() => undefined);
  }
};

const before = await imapCount();
const recipient = required('SMTP_USER');
const transport = nodemailer.createTransport({
  host: required('SMTP_HOST'),
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false',
  auth: {user: recipient, pass: required('SMTP_PASSWORD')},
});

await transport.verify();
const sent = await transport.sendMail({
  from: required('SMTP_FROM'),
  to: recipient,
  subject: `UP AI DOWN production mail smoke ${new Date().toISOString()}`,
  text: 'Automated production SMTP and IMAP commissioning check.',
});

let after = before;
for (let attempt = 0; attempt < 10 && after <= before; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  after = await imapCount();
}
if (after <= before) throw new Error('SMTP accepted the message, but it was not visible in INBOX over IMAP');

console.log(JSON.stringify({smtp: 'ok', imap: 'ok', messageId: sent.messageId, before, after}));
