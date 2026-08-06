import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRIDGE_SRC = '/js/site-frame-bridge.js?v=20260806-2';
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

const BOOTSTRAP = `<script data-site-shell-bootstrap>
(() => {
  const FRAME_PARAM = '__site_frame';
  const path = window.location.pathname;
  const excluded = path === '/site-shell.html'
    || /^\\/(?:preview\\/)?solar-universe(?:\\/|$)/.test(path);
  if (excluded || window.self !== window.top) return;

  const url = new URL(window.location.href);
  if (url.searchParams.get(FRAME_PARAM) === '1') return;
  const route = \`${'${url.pathname}${url.search}${url.hash}'}\`;
  window.location.replace(\`/site-shell.html?route=${'${encodeURIComponent(route)}'}\`);
})();
</script>`;

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

function installBootstrap(html) {
  if (html.includes('data-site-shell-bootstrap')) {
    return html.replace(
      /<script data-site-shell-bootstrap>[\s\S]*?<\/script>/,
      BOOTSTRAP
    );
  }
  return html.replace('</head>', `  ${BOOTSTRAP}\n</head>`);
}

function installBridge(html) {
  const script = `<script data-site-frame-bridge src="${BRIDGE_SRC}"></script>`;
  if (html.includes('data-site-frame-bridge')) {
    return html.replace(
      /<script data-site-frame-bridge src="[^"]+"><\/script>/,
      script
    );
  }
  return html.replace('</body>', `  ${script}\n</body>`);
}

async function main() {
  const files = await htmlFiles(ROOT);
  let updated = 0;

  for (const file of files) {
    const repositoryPath = relative(ROOT, file).split(sep).join('/');
    if (repositoryPath === 'site-shell.html') continue;

    const source = await readFile(file, 'utf8');
    if (!source.includes('</head>') || !source.includes('</body>')) continue;

    let output = installBootstrap(source);
    output = installBridge(output);
    if (output === source) continue;

    await writeFile(file, output, 'utf8');
    updated += 1;
  }

  console.log(`Installed persistent site shell in ${updated} HTML page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
