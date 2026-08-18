import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)), '..');
const MUSIC_ROOT = join(ROOT, 'music');
const HEADER_STYLE_HREF = '/css/music-header.css?v=20260818-4';
const HEADER_SCRIPT_SRC = '/js/music-header.js?v=20260818-4';

const stripTags = (value = '') => String(value).replace(/<[^>]*>/g, '').trim();

async function artistIndexFiles() {
  const root = join(MUSIC_ROOT, 'artists');
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name, 'index.html'));
}

function renderIdentity(currentZh = '', currentEn = '') {
  const current = currentZh || currentEn
    ? `\n        <span class="music-header-slash" aria-hidden="true">/</span>\n        <span class="music-header-current">\n          <span class="music-lang-zh">${currentZh}</span><span class="music-lang-en">${currentEn.toUpperCase()}</span>\n        </span>`
    : '';

  return `<div class="music-header-identity">\n      <a class="music-site-brand" href="/" aria-label="返回 7719 Universe">\n        <span>77</span><strong>19</strong>\n      </a>\n      <span class="music-header-divider" aria-hidden="true"></span>\n      <nav class="music-header-crumbs" aria-label="音乐页面层级">\n        <a class="music-header-section" href="/music/">\n          <span class="music-lang-zh">音乐</span><span class="music-lang-en">MUSIC</span>\n        </a>${current}\n      </nav>\n    </div>`;
}

function renderLandingHeader() {
  return `<header class="music-site-header">\n    ${renderIdentity()}\n    <nav class="music-site-nav" aria-label="音乐收藏导航">\n      <a href="#artists"><span class="music-lang-zh">歌手</span><span class="music-lang-en">ARTISTS</span></a>\n      <a href="#listening"><span class="music-lang-zh">聆听</span><span class="music-lang-en">LISTENING</span></a>\n    </nav>\n  </header>`;
}

function renderArtistHeader(nameZh, nameEn) {
  return `<header class="music-site-header">\n    ${renderIdentity(nameZh, nameEn)}\n    <nav class="music-site-nav" aria-label="音乐收藏导航">\n      <a href="#overview"><span class="music-lang-zh">概览</span><span class="music-lang-en">OVERVIEW</span></a>\n      <a href="#songs"><span class="music-lang-zh">歌曲</span><span class="music-lang-en">SONGS</span></a>\n      <a href="#albums"><span class="music-lang-zh">专辑</span><span class="music-lang-en">ALBUMS</span></a>\n      <a href="#gallery"><span class="music-lang-zh">影像</span><span class="music-lang-en">VISUAL</span></a>\n    </nav>\n  </header>`;
}

function installHeaderAssets(html) {
  let output = html
    .replace(/\s*<link rel="stylesheet" href="\/css\/music-header\.css\?v=[^"]+">\s*/g, '\n')
    .replace(/\s*<script src="\/js\/music-header\.js\?v=[^"]+"><\/script>\s*/g, '\n');

  output = output.replace('</head>', `  <link rel="stylesheet" href="${HEADER_STYLE_HREF}">\n</head>`);
  output = output.replace('</body>', `  <script src="${HEADER_SCRIPT_SRC}"></script>\n</body>`);
  return output;
}

function patchLanding(html) {
  const headerPattern = /<header class="music-site-header">[\s\S]*?<\/header>/;
  if (!headerPattern.test(html)) throw new Error('Music landing header not found.');
  return installHeaderAssets(html.replace(headerPattern, renderLandingHeader()));
}

function patchArtist(html, file) {
  const hero = html.match(/<div class="artist-hero-copy reveal">[\s\S]*?<h1>([\s\S]*?)<\/h1>\s*<h2>([\s\S]*?)<\/h2>/);
  if (!hero) throw new Error(`Artist names not found in ${file}`);

  const nameZh = stripTags(hero[1]);
  const nameEn = stripTags(hero[2]);
  const headerPattern = /<header class="music-site-header">[\s\S]*?<\/header>/;
  if (!headerPattern.test(html)) throw new Error(`Music header not found in ${file}`);

  return installHeaderAssets(html.replace(headerPattern, renderArtistHeader(nameZh, nameEn)));
}

async function main() {
  const landing = join(MUSIC_ROOT, 'index.html');
  const landingHtml = await readFile(landing, 'utf8');
  await writeFile(landing, patchLanding(landingHtml), 'utf8');

  const artistFiles = await artistIndexFiles();
  for (const file of artistFiles) {
    const html = await readFile(file, 'utf8');
    await writeFile(file, patchArtist(html, file), 'utf8');
  }

  console.log(`Patched canonical Music header on landing page and ${artistFiles.length} artist page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
