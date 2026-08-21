import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRecentListening } from './recent-listening-selector.mjs';
import { presentRecentListening } from './recent-listening-presenter.mjs';
import { replaceHtmlRegion } from './html-region-updater.mjs';
import { renderRecentListening } from './recent-listening-renderer.mjs';

test('selectRecentListening prioritizes dated artists and keeps legacy artist fallbacks', () => {
  const result = selectRecentListening([
    { artistId: 'legacy-artist', title: 'legacy', curatedAt: '', sourceOrder: 0 },
    { artistId: 'older-artist', title: 'older', curatedAt: '2026-08-14T13:00:00+08:00', sourceOrder: 1 },
    { artistId: 'newer-artist', title: 'newer', curatedAt: '2026-08-14T14:00:00+08:00', sourceOrder: 2 }
  ], { limit: 3 });

  assert.deepEqual(result.map((item) => item.title), ['newer', 'older', 'legacy']);
});

test('selectRecentListening keeps only the newest song from each artist', () => {
  const result = selectRecentListening([
    { artistId: 'artist-a', title: 'older-a', curatedAt: '2026-08-14T12:00:00+08:00', sourceOrder: 0 },
    { artistId: 'artist-a', title: 'newer-a', curatedAt: '2026-08-14T14:00:00+08:00', sourceOrder: 1 },
    { artistId: 'artist-b', title: 'artist-b', curatedAt: '2026-08-14T13:00:00+08:00', sourceOrder: 2 }
  ], { limit: 3 });

  assert.deepEqual(result.map((item) => item.title), ['newer-a', 'artist-b']);
});

test('selectRecentListening uses sourceOrder as a deterministic tie breaker across artists', () => {
  const result = selectRecentListening([
    { artistId: 'artist-b', title: 'second', curatedAt: '2026-08-14T14:00:00+08:00', sourceOrder: 2 },
    { artistId: 'artist-a', title: 'first', curatedAt: '2026-08-14T14:00:00+08:00', sourceOrder: 1 }
  ], { limit: 2 });

  assert.deepEqual(result.map((item) => item.title), ['first', 'second']);
});

test('selectRecentListening does not let a legacy row duplicate an already selected dated artist', () => {
  const result = selectRecentListening([
    { artistId: 'artist-a', title: 'dated-a', curatedAt: '2026-08-14T14:00:00+08:00', sourceOrder: 1 },
    { artistId: 'artist-a', title: 'legacy-a', curatedAt: '', sourceOrder: 0 },
    { artistId: 'artist-b', title: 'legacy-b', curatedAt: '', sourceOrder: 2 }
  ], { limit: 3 });

  assert.deepEqual(result.map((item) => item.title), ['dated-a', 'legacy-b']);
});

test('selectRecentListening rejects malformed timestamps', () => {
  assert.throws(() => selectRecentListening([
    { artistId: 'artist-a', title: 'broken', curatedAt: '2026/08/14 14:00', sourceOrder: 0 }
  ]), /Invalid curatedAt/);
});

test('presentRecentListening links standalone songs to the listening archive instead of inventing an artist route', async () => {
  const [item] = await presentRecentListening([{
    songId: 'standalone-song',
    artistId: 'standalone-artist',
    artistRoute: null,
    artistNameZh: '无档案歌手',
    artistNameEn: 'Standalone Artist',
    title: 'Standalone Song',
    note: 'note',
    curatedAt: ''
  }]);

  assert.equal(item.href, '/music/listening/#standalone-song');
  assert.equal(item.artist, 'Standalone Artist');
});

test('replaceHtmlRegion changes only the guarded region', () => {
  const source = '<main>\n  before\n  <!-- START -->\n  old\n  <!-- END -->\n  after\n</main>';
  const output = replaceHtmlRegion(source, {
    startMarker: '<!-- START -->',
    endMarker: '<!-- END -->',
    content: '<p>new</p>'
  });

  assert.equal(output, '<main>\n  before\n  <!-- START -->\n  <p>new</p>\n  <!-- END -->\n  after\n</main>');
});

test('replaceHtmlRegion refuses ambiguous marker pairs', () => {
  assert.throws(() => replaceHtmlRegion('<!-- X --><!-- X --><!-- Y -->', {
    startMarker: '<!-- X -->',
    endMarker: '<!-- Y -->',
    content: 'new'
  }), /exactly one HTML region marker pair/);
});

test('renderRecentListening escapes data without changing the page shell', () => {
  const html = renderRecentListening([{
    index: '01',
    title: '<River>',
    artist: 'Tom & Chang',
    note: 'a > b',
    href: '/music/?a=1&b=2',
    status: 'PLAYABLE'
  }]);

  assert.match(html, /&lt;River&gt;/);
  assert.match(html, /Tom &amp; Chang/);
  assert.match(html, /a &gt; b/);
  assert.match(html, /a=1&amp;b=2/);
});
