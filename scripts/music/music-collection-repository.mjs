import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createMusicLibraryRepository } from './music-library-repository.mjs';

const localized = (value, language = 'zh') => {
  if (typeof value === 'string') return value;
  return value?.[language] ?? value?.zh ?? value?.en ?? '';
};

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const primaryArtist = (song) => (
  song?.artists?.find((artist) => artist?.role === 'primary')
  ?? song?.artists?.[0]
  ?? null
);

export function createMusicCollectionRepository({ root }) {
  if (!root) throw new Error('MusicCollectionRepository requires a root path.');

  const library = createMusicLibraryRepository({ root });
  const registryPath = join(root, 'data/music/artists.json');
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
      const songs = await library.getAllSongs();
      const selectedSongs = [];

      for (const [sourceOrder, song] of songs.entries()) {
        const artistReference = primaryArtist(song);
        if (!artistReference?.key) {
          throw new Error(`Music song ${song?.id ?? 'unknown'} must define a primary artist key.`);
        }

        const [profile, album] = await Promise.all([
          library.getArtistProfile(artistReference.key),
          song.albumId ? library.getAlbum(song.albumId) : Promise.resolve(null)
        ]);

        selectedSongs.push({
          songId: String(song.id ?? '').trim(),
          artistId: artistReference.key,
          artistSlug: profile?.slug ?? null,
          artistRoute: profile?.route ?? null,
          artistNameZh: localized(artistReference.name, 'zh'),
          artistNameEn: localized(artistReference.name, 'en'),
          title: localized(song.title, 'zh'),
          album: album ? localized(album.title, 'zh') : '',
          albumId: song.albumId ?? null,
          note: String(song?.note ?? '').trim(),
          curatedAt: String(song?.curatedAt ?? '').trim(),
          sourceOrder
        });
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
