import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASKETBALL_ROOT = join(ROOT, 'basketball');
const STYLE_HREF = '/css/basketball-system.css?v=20260807-1';
const SCRIPT_SRC = '/js/basketball-motion.js?v=20260807-1';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return extname(entry.name).toLowerCase() === '.html' ? [path] : [];
  }));
  return nested.flat();
}

function installStyle(html) {
  if (html.includes('/css/basketball-system.css')) {
    return html.replace(/\/css\/basketball-system\.css\?v=[^"]+/g, STYLE_HREF);
  }
  return html.replace('</head>', `  <link rel="stylesheet" href="${STYLE_HREF}">\n</head>`);
}

function installScript(html) {
  if (html.includes('/js/basketball-motion.js')) {
    return html.replace(/\/js\/basketball-motion\.js\?v=[^"]+/g, SCRIPT_SRC);
  }
  return html.replace('</body>', `  <script src="${SCRIPT_SRC}"></script>\n</body>`);
}

function markBody(html, repositoryPath) {
  const pageClass = repositoryPath === 'basketball/index.html'
    ? 'basketball-page basketball-landing-page'
    : repositoryPath === 'basketball/michael-jordan/archive/index.html'
      ? 'basketball-page basketball-archive-page'
      : 'basketball-page basketball-mj-page';

  return html.replace(/<body([^>]*)>/, (match, rawAttributes) => {
    let attributes = rawAttributes;
    const classMatch = attributes.match(/class="([^"]*)"/);
    if (classMatch) {
      const classes = new Set(classMatch[1].split(/\s+/).filter(Boolean));
      pageClass.split(/\s+/).forEach((name) => classes.add(name));
      attributes = attributes.replace(classMatch[0], `class="${[...classes].join(' ')}"`);
    } else {
      attributes += ` class="${pageClass}"`;
    }

    if (!/data-site-module=/.test(attributes)) {
      attributes += ' data-site-module="basketball"';
    }
    return `<body${attributes}>`;
  });
}

function installCourtLines(html) {
  if (html.includes('basketball-court-lines')) return html;
  return html.replace(/(<body[^>]*>)/, '$1\n  <div class="basketball-court-lines" aria-hidden="true"></div>');
}

function installScorebug(html, repositoryPath) {
  if (repositoryPath !== 'basketball/michael-jordan/index.html' || html.includes('basketball-scorebug')) return html;

  const scorebug = `\n      <aside class="basketball-scorebug reveal" aria-label="Michael Jordan collection marker">\n        <span>23</span>\n        <div><strong>MICHAEL JORDAN</strong><small>LEGACY COLLECTION</small></div>\n      </aside>`;

  return html.replace(/(<div class="hero-number"[^>]*>[\s\S]*?<\/div>)(\s*<\/section>)/, `$1${scorebug}$2`);
}

async function main() {
  const files = await htmlFiles(BASKETBALL_ROOT);
  let updated = 0;

  for (const file of files) {
    const repositoryPath = relative(ROOT, file).split(sep).join('/');
    const source = await readFile(file, 'utf8');
    let output = source;
    output = markBody(output, repositoryPath);
    output = installCourtLines(output);
    output = installScorebug(output, repositoryPath);
    output = installStyle(output);
    output = installScript(output);

    if (output === source) continue;
    await writeFile(file, output, 'utf8');
    updated += 1;
  }

  console.log(`Applied Basketball design system to ${updated} page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
