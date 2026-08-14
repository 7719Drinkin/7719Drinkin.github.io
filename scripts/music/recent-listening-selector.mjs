const ISO_WITH_TIMEZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

export const curatedTimestamp = (entry) => {
  const value = String(entry?.curatedAt ?? '').trim();
  if (!value) return null;
  if (!ISO_WITH_TIMEZONE.test(value)) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export const byCuratedAtDescending = (left, right) => {
  const leftTime = curatedTimestamp(left);
  const rightTime = curatedTimestamp(right);
  return rightTime - leftTime;
};

const bySourceOrder = (left, right) => (
  Number(left?.sourceOrder ?? 0) - Number(right?.sourceOrder ?? 0)
);

const sortDatedEntries = (entries, compare) => entries
  .slice()
  .sort((left, right) => {
    const strategyResult = compare(left, right);
    if (strategyResult) return strategyResult;
    return bySourceOrder(left, right);
  });

export function selectRecentListening(entries, {
  limit = 3,
  compare = byCuratedAtDescending,
  distinctBy = (entry) => entry?.artistId
} = {}) {
  if (!Array.isArray(entries)) {
    throw new TypeError('RecentListeningSelector expects an array.');
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('RecentListeningSelector limit must be a positive integer.');
  }
  if (typeof compare !== 'function') {
    throw new TypeError('RecentListeningSelector compare strategy must be a function.');
  }
  if (typeof distinctBy !== 'function') {
    throw new TypeError('RecentListeningSelector distinctBy strategy must be a function.');
  }

  const dated = [];
  const legacy = [];

  for (const entry of entries) {
    const timestamp = curatedTimestamp(entry);
    if (timestamp === null) {
      legacy.push(entry);
      continue;
    }
    if (!Number.isFinite(timestamp)) {
      throw new Error(`Invalid curatedAt for ${entry?.artistId ?? 'unknown artist'} / ${entry?.title ?? 'unknown song'}: ${entry?.curatedAt}`);
    }
    dated.push(entry);
  }

  // Recent Listening is artist-diverse by design. Dated entries are ranked first;
  // legacy undated artists remain eligible as a migration fallback so one newly
  // timestamped artist cannot monopolize the homepage while older curation data
  // is being backfilled.
  const ordered = [
    ...sortDatedEntries(dated, compare),
    ...legacy.slice().sort(bySourceOrder)
  ];

  const seenKeys = new Set();
  const selected = [];

  for (const entry of ordered) {
    const key = String(distinctBy(entry) ?? '').trim();
    if (!key) {
      throw new Error(`RecentListeningSelector requires a distinct key for ${entry?.title ?? 'unknown song'}.`);
    }
    if (seenKeys.has(key)) continue;

    seenKeys.add(key);
    selected.push(entry);
    if (selected.length >= limit) break;
  }

  return selected;
}
