import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRuntimePlayabilityResolver } from './runtime-playability-resolver.mjs';

const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

test('runtime catalog resolves by artist identity key without requiring a profile page', async () => {
  const root = await mkdtemp(join(tmpdir(), 'music-runtime-key-'));
  try {
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
        tracks: [{ title: '测试歌曲', src: 'https://example.test/song.mp3' }]
      }]
    });

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
