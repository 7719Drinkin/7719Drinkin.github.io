import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  createRuntimePlayabilityResolver,
  createRuntimeTrackResolver
} from './runtime-playability-resolver.mjs';

const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

const createFixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'music-runtime-key-'));
  await mkdir(join(root, 'data/music/runtime'), { recursive: true });
  await writeJson(join(root, 'data/music/catalog.json'), {
    artists: {
      'metadata-only-artist': { prefix: 'metadata-only-prefix' }
    }
  });
  await writeJson(join(root, 'data/music/runtime/metadata-only-prefix.json'), {
    artistPrefix: 'metadata-only-prefix',
    albums: [{
      name: '测试专辑',
      tracks: [
        {
          title: '测试歌曲',
          fileName: '01 - 测试歌曲.mp3',
          src: 'https://example.test/song.mp3',
          type: 'audio/mpeg'
        },
        {
          title: '講不出再見',
          fileName: '02 - 講不出再見.mp3',
          src: 'https://example.test/goodbye.mp3'
        }
      ]
    }]
  });
  return root;
};

test('runtime track resolver returns the matched runtime track by artist identity key', async () => {
  const root = await createFixture();
  try {
    const resolveRuntimeTrack = createRuntimeTrackResolver({ root });
    const match = await resolveRuntimeTrack({
      artistKey: 'metadata-only-artist',
      title: '测试歌曲',
      album: '测试专辑'
    });

    assert.equal(match?.prefix, 'metadata-only-prefix');
    assert.equal(match?.album?.name, '测试专辑');
    assert.equal(match?.track?.src, 'https://example.test/song.mp3');
    assert.equal(match?.track?.type, 'audio/mpeg');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runtime track resolver keeps traditional and simplified title matching compatible', async () => {
  const root = await createFixture();
  try {
    const resolveRuntimeTrack = createRuntimeTrackResolver({ root });
    const match = await resolveRuntimeTrack({
      artistKey: 'metadata-only-artist',
      title: '讲不出再见',
      album: '测试专辑'
    });

    assert.equal(match?.track?.title, '講不出再見');
    assert.equal(match?.track?.src, 'https://example.test/goodbye.mp3');
    assert.equal(match?.track?.type, 'audio/mpeg');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runtime track resolver returns null for unknown artists and tracks', async () => {
  const root = await createFixture();
  try {
    const resolveRuntimeTrack = createRuntimeTrackResolver({ root });
    assert.equal(await resolveRuntimeTrack({
      artistKey: 'other-artist',
      title: '测试歌曲',
      album: '测试专辑'
    }), null);
    assert.equal(await resolveRuntimeTrack({
      artistKey: 'metadata-only-artist',
      title: '不存在的歌曲',
      album: '测试专辑'
    }), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runtime playability resolver preserves the legacy boolean API', async () => {
  const root = await createFixture();
  try {
    const resolvePlayable = createRuntimePlayabilityResolver({ root });
    assert.equal(await resolvePlayable({
      artistKey: 'metadata-only-artist',
      title: '测试歌曲',
      album: '测试专辑'
    }), true);
    assert.equal(await resolvePlayable({
      artistKey: 'other-artist',
      title: '测试歌曲',
      album: '测试专辑'
    }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
