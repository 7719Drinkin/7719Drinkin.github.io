import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMusicCollectionRepository } from './music/music-collection-repository.mjs';
import { selectRecentListening } from './music/recent-listening-selector.mjs';
import { createRuntimePlayabilityResolver } from './music/runtime-playability-resolver.mjs';
import { presentRecentListening } from './music/recent-listening-presenter.mjs';
import { renderRecentListening } from './music/recent-listening-renderer.mjs';
import { replaceHtmlRegion } from './music/html-region-updater.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC_INDEX = join(ROOT, 'music/index.html');
const START_MARKER = '<!-- RECENT-LISTENING:START -->';
const END_MARKER = '<!-- RECENT-LISTENING:END -->';
const RECENT_LIMIT = 3;

export async function buildRecentListeningRegion({ root = ROOT } = {}) {
  const repository = createMusicCollectionRepository({ root });
  const selectedSongs = await repository.getSelectedSongs();
  const recent = selectRecentListening(selectedSongs, { limit: RECENT_LIMIT });

  if (!recent.length) {
    throw new Error('Recent Listening has no entries with curatedAt.');
  }

  const resolvePlayable = createRuntimePlayabilityResolver({ root });
  const viewModels = await presentRecentListening(recent, { resolvePlayable });
  return {
    recent,
    viewModels,
    html: renderRecentListening(viewModels)
  };
}

export async function updateMusicRecentListening({ root = ROOT } = {}) {
  const indexPath = join(root, 'music/index.html');
  const source = await readFile(indexPath, 'utf8');
  const generated = await buildRecentListeningRegion({ root });
  const output = replaceHtmlRegion(source, {
    startMarker: START_MARKER,
    endMarker: END_MARKER,
    content: generated.html
  });

  if (output !== source) await writeFile(indexPath, output, 'utf8');
  return { ...generated, changed: output !== source };
}

async function main() {
  const result = await updateMusicRecentListening();
  const labels = result.viewModels.map((item) => `${item.index} ${item.artist} / ${item.title}`).join(' | ');
  console.log(`Recent Listening ${result.changed ? 'updated' : 'already current'}: ${labels}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { START_MARKER, END_MARKER, RECENT_LIMIT, MUSIC_INDEX };
