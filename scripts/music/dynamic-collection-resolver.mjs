const ISO_WITH_TIMEZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

const bySourceOrder = (left, right) => (
  Number(left?.sourceOrder ?? 0) - Number(right?.sourceOrder ?? 0)
);

export function validateDynamicCollectionSource(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new TypeError('Dynamic collection source must be an object.');
  }

  const field = String(source.field ?? '').trim();
  const order = String(source.order ?? '').trim();
  const distinctBy = String(source.distinctBy ?? '').trim();
  const limit = Number(source.limit);
  const legacyFallback = source.legacyFallback === true;

  if (field !== 'curatedAt') {
    throw new Error(`Unsupported dynamic collection field: ${field || '(empty)'}`);
  }
  if (order !== 'desc') {
    throw new Error(`Unsupported dynamic collection order: ${order || '(empty)'}`);
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('Dynamic collection source limit must be a positive integer.');
  }
  if (distinctBy !== 'primaryArtist') {
    throw new Error(`Unsupported dynamic collection distinctBy: ${distinctBy || '(empty)'}`);
  }
  if (typeof source.legacyFallback !== 'boolean') {
    throw new TypeError('Dynamic collection source legacyFallback must be boolean.');
  }

  return { field, order, limit, distinctBy, legacyFallback };
}

export function dynamicCollectionTimestamp(entry, field = 'curatedAt') {
  const value = String(entry?.[field] ?? '').trim();
  if (!value) return null;
  if (!ISO_WITH_TIMEZONE.test(value)) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

const distinctKey = (entry, strategy) => {
  if (strategy === 'primaryArtist') return String(entry?.artistKey ?? '').trim();
  return '';
};

export function resolveDynamicCollection(entries, source) {
  if (!Array.isArray(entries)) {
    throw new TypeError('Dynamic collection resolver expects an array.');
  }

  const config = validateDynamicCollectionSource(source);
  const dated = [];
  const legacy = [];

  for (const entry of entries) {
    const timestamp = dynamicCollectionTimestamp(entry, config.field);
    if (timestamp === null) {
      if (config.legacyFallback) legacy.push(entry);
      continue;
    }
    if (!Number.isFinite(timestamp)) {
      throw new Error(`Invalid ${config.field} for ${entry?.artistKey ?? 'unknown artist'} / ${entry?.title ?? entry?.songId ?? 'unknown song'}: ${entry?.[config.field]}`);
    }
    dated.push({ entry, timestamp });
  }

  dated.sort((left, right) => {
    const timeOrder = right.timestamp - left.timestamp;
    return timeOrder || bySourceOrder(left.entry, right.entry);
  });
  legacy.sort(bySourceOrder);

  const ordered = [
    ...dated.map(({ entry }) => entry),
    ...legacy
  ];
  const seen = new Set();
  const resolved = [];

  for (const entry of ordered) {
    const key = distinctKey(entry, config.distinctBy);
    if (!key) {
      throw new Error(`Dynamic collection requires ${config.distinctBy} identity for ${entry?.title ?? entry?.songId ?? 'unknown song'}.`);
    }
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push(entry);
    if (resolved.length >= config.limit) break;
  }

  return resolved;
}
