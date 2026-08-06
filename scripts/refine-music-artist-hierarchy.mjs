import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)));
const ARTISTS_ROOT = join(ROOT, 'music', 'artists');
const STYLE_HREF = '/css/music-section-clean.css?v=20260807-1';

function simplifySectionHeaders(html) {
  return html.replace(
    /<div class="music-section-header reveal">\s*<div>\s*(?:<p>[\s\S]*?<\/p>\s*)?<h2>([\s\S]*?)<\/h2>\s*<\/div>\s*(?:<span>[\s\S]*?<\/span>\s*)?(?:<a[\s\S]*?<\/a>\s*)?<\/div>/g,
    '<header class="music-section-header music-section-header--unified reveal"><h2>$1</h2></header>'
  );
}

function removeGalleryHeading(html) {
  return html.replace(
    /(<section id="gallery" class="music-content-section">\s*)<header class="music-section-header music-section-header--(?:clean|system|unified) reveal">[\s\S]*?<\/header>\s*/,
    '$1'
  );
}

function simplifyVisualSubheaders(html) {
  return html.replace(
    /<header class="visual-archive-subheader">\s*<div>\s*<p>[\s\S]*?<\/p>\s*<h3>([\s\S]*?)<\/h3>\s*<\/div>\s*<span>[\s\S]*?<\/span>\s*<\/header>/g,
    '<header class="visual-archive-subheader"><h3>$1</h3></header>'
  );
}

function simplifyArtistNote(html) {
  let output = html.replace(
    /(<aside class="artist-note reveal">)\s*<p>[\s\S]*?<\/p>\s*<h2>[\s\S]*?<\/h2>/,
    '$1'
  );

  output = output.replace(
    /(<aside class="artist-note reveal">[\s\S]*?<div>[\s\S]*?<\/div>)\s*<blockquote>[\s\S]*?<\/blockquote>/,
    '$1'
  );

  return output;
}

function installStyle(html) {
  if (html.includes('/css/music-section-clean.css')) {
    return html.replace(
      /\/css\/music-section-clean\.css\?v=[^"]+/g,
      STYLE_HREF
    );
  }

  return html.replace(
    '</head>',
    `  <link rel="stylesheet" href="${STYLE_HREF}">\n</head>`
  );
}

function refine(html) {
  let output = simplifySectionHeaders(html);
  output = output.replace(
    /music-section-header--(?:clean|system)/g,
    'music-section-header--unified'
  );
  output = removeGalleryHeading(output);
  output = simplifyVisualSubheaders(output);
  output = simplifyArtistNote(output);
  output = installStyle(output);
  return output;
}

async function main() {
  const entries = await readdir(ARTISTS_ROOT, { withFileTypes: true });
  let updated = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pagePath = join(ARTISTS_ROOT, entry.name, 'index.html');
    let source;
    try {
      source = await readFile(pagePath, 'utf8');
    } catch {
      continue;
    }

    const output = refine(source);
    if (output === source) continue;

    await writeFile(pagePath, output, 'utf8');
    updated += 1;
  }

  console.log(`Refined heading hierarchy in ${updated} Music artist page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
