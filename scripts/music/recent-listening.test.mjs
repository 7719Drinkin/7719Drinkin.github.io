import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRecentListening } from './recent-listening-selector.mjs';
import { replaceHtmlRegion } from './html-region-updater.mjs';
import { renderRecentListening } from './recent-listening-renderer.mjs';

test('selectRecentListening sorts by curatedAt and ignores legacy undated rows', () => {
  const result = selectRecentListening([
    { title: 'legacy', curatedAt: '', sourceOrder: 0 },
    { title: 'older', curatedAt: '2026-08-14T13:00:00+08:00', sourceOrder: 1 },
    { title: 'newer', curatedAt: '2026-08-14T14:00:00+08:00', sourceOrder: 2 }
  ], { limit: 3 });

  assert.deepEqual(result.map((item) => item.title), ['newer', 'older']);
});

test('selectRecentListening uses sourceOrder as a deterministic tie breaker', () => {
  const result = selectRecentListening([
    { title: 'second', curatedAt: '2026-08-14T14:00:00+08:00', sourceOrder: 2 },
    { title: 'first', curatedAt: '2026-08-14T14:00:00+08:00', sourceOrder: 1 }
  ], { limit: 2 });

  assert.deepEqual(result.map((item) => item.title), ['first', 'second']);
});

test('selectRecentListening rejects malformed timestamps', () => {
  assert.throws(() => selectRecentListening([
    { title: 'broken', curatedAt: '2026/08/14 14:00', sourceOrder: 0 }
  ]), /Invalid curatedAt/);
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
