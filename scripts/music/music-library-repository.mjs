import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const localized = (value, language = 'zh') => {
  if (typeof value === 'string') return value;
  return value?.[language] ?? value?.zh ?? value?.en ?? '';
};

function indexById(items, label) {
  if (!Array.isArray(items)) throw new Error(`${label} must be an array.`);
  const map = new Map();
  for (const item of items) {
    const id = String(item?.id ?? '').trim();
    if (!id) throw new Error(`${label} contains an entry without id.`);
    if (map.has(id)) throw new Error(`${label} contains duplicate id: ${id}`);
    map.set(id, item);
  }
  return map;
}

export function createMusicLibraryRepository({ root, placeholderArtwork = null }) {
  if (!root) throw new Error('MusicLibraryRepository requires a root path.');

  const paths = {
    artists: join(root, 'data/music/artists.json'),
    songs: join(root, 'data/music/songs.json'),
    albums: join(root, 'data/music/albums.json')
  };

  let libraryPromise = null;

  const loadLibrary = async () => {
    if (libraryPromise) return libraryPromise;

    libraryPromise = (async () => {
      const [artistRegistry, songDocument, albumDocument] = await Promise.all([
        readJson(paths.artists),
        readJson(paths.songs),
        readJson(paths.albums)
      ]);

      if (!Array.isArray(artistRegistry)) {
        throw new Error('data/music/artists.json must contain an array.');
      }
      if (songDocument?.schemaVersion !== 1 || !Array.isArray(songDocument.songs)) {
        throw new Error('data/music/songs.json must use schemaVersion 1 with a songs array.');
      }
      if (albumDocument?.schemaVersion !== 1 || !Array.isArray(albumDocument.albums)) {
        throw new Error('data/music/albums.json must use schemaVersion 1 with an albums array.');
      }

      return {
        artists: artistRegistry,
        songs: songDocument.songs,
        albums: albumDocument.albums,
        artistByKey: indexById(artistRegistry, 'artist registry'),
        songById: indexById(songDocument.songs, 'song library'),
        albumById: indexById(albumDocument.albums, 'album library')
      };
    })();

    return libraryPromise;
  };

  const requireEntity = (map, id, label) => {
    const entity = map.get(id);
    if (!entity) throw new Error(`Unknown ${label} id: ${id}`);
    return entity;
  };

  const resolveSongInput = async (songOrId) => {
    if (typeof songOrId !== 'string') return songOrId;
    const library = await loadLibrary();
    return requireEntity(library.songById, songOrId, 'song');
  };

  const materializeAlbum = async (albumOrId, language = 'zh') => {
    const library = await loadLibrary();
    const album = typeof albumOrId === 'string'
      ? requireEntity(library.albumById, albumOrId, 'album')
      : albumOrId;
    if (!album) return album;
    return {
      ...album,
      title: localized(album.title, language)
    };
  };

  const materializeSong = async (songOrId, language = 'zh') => {
    const library = await loadLibrary();
    const song = typeof songOrId === 'string'
      ? requireEntity(library.songById, songOrId, 'song')
      : songOrId;
    if (!song) return song;
    const album = song.albumId ? library.albumById.get(song.albumId) ?? null : null;
    return {
      ...song,
      title: localized(song.title, language),
      album: album ? localized(album.title, language) : '',
      year: song.year ?? song.releaseDate ?? null
    };
  };

  const hydrateArtistDetail = async (detail, language = 'zh') => ({
    ...detail,
    selectedSongs: await Promise.all((detail?.selectedSongs ?? []).map((song) => materializeSong(song, language))),
    albums: await Promise.all((detail?.albums ?? []).map((album) => materializeAlbum(album, language)))
  });

  return {
    async getAllSongs() {
      return (await loadLibrary()).songs;
    },

    async getAllAlbums() {
      return (await loadLibrary()).albums;
    },

    async getSong(id) {
      return requireEntity((await loadLibrary()).songById, id, 'song');
    },

    async getSongs(ids = []) {
      const library = await loadLibrary();
      return ids.map((id) => requireEntity(library.songById, id, 'song'));
    },

    async getAlbum(id) {
      return requireEntity((await loadLibrary()).albumById, id, 'album');
    },

    async getAlbums(ids = []) {
      const library = await loadLibrary();
      return ids.map((id) => requireEntity(library.albumById, id, 'album'));
    },

    async materializeSong(songOrId, language = 'zh') {
      return materializeSong(songOrId, language);
    },

    async materializeAlbum(albumOrId, language = 'zh') {
      return materializeAlbum(albumOrId, language);
    },

    async hydrateArtistDetail(detail, language = 'zh') {
      return hydrateArtistDetail(detail, language);
    },

    async getArtistProfile(artistKey) {
      return (await loadLibrary()).artistByKey.get(artistKey) ?? null;
    },

    async resolveArtistReference(artistReference, language = 'zh') {
      if (!artistReference) return null;
      const key = String(artistReference.key ?? '').trim();
      const profile = key ? (await loadLibrary()).artistByKey.get(key) ?? null : null;
      return {
        key,
        name: localized(artistReference.name, language),
        profile,
        href: profile?.route ?? null
      };
    },

    async resolveSongArtwork(songOrId) {
      const song = await resolveSongInput(songOrId);
      if (!song) return placeholderArtwork;
      if (song.artwork) return song.artwork;

      if (song.albumId) {
        const album = (await loadLibrary()).albumById.get(song.albumId);
        if (album?.cover) return album.cover;
      }

      const primaryArtist = song.artists?.find((artist) => artist?.role === 'primary')
        ?? song.artists?.[0];
      if (primaryArtist?.key) {
        const profile = (await loadLibrary()).artistByKey.get(primaryArtist.key);
        if (profile?.cover) return profile.cover;
      }

      return placeholderArtwork;
    }
  };
}
