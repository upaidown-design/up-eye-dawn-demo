import nodemailer from 'nodemailer';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const target = required('MAIL_EXTERNAL_TEST_RECIPIENT');
const user = required('SMTP_USER');
const transport = nodemailer.createTransport({
  host: required('SMTP_HOST'),
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false',
  auth: {user, pass: required('SMTP_PASSWORD')},
});

await transport.verify();
const sent = await transport.sendMail({
  from: required('SMTP_FROM'),
  replyTo: process.env.SMTP_REPLY_TO?.trim() || undefined,
  to: target,
  subject: `UP AI DOWN external delivery check ${new Date().toISOString()}`,
  text: [
    'Controlled production delivery test for UP AI DOWN.',
    'No action is required.',
    'This message verifies authenticated SMTP, TLS, SPF and DKIM transport to an external mailbox.',
  ].join('\n\n'),
});

console.log(JSON.stringify({smtp: 'accepted', targetDomain: target.split('@').at(-1), messageId: sent.messageId, response: sent.response}));
