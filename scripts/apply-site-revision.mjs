import { execFileSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHELL_FILE = join(ROOT, 'js', 'site-shell.js');
const BRIDGE_FILE = join(ROOT, 'js', 'site-frame-bridge.js');
const REVISION_FILE = join(ROOT, 'site-revision.json');
const REVISION_LENGTH = 8;
const SKIP_DIRECTORIES = new Set([
  '.git',
  '.github',
  'node_modules',
  '_site',
  'apps',
  'main-site',
  'solar-universe',
  'preview'
]);

function resolveRevision() {
  let raw = String(process.env.SITE_REVISION || process.env.GITHUB_SHA || '').trim();
  if (!raw) {
    raw = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8'
    }).trim();
  }

  if (!/^[0-9a-f]{8,64}$/i.test(raw)) {
    throw new Error(`Cannot derive deployment revision from: ${raw || '<empty>'}`);
  }

  return raw.slice(0, REVISION_LENGTH).toLowerCase();
}

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Cannot patch ${label}: expected source fragment is missing.`);
  }
  return source.replace(search, replacement);
}

function patchShell(source) {
  let output = source;

  if (!output.includes("const REV_PARAM = '__site_rev';")) {
    output = replaceRequired(
      output,
      "  const FRAME_PARAM = '__site_frame';\n  const STATE_KEY = '7719:persistent-player:v2';",
      "  const FRAME_PARAM = '__site_frame';\n  const REV_PARAM = '__site_rev';\n  const REVISION_URL = '/site-revision.json';\n  let siteRevision = '';\n  let revisionRefreshPromise = null;\n  const STATE_KEY = '7719:persistent-player:v2';",
      'js/site-shell.js constants'
    );
  }

  if (!output.includes('url.searchParams.delete(REV_PARAM);')) {
    output = replaceRequired(
      output,
      "    url.searchParams.delete(FRAME_PARAM);\n    return `${url.pathname}${url.search}${url.hash}` || '/';",
      "    url.searchParams.delete(FRAME_PARAM);\n    url.searchParams.delete(REV_PARAM);\n    return `${url.pathname}${url.search}${url.hash}` || '/';",
      'js/site-shell.js route cleanup'
    );
  }

  if (!output.includes('url.searchParams.set(REV_PARAM, siteRevision);')) {
    output = replaceRequired(
      output,
      "    url.searchParams.set(FRAME_PARAM, '1');\n    return `${url.pathname}${url.search}${url.hash}`;",
      "    url.searchParams.set(FRAME_PARAM, '1');\n    if (siteRevision) url.searchParams.set(REV_PARAM, siteRevision);\n    else url.searchParams.delete(REV_PARAM);\n    return `${url.pathname}${url.search}${url.hash}`;",
      'js/site-shell.js frame URL'
    );
  }

  if (!output.includes('const loadSiteRevision = async () =>')) {
    output = replaceRequired(
      output,
      "  const isThreeDRoute = (value) => {",
      `  const loadSiteRevision = async () => {\n    const controller = new AbortController();\n    const timeout = window.setTimeout(() => controller.abort(), 1800);\n\n    try {\n      const requestUrl = \`${'${REVISION_URL}'}?t=${'${Date.now()}'}\`;\n      const response = await fetch(requestUrl, {\n        cache: 'no-store',\n        credentials: 'same-origin',\n        signal: controller.signal\n      });\n      if (!response.ok) throw new Error(\`Revision request failed: ${'${response.status}'}\`);\n\n      const payload = await response.json();\n      const revision = String(payload?.revision || '').trim().toLowerCase();\n      if (!/^[0-9a-f]{8}$/.test(revision)) {\n        throw new Error('Revision payload is invalid.');\n      }\n      siteRevision = revision;\n    } catch (error) {\n      console.warn('[site-shell] deployment revision unavailable; keeping the current revision.', error);\n    } finally {\n      window.clearTimeout(timeout);\n    }\n  };\n\n  const refreshSiteRevision = () => {\n    if (revisionRefreshPromise) return revisionRefreshPromise;\n\n    revisionRefreshPromise = (async () => {\n      const previousRevision = siteRevision;\n      await loadSiteRevision();\n      if (!siteRevision || siteRevision === previousRevision || !state.route) return;\n\n      setLoading(true);\n      frame.src = frameUrl(state.route);\n    })().finally(() => {\n      revisionRefreshPromise = null;\n    });\n\n    return revisionRefreshPromise;\n  };\n\n  const isThreeDRoute = (value) => {`,
      'js/site-shell.js revision loader'
    );
  }

  if (!output.includes("window.addEventListener('focus', refreshSiteRevision);")) {
    output = replaceRequired(
      output,
      "  window.addEventListener('pagehide', persistState);",
      "  window.addEventListener('pagehide', persistState);\n  window.addEventListener('focus', refreshSiteRevision);\n  document.addEventListener('visibilitychange', () => {\n    if (!document.hidden) refreshSiteRevision();\n  });",
      'js/site-shell.js revision refresh events'
    );
  }

  if (!output.includes('await loadSiteRevision();')) {
    output = replaceRequired(
      output,
      "  renderStaticIcons();\n  restoreViewState();\n  restorePlayerState();\n  setRangeFill(ui.seek, 0);\n  const initialRoute = routeFromShellQuery();\n  navigate(initialRoute, { push: false });\n})();",
      "  const init = async () => {\n    renderStaticIcons();\n    restoreViewState();\n    restorePlayerState();\n    setRangeFill(ui.seek, 0);\n    setLoading(true);\n    await loadSiteRevision();\n    const initialRoute = routeFromShellQuery();\n    navigate(initialRoute, { push: false });\n  };\n\n  init();\n})();",
      'js/site-shell.js initialization'
    );
  }

  return output;
}

