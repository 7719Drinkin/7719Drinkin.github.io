import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC_ROOT = join(ROOT, 'music');
const STYLE_HREF = '/css/music-design-system.css?v=20260806-1';
const SCRIPT_SRC = '/js/music-motion.js?v=20260806-1';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:wght@500;600&display=swap';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return extname(entry.name) === '.html' ? [path] : [];
  }));
  return nested.flat();
}

function simplifySectionHeaders(html) {
  return html.replace(
    /<div class="music-section-header reveal">\s*<div>\s*(?:<p>[\s\S]*?<\/p>\s*)?<h2>([\s\S]*?)<\/h2>\s*<\/div>\s*(?:<span>[\s\S]*?<\/span>\s*)?(?:<a[\s\S]*?<\/a>\s*)?<\/div>/g,
    '<header class="music-section-header music-section-header--system reveal"><h2>$1</h2></header>'
  );
}

function installFont(html) {
  const fontPattern = /<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^">]+" rel="stylesheet">/;
  const link = `<link href="${FONT_HREF}" rel="stylesheet">`;

  if (fontPattern.test(html)) return html.replace(fontPattern, link);
  return html.replace('</head>', `  ${link}\n</head>`);
}

function installStyle(html) {
  if (html.includes('/css/music-design-system.css')) {
    return html.replace(
      /\/css\/music-design-system\.css\?v=[^"]+/g,
      STYLE_HREF
    );
  }

  return html.replace(
    '</head>',
    `  <link rel="stylesheet" href="${STYLE_HREF}">\n</head>`
  );
}

function installScript(html) {
  if (html.includes('/js/music-motion.js')) {
    return html.replace(
      /\/js\/music-motion\.js\?v=[^"]+/g,
      SCRIPT_SRC
    );
  }

  return html.replace(
    '</body>',
    `  <script src="${SCRIPT_SRC}"></script>\n</body>`
  );
}

function markUnified(html) {
  if (/data-music-design="unified"/.test(html)) return html;
  return html.replace(
    /<body class="([^"]*music-page[^"]*)"/,
    '<body class="$1" data-music-design="unified"'
  );
}

function refine(html) {
  let output = simplifySectionHeaders(html);
  output = installFont(output);
  output = installStyle(output);
  output = installScript(output);
  output = markUnified(output);
  return output;
}

async function main() {
  const files = await htmlFiles(MUSIC_ROOT);
  let updated = 0;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const output = refine(source);
    if (output === source) continue;

    await writeFile(file, output, 'utf8');
    updated += 1;
  }

  console.log(`Applied unified Music design system to ${updated} page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
