import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const localized = (value, language = 'zh') => {
  if (typeof value === 'string') return value;
  return value?.[language] ?? value?.zh ?? value?.en ?? '';
};

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

export function createMusicCollectionRepository({ root }) {
  if (!root) throw new Error('MusicCollectionRepository requires a root path.');

  const registryPath = join(root, 'data/music/artists.json');
  const detailsDir = join(root, 'data/music/artists');
  let collectionPromise = null;

  const loadCollection = async () => {
    if (collectionPromise) return collectionPromise;

    collectionPromise = (async () => {
      const registry = await readJson(registryPath);
      if (!Array.isArray(registry)) {
        throw new Error('data/music/artists.json must contain an array.');
      }

      const artists = registry
        .filter((artist) => artist?.status !== 'draft')
        .sort((left, right) => (left.order ?? 999) - (right.order ?? 999));

      const selectedSongs = [];
      let sourceOrder = 0;

      for (const artist of artists) {
        const detail = await readJson(join(detailsDir, `${artist.slug}.json`));
        if (detail?.id !== artist.id) {
          throw new Error(`Music detail id mismatch for ${artist.id}.`);
        }

        for (const song of detail.selectedSongs ?? []) {
          selectedSongs.push({
            artistId: artist.id,
            artistSlug: artist.slug,
            artistRoute: artist.route,
            artistNameZh: localized(artist.name, 'zh'),
            artistNameEn: localized(artist.name, 'en'),
            title: String(song?.title ?? '').trim(),
            album: String(song?.album ?? '').trim(),
            note: String(song?.note ?? '').trim(),
            curatedAt: String(song?.curatedAt ?? '').trim(),
            sourceOrder
          });
          sourceOrder += 1;
        }
      }

      return { artists, selectedSongs };
    })();

    return collectionPromise;
  };

  return {
    async getVisibleArtists() {
      return (await loadCollection()).artists;
    },
    async getSelectedSongs() {
      return (await loadCollection()).selectedSongs;
    }
  };
}
