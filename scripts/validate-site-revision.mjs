import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REVISION_LENGTH = 8;

function resolveExpectedRevision() {
  let raw = String(process.env.SITE_REVISION || process.env.GITHUB_SHA || '').trim();
  if (!raw) {
    raw = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8'
    }).trim();
  }

  if (!/^[0-9a-f]{8,64}$/i.test(raw)) {
    throw new Error(`Cannot derive expected site revision from: ${raw || '<empty>'}`);
  }

  return raw.slice(0, REVISION_LENGTH).toLowerCase();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function read(path) {
  return readFile(join(ROOT, path), 'utf8');
}

async function main() {
  const expected = resolveExpectedRevision();
  const revisionPayload = JSON.parse(await read('site-revision.json'));
  const shell = await read('js/site-shell.js');
  const bridge = await read('js/site-frame-bridge.js');
  const shellHtml = await read('site-shell.html');

  assert(revisionPayload.schemaVersion === 1, 'site-revision.json schemaVersion must be 1.');
  assert(revisionPayload.revision === expected, `site revision mismatch: expected ${expected}, got ${revisionPayload.revision}.`);

  assert(shell.includes("const REV_PARAM = '__site_rev';"), 'site-shell.js is missing REV_PARAM.');
  assert(shell.includes("const REVISION_URL = '/site-revision.json';"), 'site-shell.js is missing REVISION_URL.');
  assert(shell.includes('url.searchParams.delete(REV_PARAM);'), 'site-shell.js does not remove the internal revision from public routes.');
  assert(shell.includes('url.searchParams.set(REV_PARAM, siteRevision);'), 'site-shell.js does not stamp iframe document URLs.');
  assert(shell.includes("cache: 'no-store'"), 'site-shell.js revision request must bypass browser cache.');
  assert(shell.includes('await loadSiteRevision();'), 'site-shell.js must load the deployment revision before initial navigation.');
  assert(shell.indexOf('await loadSiteRevision();') < shell.indexOf('navigate(initialRoute, { push: false });'), 'site-shell.js navigates before revision loading finishes.');

  assert(bridge.includes("const REV_PARAM = '__site_rev';"), 'site-frame-bridge.js is missing REV_PARAM.');
  const bridgeDeletes = bridge.match(/url\.searchParams\.delete\(REV_PARAM\);/g) || [];
  assert(bridgeDeletes.length >= 2, 'site-frame-bridge.js must remove the revision from both route reporting and internal navigation.');

  assert(
    shellHtml.includes(`/js/site-shell.js?v=${expected}`),
    `site-shell.html does not reference the current shell revision ${expected}.`
  );

  for (const path of ['index.html', 'anime/index.html', 'music/index.html', 'basketball/index.html']) {
    const html = await read(path);
    assert(
      html.includes(`/js/site-frame-bridge.js?v=${expected}`),
      `${path} does not reference the current frame bridge revision ${expected}.`
    );
  }

  execFileSync(process.execPath, ['--check', join(ROOT, 'js', 'site-shell.js')], { stdio: 'inherit' });
  execFileSync(process.execPath, ['--check', join(ROOT, 'js', 'site-frame-bridge.js')], { stdio: 'inherit' });

  console.log(`Validated site revision ${expected}. Public routes stay clean while framed HTML is revisioned.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
