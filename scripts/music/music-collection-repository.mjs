import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createMusicLibraryRepository } from './music-library-repository.mjs';
import { resolveDynamicCollection } from './dynamic-collection-resolver.mjs';

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
  const artistRegistryPath = join(root, 'data/music/artists.json');
  const collectionRegistryPath = join(root, 'data/music/collections.json');
  const collectionDetailRoot = join(root, 'data/music/collections');
  let collectionPromise = null;
  let collectionRegistryPromise = null;
  const detailPromises = new Map();

  const loadCollection = async () => {
    if (collectionPromise) return collectionPromise;

    collectionPromise = (async () => {
      const registry = await readJson(artistRegistryPath);
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
          artistKey: artistReference.key,
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

  const loadCollectionRegistry = async () => {
    if (collectionRegistryPromise) return collectionRegistryPromise;

    collectionRegistryPromise = (async () => {
      const document = await readJson(collectionRegistryPath);
      if (document?.schemaVersion !== 1 || !Array.isArray(document.collections)) {
        throw new Error('data/music/collections.json must use schemaVersion 1 with a collections array.');
      }

      const byId = new Map();
      for (const entry of document.collections) {
        const id = String(entry?.id ?? '').trim();
        if (!id) throw new Error('Music collection registry contains an entry without id.');
        if (byId.has(id)) throw new Error(`Music collection registry contains duplicate id: ${id}`);
        byId.set(id, entry);
      }

      return { collections: document.collections, byId };
    })();

    return collectionRegistryPromise;
  };

  const loadCollectionDetail = async (collectionId) => {
    const id = String(collectionId ?? '').trim();
    if (!id) throw new Error('Music collection id is required.');
    if (!detailPromises.has(id)) {
      detailPromises.set(id, readJson(join(collectionDetailRoot, `${id}.json`)));
    }
    return detailPromises.get(id);
  };

  const getCollection = async (collectionId) => {
    const id = String(collectionId ?? '').trim();
    const registry = await loadCollectionRegistry();
    const entry = registry.byId.get(id);
    if (!entry) throw new Error(`Unknown music collection id: ${id}`);
    const detail = await loadCollectionDetail(id);
    if (detail?.id !== id) {
      throw new Error(`Music collection detail id mismatch for ${id}.`);
    }
    return { ...detail, ...entry };
  };

  return {
    async getVisibleArtists() {
      return (await loadCollection()).artists;
    },

    async getSelectedSongs() {
      return (await loadCollection()).selectedSongs;
    },

    async getVisibleCollections() {
      return (await loadCollectionRegistry()).collections
        .filter((collection) => collection?.status !== 'draft')
        .sort((left, right) => (left.order ?? 999) - (right.order ?? 999));
    },

    async getCollection(collectionId) {
      return getCollection(collectionId);
    },

    async resolveCollectionSongs(collectionId) {
      const collection = await getCollection(collectionId);
      const selectedSongs = (await loadCollection()).selectedSongs;

      if (collection.type === 'dynamic') {
        return resolveDynamicCollection(selectedSongs, collection.source);
      }

      if (collection.type === 'editorial') {
        if (!Array.isArray(collection.songs)) {
          throw new Error(`Editorial collection ${collection.id} must define a songs array.`);
        }
        const bySongId = new Map(selectedSongs.map((song) => [song.songId, song]));
        return collection.songs.map((songId) => {
          const song = bySongId.get(songId);
          if (!song) throw new Error(`Editorial collection ${collection.id} references unknown song id: ${songId}`);
          return song;
        });
      }

      throw new Error(`Unsupported music collection type: ${collection.type}`);
    }
  };
}
