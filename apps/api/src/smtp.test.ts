import assert from 'node:assert/strict';
import test from 'node:test';
import {ndaEvidenceMessage, smtpTransportConfig} from './smtp.js';

test('production SMTP uses authenticated STARTTLS when configured', () => {
  const config = smtpTransportConfig({
    SMTP_HOST: 'smtp.dondominio.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_REQUIRE_TLS: 'true',
    SMTP_USER: 'nda@upaidown.com',
    SMTP_PASSWORD: 'secret',
  });
  assert.deepEqual(config, {
    host: 'smtp.dondominio.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {user: 'nda@upaidown.com', pass: 'secret'},
  });
});

test('NDA archive is BCC-only and reply-to remains explicit', () => {
  const message = ndaEvidenceMessage({
    recipient: 'investor@example.com',
    name: 'Investor One',
    pdf: Buffer.from('pdf'),
    version: 'workflow-v1',
    acceptedAt: '2026-08-22T08:00:00.000Z',
    evidence: 'abcdef1234567890',
    legalStatus: 'DRAFT_FOR_WORKFLOW_TESTING',
  }, {
    SMTP_FROM: 'UP AI DOWN <nda@upaidown.com>',
    SMTP_REPLY_TO: 'privacy@upaidown.com',
    SMTP_ARCHIVE: 'nda-archive@upaidown.com',
  });
  assert.equal(message.to, 'investor@example.com');
  assert.equal(message.bcc, 'nda-archive@upaidown.com');
  assert.equal(message.replyTo, 'privacy@upaidown.com');
  assert.equal('cc' in message, false);
});