function patchBridge(source) {
  let output = source;

  if (!output.includes("const REV_PARAM = '__site_rev';")) {
    output = replaceRequired(
      output,
      "  const FRAME_PARAM = '__site_frame';\n  const THREE_D_PATH =",
      "  const FRAME_PARAM = '__site_frame';\n  const REV_PARAM = '__site_rev';\n  const THREE_D_PATH =",
      'js/site-frame-bridge.js constants'
    );
  }

  if (!output.includes("url.searchParams.delete(REV_PARAM);\n    return url;")) {
    output = replaceRequired(
      output,
      "    url.searchParams.delete(FRAME_PARAM);\n    return url;",
      "    url.searchParams.delete(FRAME_PARAM);\n    url.searchParams.delete(REV_PARAM);\n    return url;",
      'js/site-frame-bridge.js current route cleanup'
    );
  }

  const clickCleanup = "    url.searchParams.delete(FRAME_PARAM);\n    navigate(url);";
  if (output.includes(clickCleanup)) {
    output = output.replace(
      clickCleanup,
      "    url.searchParams.delete(FRAME_PARAM);\n    url.searchParams.delete(REV_PARAM);\n    navigate(url);"
    );
  }

  return output;
}

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) return [];

    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    if (extname(entry.name).toLowerCase() !== '.html') return [];
    return [path];
  }));
  return nested.flat();
}

async function stampHtmlAssets(revision) {
  const files = await htmlFiles(ROOT);
  let bridgeRefs = 0;

  for (const file of files) {
    const repositoryPath = relative(ROOT, file).split(sep).join('/');
    const source = await readFile(file, 'utf8');
    let output = source;

    if (repositoryPath === 'site-shell.html') {
      output = output.replace(
        /<script src="\/js\/site-shell\.js\?v=[^"]+"><\/script>/,
        `<script src="/js/site-shell.js?v=${revision}"></script>`
      );
    } else if (output.includes('data-site-frame-bridge')) {
      output = output.replace(
        /<script data-site-frame-bridge src="\/js\/site-frame-bridge\.js\?v=[^"]+"><\/script>/g,
        `<script data-site-frame-bridge src="/js/site-frame-bridge.js?v=${revision}"></script>`
      );
      bridgeRefs += 1;
    }

    if (output !== source) await writeFile(file, output, 'utf8');
  }

  return bridgeRefs;
}

async function main() {
  const revision = resolveRevision();

  const shellSource = await readFile(SHELL_FILE, 'utf8');
  const bridgeSource = await readFile(BRIDGE_FILE, 'utf8');
  await writeFile(SHELL_FILE, patchShell(shellSource), 'utf8');
  await writeFile(BRIDGE_FILE, patchBridge(bridgeSource), 'utf8');

  await writeFile(
    REVISION_FILE,
    `${JSON.stringify({ schemaVersion: 1, revision }, null, 2)}\n`,
    'utf8'
  );

  const bridgeRefs = await stampHtmlAssets(revision);
  console.log(`Applied site revision ${revision}; versioned ${bridgeRefs} framed HTML page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
