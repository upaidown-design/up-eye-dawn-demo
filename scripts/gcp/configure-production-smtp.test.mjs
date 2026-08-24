import assert from 'node:assert/strict';
import {chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

test('passes the complete environment payload to gcloud over stdin', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ued-smtp-test-'));
  const fakeGcloud = join(directory, 'gcloud');
  const captured = join(directory, 'captured.env');
  const password = 'test-password-with-more-than-16-characters';
  try {
    writeFileSync(fakeGcloud, `#!/bin/sh
set -eu
if [ "$1 $2 $3" = "secrets versions access" ]; then
  printf '%s\\n' 'COOKIE_SECURE=true' 'SMTP_HOST='
elif [ "$1 $2 $3" = "secrets versions add" ]; then
  cat > "$FAKE_GCLOUD_CAPTURE"
else
  exit 64
fi
`);
    chmodSync(fakeGcloud, 0o700);

    const result = spawnSync(process.execPath, ['scripts/gcp/configure-production-smtp.mjs', '--password-stdin'], {
      cwd: new URL('../..', import.meta.url),
      encoding: 'utf8',
      input: password,
      env: {...process.env, PATH: `${directory}:${process.env.PATH}`, FAKE_GCLOUD_CAPTURE: captured},
    });
    assert.equal(result.status, 0, result.stderr);
    const payload = readFileSync(captured, 'utf8');
    assert.match(payload, /^SMTP_HOST=mail\.upaidown\.com$/m);
    assert.match(payload, new RegExp(`^SMTP_PASSWORD=${password}$`, 'm'));
    assert.match(payload, new RegExp(`^MAIL_IMAP_PASSWORD=${password}$`, 'm'));
    assert.match(payload, /^MAIL_IMAP_SECURE=true$/m);
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});
