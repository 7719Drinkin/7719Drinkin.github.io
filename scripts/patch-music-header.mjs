import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC_ROOT = join(ROOT, 'music');
const ARTIST_REGISTRY = join(ROOT, 'data/music/artists.json');
const HEADER_STYLE_HREF = '/css/music-header.css?v=20260818-5';
const HEADER_SCRIPT_SRC = '/js/music-header.js?v=20260818-5';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const localized = (value, language = 'zh') => {
  if (typeof value === 'string') return value;
  return value?.[language] ?? value?.zh ?? value?.en ?? '';
};

function renderIdentity(currentZh = '', currentEn = '') {
  const current = currentZh || currentEn
    ? `\n        <span class="music-header-slash" aria-hidden="true">/</span>\n        <span class="music-header-current">\n          <span class="music-lang-zh">${escapeHtml(currentZh)}</span><span class="music-lang-en">${escapeHtml(currentEn.toUpperCase())}</span>\n        </span>`
    : '';

  return `<div class="music-header-identity">\n      <a class="music-site-brand" href="/" aria-label="返回 7719 Universe">\n        <span>77</span><strong>19</strong>\n      </a>\n      <span class="music-header-divider" aria-hidden="true"></span>\n      <nav class="music-header-crumbs" aria-label="音乐页面层级">\n        <a class="music-header-section" href="/music/">\n          <span class="music-lang-zh">音乐</span><span class="music-lang-en">MUSIC</span>\n        </a>${current}\n      </nav>\n    </div>`;
}

function renderLandingHeader() {
  return `<header class="music-site-header">\n    ${renderIdentity()}\n    <nav class="music-site-nav" aria-label="音乐收藏导航">\n      <a href="#artists"><span class="music-lang-zh">歌手</span><span class="music-lang-en">ARTISTS</span></a>\n      <a href="#listening"><span class="music-lang-zh">聆听</span><span class="music-lang-en">LISTENING</span></a>\n    </nav>\n  </header>`;
}

function renderArtistHeader(artist) {
  const nameZh = localized(artist.name, 'zh');
  const nameEn = localized(artist.name, 'en');

  return `<header class="music-site-header">\n    ${renderIdentity(nameZh, nameEn)}\n    <nav class="music-site-nav" aria-label="${escapeHtml(nameZh)}收藏导航">\n      <a href="#overview"><span class="music-lang-zh">概览</span><span class="music-lang-en">OVERVIEW</span></a>\n      <a href="#songs"><span class="music-lang-zh">歌曲</span><span class="music-lang-en">SONGS</span></a>\n      <a href="#albums"><span class="music-lang-zh">专辑</span><span class="music-lang-en">ALBUMS</span></a>\n      <a href="#gallery"><span class="music-lang-zh">影像</span><span class="music-lang-en">VISUAL</span></a>\n    </nav>\n  </header>`;
}

function replaceHeader(html, replacement, label) {
  const headerPattern = /<header class="music-site-header"[^>]*>[\s\S]*?<\/header>/;
  if (!headerPattern.test(html)) throw new Error(`Music header not found in ${label}`);
  return html.replace(headerPattern, replacement);
}

function installHeaderAssets(html) {
  let output = html
    .replace(/\s*<link rel="stylesheet" href="\/css\/music-header\.css\?v=[^"]+">\s*/g, '\n')
    .replace(/\s*<script src="\/js\/music-header\.js\?v=[^"]+"><\/script>\s*/g, '\n');

  if (!output.includes('</head>')) throw new Error('Cannot install Music header stylesheet: </head> missing.');
  if (!output.includes('</body>')) throw new Error('Cannot install Music header script: </body> missing.');

  // Deliberately install these last so music-design-system.css cannot override
  // the canonical header dimensions, typography or spacing.
  output = output.replace('</head>', `  <link rel="stylesheet" href="${HEADER_STYLE_HREF}">\n</head>`);
  output = output.replace('</body>', `  <script src="${HEADER_SCRIPT_SRC}"></script>\n</body>`);
  return output;
}

async function patchFile(file, header, label) {
  const source = await readFile(file, 'utf8');
  const output = installHeaderAssets(replaceHeader(source, header, label));
  await writeFile(file, output, 'utf8');
}

async function main() {
  const registry = JSON.parse(await readFile(ARTIST_REGISTRY, 'utf8'));
  const artists = registry.filter((artist) => artist.status !== 'draft');

  await patchFile(
    join(MUSIC_ROOT, 'index.html'),
    renderLandingHeader(),
    'music/index.html'
  );

  for (const artist of artists) {
    const file = join(MUSIC_ROOT, 'artists', artist.slug, 'index.html');
    await patchFile(file, renderArtistHeader(artist), artist.route || artist.slug);
  }

  console.log(`Patched canonical Music header on landing page and ${artists.length} artist page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
