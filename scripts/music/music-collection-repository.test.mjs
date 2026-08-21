import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createMusicCollectionRepository } from './music-collection-repository.mjs';

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'music-collection-'));
  const dataRoot = join(root, 'data/music');
  await mkdir(dataRoot, { recursive: true });
  await writeFile(join(dataRoot, 'artists.json'), JSON.stringify([
    {
      id: 'profile-artist',
      slug: 'profile-artist',
      route: '/music/artists/profile-artist/',
      status: 'published',
      order: 1,
      name: { zh: '有档案歌手', en: 'Profile Artist' }
    },
    {
      id: 'empty-profile',
      slug: 'empty-profile',
      route: '/music/artists/empty-profile/',
      status: 'published',
      order: 2,
      name: { zh: '空档案歌手', en: 'Empty Profile' }
    }
  ]));
  await writeFile(join(dataRoot, 'albums.json'), JSON.stringify({
    schemaVersion: 1,
    albums: [{ id: 'album-a', title: 'Album A', cover: '/album-a.jpg' }]
  }));
  await writeFile(join(dataRoot, 'songs.json'), JSON.stringify({
    schemaVersion: 1,
    songs: [
      {
        id: 'profile-song',
        title: 'Profile Song',
        artists: [{ key: 'profile-artist', name: { zh: '有档案歌手', en: 'Profile Artist' }, role: 'primary' }],
        albumId: 'album-a',
        note: 'profile note',
        curatedAt: '2026-08-20T10:00:00+08:00'
      },
      {
        id: 'standalone-song',
        title: 'Standalone Song',
        artists: [{ key: 'standalone-artist', name: { zh: '无档案歌手', en: 'Standalone Artist' }, role: 'primary' }],
        albumId: null,
        note: 'standalone note'
      }
    ]
  }));
  return root;
}

test('global collection includes songs whose artists have no profile page', async () => {
  const root = await createFixture();
  try {
    const repository = createMusicCollectionRepository({ root });
    const songs = await repository.getSelectedSongs();
    assert.equal(songs.length, 2);
    assert.deepEqual(songs.map((song) => song.songId), ['profile-song', 'standalone-song']);
    assert.equal(songs[0].artistKey, 'profile-artist');
    assert.equal(songs[0].artistRoute, '/music/artists/profile-artist/');
    assert.equal(songs[0].album, 'Album A');
    assert.equal(songs[1].artistKey, 'standalone-artist');
    assert.equal(songs[1].artistRoute, null);
    assert.equal(songs[1].artistSlug, null);
    assert.equal(songs[1].artistNameZh, '无档案歌手');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('visible artist registry remains independent from song ownership', async () => {
  const root = await createFixture();
  try {
    const repository = createMusicCollectionRepository({ root });
    const artists = await repository.getVisibleArtists();
    assert.deepEqual(artists.map((artist) => artist.id), ['profile-artist', 'empty-profile']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
