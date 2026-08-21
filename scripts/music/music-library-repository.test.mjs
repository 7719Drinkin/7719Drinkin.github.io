import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createMusicLibraryRepository } from './music-library-repository.mjs';
import { validateMusicLibrary } from '../validate-music-library.mjs';

const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'music-library-'));
  await mkdir(join(root, 'data/music/artists'), { recursive: true });
  await mkdir(join(root, 'assets/Music/Artists/ZhangGuorong/hero'), { recursive: true });
  await mkdir(join(root, 'assets/Music/Albums/zhang-guorong'), { recursive: true });
  await mkdir(join(root, 'assets/Music/Songs/standalone-song'), { recursive: true });

  await writeFile(join(root, 'assets/Music/Artists/ZhangGuorong/hero/cover.jpg'), 'x');
  await writeFile(join(root, 'assets/Music/Albums/zhang-guorong/album-one.jpg'), 'x');
  await writeFile(join(root, 'assets/Music/Songs/standalone-song/artwork.jpg'), 'x');

  await writeJson(join(root, 'data/music/artists.json'), [
    {
      id: 'zhang-guorong',
      slug: 'zhang-guorong',
      route: '/music/artists/zhang-guorong/',
      status: 'published',
      cover: '/assets/Music/Artists/ZhangGuorong/hero/cover.jpg'
    }
  ]);

  await writeJson(join(root, 'data/music/albums.json'), {
    schemaVersion: 1,
    albums: [
      {
        id: 'zhang-guorong--album-one',
        title: { zh: '专辑一' },
        artists: [{ key: 'zhang-guorong', name: { zh: '张国荣' } }],
        cover: '/assets/Music/Albums/zhang-guorong/album-one.jpg',
        detail: { enabled: true }
      }
    ]
  });

  await writeJson(join(root, 'data/music/songs.json'), {
    schemaVersion: 1,
    songs: [
      {
        id: 'zhang-guorong--song-one',
        title: { zh: '歌曲一' },
        artists: [{ key: 'zhang-guorong', name: { zh: '张国荣' }, role: 'primary' }],
        albumId: 'zhang-guorong--album-one',
        artwork: null
      },
      {
        id: 'standalone-song',
        title: { zh: '独立歌曲' },
        artists: [{ key: 'artist-without-profile', name: { zh: '无档案歌手' }, role: 'primary' }],
        albumId: null,
        artwork: '/assets/Music/Songs/standalone-song/artwork.jpg'
      }
    ]
  });

  await writeJson(join(root, 'data/music/artists/zhang-guorong.json'), {
    id: 'zhang-guorong',
    selectedSongs: ['zhang-guorong--song-one'],
    albums: ['zhang-guorong--album-one']
  });

  return root;
}

test('repository resolves profile links without requiring every artist to have a profile', async () => {
  const root = await createFixture();
  const repository = createMusicLibraryRepository({ root, placeholderArtwork: '/placeholder.svg' });

  const linked = await repository.resolveArtistReference({
    key: 'zhang-guorong',
    name: { zh: '张国荣', en: 'Leslie Cheung' }
  });
  assert.equal(linked.href, '/music/artists/zhang-guorong/');

  const unlinked = await repository.resolveArtistReference({
    key: 'artist-without-profile',
    name: { zh: '无档案歌手' }
  });
  assert.equal(unlinked.href, null);
  assert.equal(unlinked.name, '无档案歌手');
});

test('song artwork follows song -> album -> artist -> placeholder precedence', async () => {
  const root = await createFixture();
  const repository = createMusicLibraryRepository({ root, placeholderArtwork: '/placeholder.svg' });

  assert.equal(
    await repository.resolveSongArtwork('standalone-song'),
    '/assets/Music/Songs/standalone-song/artwork.jpg'
  );
  assert.equal(
    await repository.resolveSongArtwork('zhang-guorong--song-one'),
    '/assets/Music/Albums/zhang-guorong/album-one.jpg'
  );
});

test('validator accepts canonical references and rejects unknown album references', async () => {
  const root = await createFixture();
  const valid = await validateMusicLibrary({ root });
  assert.deepEqual(valid.errors, []);

  const songsPath = join(root, 'data/music/songs.json');
  const document = JSON.parse(await readFile(songsPath, 'utf8'));
  document.songs[0].albumId = 'missing-album';
  await writeJson(songsPath, document);

  const invalid = await validateMusicLibrary({ root });
  assert.ok(invalid.errors.some((error) => error.includes('unknown albumId: missing-album')));
});

test('artist detail hydration resolves canonical ids and rejects legacy inline objects', async () => {
  const root = await createFixture();
  const repository = createMusicLibraryRepository({ root });
  const detail = JSON.parse(await readFile(join(root, 'data/music/artists/zhang-guorong.json'), 'utf8'));
  const hydrated = await repository.hydrateArtistDetail(detail);

  assert.equal(hydrated.selectedSongs[0].title, '歌曲一');
  assert.equal(hydrated.selectedSongs[0].album, '专辑一');
  assert.equal(hydrated.albums[0].title, '专辑一');
  assert.equal(hydrated.albums[0].slug, undefined);

  await assert.rejects(
    repository.hydrateArtistDetail({ ...detail, selectedSongs: [{ id: 'zhang-guorong--song-one' }] }),
    /song reference must be a canonical id reference/
  );
  await assert.rejects(
    repository.hydrateArtistDetail({ ...detail, albums: [{ id: 'zhang-guorong--album-one' }] }),
    /album reference must be a canonical id reference/
  );
});
