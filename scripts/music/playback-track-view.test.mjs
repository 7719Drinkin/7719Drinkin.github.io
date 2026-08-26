import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaybackTrackView } from './playback-track-view.mjs';

const song = {
  id: 'song-river',
  title: { zh: '河', en: 'River' }
};

const album = {
  title: { zh: '口是心非', en: 'Duplicity' }
};

const primary = {
  key: 'tom-chang',
  name: { zh: '张雨生', en: 'Tom Chang' }
};

test('playback track view combines library metadata with runtime playback data', () => {
  const view = createPlaybackTrackView({
    song,
    album,
    artwork: '/assets/river.jpg',
    primary,
    runtimeMatch: {
      album: { name: '口是心非' },
      track: {
        title: '河',
        src: 'https://example.test/river.mp3',
        type: 'audio/mpeg',
        key: 'tom-chang/口是心非/河.mp3',
        fileName: '河.mp3'
      }
    }
  });

  assert.deepEqual(view, {
    id: 'song-river',
    title: '河',
    artist: '张雨生',
    album: '口是心非',
    artwork: '/assets/river.jpg',
    playback: {
      src: 'https://example.test/river.mp3',
      type: 'audio/mpeg',
      key: 'tom-chang/口是心非/河.mp3',
      fileName: '河.mp3'
    }
  });
});

test('playback track view keeps archive entries visible without inventing playback', () => {
  const view = createPlaybackTrackView({ song, album, primary, runtimeMatch: null });

  assert.equal(view.title, '河');
  assert.equal(view.artist, '张雨生');
  assert.equal(view.album, '口是心非');
  assert.equal(view.playback, null);
});

test('playback track view can render alternate localized labels without changing playback identity', () => {
  const view = createPlaybackTrackView({
    song,
    album,
    primary,
    language: 'en',
    runtimeMatch: {
      album: { name: '口是心非' },
      track: { src: 'https://example.test/river.mp3' }
    }
  });

  assert.equal(view.title, 'River');
  assert.equal(view.artist, 'Tom Chang');
  assert.equal(view.album, 'Duplicity');
  assert.equal(view.playback?.src, 'https://example.test/river.mp3');
  assert.equal(view.playback?.type, 'audio/mpeg');
});
