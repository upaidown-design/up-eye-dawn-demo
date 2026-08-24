export function smtpTransportConfig(source: NodeJS.ProcessEnv = process.env) {
  const host = source.SMTP_HOST?.trim() ?? "";
  const user = source.SMTP_USER?.trim() ?? "";
  return {
    host,
    port: Number.parseInt(source.SMTP_PORT || "1025", 10),
    secure: source.SMTP_SECURE === "true",
    requireTLS: source.SMTP_REQUIRE_TLS === "true",
    auth: user ? { user, pass: source.SMTP_PASSWORD ?? "" } : undefined,
  };
}

export function ndaEvidenceMessage(
  input: {
    recipient: string;
    name: string;
    pdf: Buffer;
    version: string;
    acceptedAt: string;
    evidence: string;
    legalStatus: string;
    language?: "en" | "es";
  },
  source: NodeJS.ProcessEnv = process.env,
) {
  const archive = (
    source.SMTP_ARCHIVE ||
    source.NDA_ARCHIVE_EMAIL ||
    ""
  ).trim();
  const spanish = input.language === "es";
  const subject = spanish
    ? "Tu comprobante de acceso de inversor · UP AI DOWN"
    : "Your investor access record · UP AI DOWN";
  const text = spanish
    ? `Hola ${input.name},\n\nRecibes este mensaje transaccional porque has completado el registro de acceso controlado para inversores de UP AI DOWN.\n\nAdjuntamos una copia exacta de tu reconocimiento.\nVersión: ${input.version}\nAceptado en UTC: ${input.acceptedAt}\nReferencia de evidencia: ${input.evidence}\nEstado jurídico del documento: ${input.legalStatus}\n\nSi no realizaste este registro, responde a este mensaje para que podamos revisar y revocar el acceso.\n\nUP AI DOWN Investor Relations\nhttps://upaidown.com\n`
    : `Hello ${input.name},\n\nYou are receiving this transactional message because you completed UP AI DOWN's controlled investor access registration.\n\nAn exact copy of your acknowledgement is attached.\nVersion: ${input.version}\nAccepted at UTC: ${input.acceptedAt}\nEvidence reference: ${input.evidence}\nDocument legal status: ${input.legalStatus}\n\nIf you did not complete this registration, reply to this message so that we can review and revoke the access.\n\nUP AI DOWN Investor Relations\nhttps://upaidown.com\n`;
  return {
    from:
      source.SMTP_FROM ||
      source.MAIL_FROM ||
      "UP AI DOWN Investor Relations <investors@up-ai-down.local>",
    replyTo: source.SMTP_REPLY_TO?.trim() || undefined,
    to: input.recipient,
    // Evidence archives are deliberately blind-copied so the internal archive
    // address is never disclosed to an investor.
    bcc: archive || undefined,
    subject,
    text,
    headers: {
      "Auto-Submitted": "auto-generated",
      "X-Entity-Ref-ID": input.evidence.slice(0, 32),
    },
    attachments: [
      {
        filename: `UP AI DOWN-${input.version}-${input.evidence.slice(0, 12)}.pdf`,
        content: input.pdf,
        contentType: "application/pdf",
      },
    ],
  };
}
