import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDynamicCollection, validateDynamicCollectionSource } from './dynamic-collection-resolver.mjs';
import { selectRecentListening } from './recent-listening-selector.mjs';

const RECENT_SOURCE = {
  field: 'curatedAt',
  order: 'desc',
  limit: 3,
  distinctBy: 'primaryArtist',
  legacyFallback: true
};

test('dynamic Recently Curated resolver preserves the current Recent Listening selection contract', () => {
  const entries = [
    { songId: 'dated-a-1', artistKey: 'artist-a', title: 'dated a first', curatedAt: '2026-08-14T14:00:00+08:00', sourceOrder: 0 },
    { songId: 'dated-a-2', artistKey: 'artist-a', title: 'dated a second', curatedAt: '2026-08-14T14:00:00+08:00', sourceOrder: 1 },
    { songId: 'legacy-b-1', artistKey: 'artist-b', title: 'legacy b first', curatedAt: '', sourceOrder: 2 },
    { songId: 'legacy-b-2', artistKey: 'artist-b', title: 'legacy b second', curatedAt: '', sourceOrder: 3 },
    { songId: 'legacy-c', artistKey: 'artist-c', title: 'legacy c', curatedAt: '', sourceOrder: 4 }
  ];

  const oldResult = selectRecentListening(entries, { limit: RECENT_SOURCE.limit });
  const newResult = resolveDynamicCollection(entries, RECENT_SOURCE);
  assert.deepEqual(
    newResult.map((entry) => entry.songId),
    oldResult.map((entry) => entry.songId)
  );
});

test('dynamic resolver keeps source order as deterministic timestamp tie breaker', () => {
  const result = resolveDynamicCollection([
    { songId: 'second', artistKey: 'artist-b', title: 'second', curatedAt: '2026-08-14T14:00:00+08:00', sourceOrder: 2 },
    { songId: 'first', artistKey: 'artist-a', title: 'first', curatedAt: '2026-08-14T14:00:00+08:00', sourceOrder: 1 }
  ], { ...RECENT_SOURCE, limit: 2 });
  assert.deepEqual(result.map((entry) => entry.songId), ['first', 'second']);
});

test('dynamic resolver rejects malformed timestamps', () => {
  assert.throws(() => resolveDynamicCollection([
    { songId: 'broken', artistKey: 'artist-a', title: 'broken', curatedAt: '2026/08/14 14:00', sourceOrder: 0 }
  ], RECENT_SOURCE), /Invalid curatedAt/);
});

test('dynamic source validation rejects unsupported query semantics', () => {
  assert.throws(() => validateDynamicCollectionSource({ ...RECENT_SOURCE, field: 'addedAt' }), /Unsupported dynamic collection field/);
  assert.throws(() => validateDynamicCollectionSource({ ...RECENT_SOURCE, distinctBy: 'song' }), /Unsupported dynamic collection distinctBy/);
  assert.throws(() => validateDynamicCollectionSource({ ...RECENT_SOURCE, limit: 0 }), /positive integer/);
});
