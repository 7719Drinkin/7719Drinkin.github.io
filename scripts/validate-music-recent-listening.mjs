import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMusicCollectionRepository } from './music/music-collection-repository.mjs';
import { curatedTimestamp, selectRecentListening } from './music/recent-listening-selector.mjs';
import { replaceHtmlRegion } from './music/html-region-updater.mjs';
import {
  buildRecentListeningRegion,
  START_MARKER,
  END_MARKER,
  RECENT_LIMIT
} from './update-music-recent-listening.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_PATH = join(ROOT, 'music/index.html');

async function main() {
  const repository = createMusicCollectionRepository({ root: ROOT });
  const selectedSongs = await repository.getSelectedSongs();
  const datedSongs = selectedSongs.filter((song) => song.curatedAt);

  for (const song of datedSongs) {
    if (!Number.isFinite(curatedTimestamp(song))) {
      throw new Error(`Invalid curatedAt: ${song.artistId} / ${song.title} / ${song.curatedAt}`);
    }
  }

  const identities = new Set();
  for (const song of selectedSongs) {
    const identity = `${song.artistId}\u0000${song.album}\u0000${song.title}`;
    if (identities.has(identity)) throw new Error(`Duplicate selected song: ${song.artistId} / ${song.title}`);
    identities.add(identity);
  }

  const recent = selectRecentListening(selectedSongs, { limit: RECENT_LIMIT });
  if (recent.length !== Math.min(RECENT_LIMIT, datedSongs.length)) {
    throw new Error('Recent Listening selector returned an unexpected number of rows.');
  }

  const source = await readFile(INDEX_PATH, 'utf8');
  const generated = await buildRecentListeningRegion({ root: ROOT });
  const regenerated = replaceHtmlRegion(source, {
    startMarker: START_MARKER,
    endMarker: END_MARKER,
    content: generated.html
  });

  if (regenerated !== source) {
    throw new Error('music/index.html Recent Listening region is stale; run node scripts/update-music-recent-listening.mjs.');
  }

  console.log(`Validated Recent Listening: ${generated.viewModels.map((item) => item.title).join(' / ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
