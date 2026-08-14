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

export function selectRecentListening(entries, {
  limit = 3,
  compare = byCuratedAtDescending
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

  const eligible = [];

  for (const entry of entries) {
    const timestamp = curatedTimestamp(entry);
    if (timestamp === null) continue;
    if (!Number.isFinite(timestamp)) {
      throw new Error(`Invalid curatedAt for ${entry?.artistId ?? 'unknown artist'} / ${entry?.title ?? 'unknown song'}: ${entry?.curatedAt}`);
    }
    eligible.push(entry);
  }

  return eligible
    .slice()
    .sort((left, right) => {
      const strategyResult = compare(left, right);
      if (strategyResult) return strategyResult;
      return Number(left.sourceOrder ?? 0) - Number(right.sourceOrder ?? 0);
    })
    .slice(0, limit);
}
