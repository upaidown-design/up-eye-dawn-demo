import {mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const has = (name) => args.includes(name);
const project = value('--project', 'project-6ec58af7-91e9-4c25-870');
const secret = value('--secret', 'ued-production-env');
const zone = value('--zone', 'europe-west1-b');
const vm = value('--vm', 'ued-prod-01');
const user = value('--user', 'nda@upaidown.com');
const archive = value('--archive', 'nda-archive@upaidown.com');
const replyTo = value('--reply-to', 'privacy@upaidown.com');

for (const [label, candidate] of [['project', project], ['secret', secret], ['zone', zone], ['vm', vm]]) {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(candidate)) throw new Error(`Invalid ${label}`);
}
for (const address of [user, archive, replyTo]) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error(`Invalid email address: ${address}`);
}
if (!has('--password-stdin')) {
  throw new Error('Refusing to accept an SMTP password on the command line. Pass --password-stdin and pipe it through standard input.');
}

const password = readFileSync(0, 'utf8').replace(/[\r\n]+$/, '');
if (password.length < 16 || /[\r\n]/.test(password)) throw new Error('SMTP password must contain at least 16 characters and no line breaks.');

const run = (command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options});
  if (result.status !== 0) throw new Error(`${command} failed: ${(result.stderr || '').trim()}`);
  return result.stdout;
};

const current = run('gcloud', ['secrets', 'versions', 'access', 'latest', `--secret=${secret}`, `--project=${project}`]);
const updates = new Map([
  ['SMTP_HOST', 'smtp.dondominio.com'],
  ['SMTP_PORT', '587'],
  ['SMTP_SECURE', 'false'],
  ['SMTP_REQUIRE_TLS', 'true'],
  ['SMTP_USER', user],
  ['SMTP_PASSWORD', password],
  ['SMTP_FROM', `UP AI DOWN <${user}>`],
  ['SMTP_REPLY_TO', replyTo],
  ['SMTP_ARCHIVE', archive],
  ['NDA_ARCHIVE_EMAIL', archive],
]);

const seen = new Set();
const lines = current.replace(/\n$/, '').split('\n').map((line) => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=/);
  if (!match || !updates.has(match[1])) return line;
  seen.add(match[1]);
  return `${match[1]}=${updates.get(match[1])}`;
});
for (const [key, setting] of updates) if (!seen.has(key)) lines.push(`${key}=${setting}`);
const next = `${lines.join('\n')}\n`;

run('gcloud', ['secrets', 'versions', 'add', secret, `--project=${project}`, '--data-file=-'], {input: next});
console.log(`Created a new ${secret} version with authenticated STARTTLS SMTP settings.`);

if (has('--apply-vm')) {
  const directory = mkdtempSync(join(tmpdir(), 'ued-smtp-'));
  const envFile = join(directory, 'app.env');
  try {
    writeFileSync(envFile, next, {mode: 0o600});
    chmodSync(envFile, 0o600);
    run('gcloud', ['compute', 'scp', envFile, `${vm}:/tmp/ued-smtp-app.env`, `--zone=${zone}`, `--project=${project}`, '--tunnel-through-iap']);
    run('gcloud', ['compute', 'ssh', vm, `--zone=${zone}`, `--project=${project}`, '--tunnel-through-iap', '--command=sudo install -m 0600 /tmp/ued-smtp-app.env /etc/up-eye-dawn/app.env && rm -f /tmp/ued-smtp-app.env && sudo systemctl restart up-eye-dawn.service']);
    console.log(`Applied SMTP settings to ${vm} and restarted the application service.`);
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
}
