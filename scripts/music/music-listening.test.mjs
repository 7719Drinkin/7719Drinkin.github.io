import test from 'node:test';
import assert from 'node:assert/strict';
import { renderListeningArtist, renderListeningSongRow } from '../build-music-listening-page.mjs';

test('non-profile artists render as plain text without an invented artist URL', () => {
  const html = renderListeningArtist({
    key: 'standalone-artist',
    name: { zh: '无档案歌手', en: 'Standalone Artist' }
  }, null);

  assert.match(html, /listening-artist-name/);
  assert.match(html, /无档案歌手/);
  assert.doesNotMatch(html, /<a /);
  assert.doesNotMatch(html, /\/music\/artists\//);
});

test('profile artists render a real profile link', () => {
  const html = renderListeningArtist({
    key: 'profile-artist',
    name: { zh: '有档案歌手', en: 'Profile Artist' }
  }, { route: '/music/artists/profile-artist/' });

  assert.match(html, /href="\/music\/artists\/profile-artist\/"/);
});

test('standalone song rows remain complete without a profile or album', () => {
  const html = renderListeningSongRow({
    song: {
      id: 'standalone-song',
      title: { zh: '独立歌曲', en: 'Standalone Song' },
      artists: [{
        key: 'standalone-artist',
        name: { zh: '无档案歌手', en: 'Standalone Artist' },
        role: 'primary'
      }],
      albumId: null,
      note: '只收藏这首歌。'
    },
    index: 0,
    album: null,
    artistProfiles: new Map(),
    playable: false
  });

  assert.match(html, /id="standalone-song"/);
  assert.match(html, /仅歌曲收藏/);
  assert.match(html, /SONG ARCHIVE/);
  assert.doesNotMatch(html, /OPEN ARTIST/);
});
