export function smtpTransportConfig(source: NodeJS.ProcessEnv = process.env) {
  const host = source.SMTP_HOST?.trim() ?? '';
  const user = source.SMTP_USER?.trim() ?? '';
  return {
    host,
    port: Number.parseInt(source.SMTP_PORT || '1025', 10),
    secure: source.SMTP_SECURE === 'true',
    requireTLS: source.SMTP_REQUIRE_TLS === 'true',
    auth: user ? {user, pass: source.SMTP_PASSWORD ?? ''} : undefined,
  };
}

export function ndaEvidenceMessage(input: {
  recipient: string;
  name: string;
  pdf: Buffer;
  version: string;
  acceptedAt: string;
  evidence: string;
  legalStatus: string;
}, source: NodeJS.ProcessEnv = process.env) {
  const archive = (source.SMTP_ARCHIVE || source.NDA_ARCHIVE_EMAIL || '').trim();
  return {
    from: source.SMTP_FROM || source.MAIL_FROM || 'UP AI DOWN <nda@up-ai-down.local>',
    replyTo: source.SMTP_REPLY_TO?.trim() || undefined,
    to: input.recipient,
    // Evidence archives are deliberately blind-copied so the internal archive
    // address is never disclosed to an investor.
    bcc: archive || undefined,
    subject: `${input.legalStatus === 'APPROVED' ? 'NDA acceptance' : 'Workflow-test acknowledgement'} · UP AI DOWN`,
    text: `Hello ${input.name},\n\nAttached is your acknowledgement record.\nVersion: ${input.version}\nAccepted at UTC: ${input.acceptedAt}\nEvidence: ${input.evidence}\nLegal status: ${input.legalStatus}\n`,
    attachments: [{filename: `UP AI DOWN-${input.version}-${input.evidence.slice(0, 12)}.pdf`, content: input.pdf, contentType: 'application/pdf'}],
  };
}
