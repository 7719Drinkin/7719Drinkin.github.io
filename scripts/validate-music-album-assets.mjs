import { access, readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

export async function validateMusicAlbumAssets({
  root = ROOT,
  requireLegacyCopies = false,
  forbidLegacyCopies = false
} = {}) {
  if (requireLegacyCopies && forbidLegacyCopies) {
    throw new Error('Album asset validation modes are mutually exclusive.');
  }

  const [registry, albumDocument] = await Promise.all([
    readJson(join(root, 'data/music/artists.json')),
    readJson(join(root, 'data/music/albums.json'))
  ]);
  const profiles = new Map((Array.isArray(registry) ? registry : []).map((artist) => [artist.id, artist]));
  const albums = Array.isArray(albumDocument?.albums) ? albumDocument.albums : [];
  const errors = [];
  let canonicalCovers = 0;
  let legacyCandidates = 0;

  for (const album of albums) {
    const cover = String(album?.cover ?? '').trim();
    if (!cover.startsWith('/assets/Music/Albums/')) {
      errors.push(`album ${album?.id ?? 'unknown'} must use the canonical Albums asset root: ${cover || '(missing)'}`);
      continue;
    }

    const canonicalPath = join(root, cover.slice(1));
    if (!(await exists(canonicalPath))) {
      errors.push(`canonical album cover is missing for ${album.id}: ${cover}`);
      continue;
    }
    canonicalCovers += 1;

    const ownerKey = album?.artists?.[0]?.key;
    const profile = ownerKey ? profiles.get(ownerKey) : null;
    if (!profile?.assetKey) continue;

    const expectedPrefix = `/assets/Music/Albums/${ownerKey}/`;
    if (!cover.startsWith(expectedPrefix)) continue;

    const legacyPath = join(root, 'assets/Music/Artists', profile.assetKey, 'albums', basename(cover));
    legacyCandidates += 1;
    const legacyExists = await exists(legacyPath);

    if (requireLegacyCopies && !legacyExists) {
      errors.push(`Deployment A must retain legacy copy: ${legacyPath.slice(root.length + 1)}`);
    }
    if (forbidLegacyCopies && legacyExists) {
      errors.push(`Deployment B must remove legacy copy: ${legacyPath.slice(root.length + 1)}`);
    }
  }

  return { errors, stats: { albums: albums.length, canonicalCovers, legacyCandidates } };
}

async function main() {
  const result = await validateMusicAlbumAssets({
    requireLegacyCopies: process.argv.includes('--require-legacy-copies'),
    forbidLegacyCopies: process.argv.includes('--forbid-legacy-copies')
  });

  if (result.errors.length) {
    result.errors.forEach((error) => console.error(`ERROR: ${error}`));
    process.exitCode = 1;
    return;
  }

  const { stats } = result;
  console.log(`Music album assets valid: ${stats.canonicalCovers}/${stats.albums} canonical cover(s), ${stats.legacyCandidates} profile-owned migration candidate(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
