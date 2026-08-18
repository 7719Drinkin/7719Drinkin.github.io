import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await readFile(join(ROOT, 'data/anime/catalog.json'), 'utf8'));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(catalog.schemaVersion === 1, 'Anime catalog schemaVersion must be 1.');
assert(Array.isArray(catalog.series), 'Anime catalog series must be an array.');
assert(catalog.featured && typeof catalog.featured === 'object', 'Anime catalog featured must be an object.');
assert(Array.isArray(catalog.recent), 'Anime catalog recent must be an array.');

const seriesIds = new Set();
const seriesSlugs = new Set();
const seriesById = new Map();

for (const series of catalog.series) {
  assert(series && typeof series === 'object', 'Every anime series entry must be an object.');
  assert(series.id, 'Anime series is missing id.');
  assert(series.slug, `Anime series ${series.id} is missing slug.`);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(series.slug), `Anime series has invalid slug: ${series.slug}`);
  assert(!seriesIds.has(series.id), `Duplicate anime series id: ${series.id}`);
  assert(!seriesSlugs.has(series.slug), `Duplicate anime series slug: ${series.slug}`);

  seriesIds.add(series.id);
  seriesSlugs.add(series.slug);
  seriesById.set(series.id, series);
  seriesById.set(series.slug, series);

  if (series.route) {
    assert(series.route === `/anime/${series.slug}/`, `Anime series route must stay series-first: ${series.id}`);
  }

  for (const field of ['releases', 'characters', 'scenes', 'music', 'videos', 'visuals']) {
    if (series[field] !== undefined) {
      assert(Array.isArray(series[field]), `${series.id}.${field} must be an array.`);
    }
  }

  for (const field of ['characters', 'scenes', 'music']) {
    const ids = new Set();
    for (const item of series[field] || []) {
      assert(item?.id, `${series.id}.${field} contains an item without id.`);
      assert(!ids.has(item.id), `Duplicate ${field} id inside ${series.id}: ${item.id}`);
      ids.add(item.id);
    }
  }
}

const parseRef = (reference) => {
  if (typeof reference === 'string') {
    const [seriesId, itemId] = reference.split(':');
    return { seriesId, itemId };
  }
  return {
    seriesId: reference?.seriesId ?? reference?.series,
    itemId: reference?.itemId ?? reference?.id
  };
};

for (const seriesRef of catalog.featured.series || []) {
  assert(seriesById.has(seriesRef), `Featured anime series does not exist: ${seriesRef}`);
}

for (const [featuredField, seriesField] of [
  ['characters', 'characters'],
  ['scenes', 'scenes'],
  ['sounds', 'music']
]) {
  assert(Array.isArray(catalog.featured[featuredField] || []), `featured.${featuredField} must be an array.`);
  for (const reference of catalog.featured[featuredField] || []) {
    const { seriesId, itemId } = parseRef(reference);
    const series = seriesById.get(seriesId);
    assert(series, `Featured ${featuredField} reference has unknown series: ${seriesId}`);
    assert((series[seriesField] || []).some((item) => item.id === itemId || item.slug === itemId), `Featured ${featuredField} item does not exist: ${seriesId}:${itemId}`);
  }
}

for (const entry of catalog.recent) {
  const seriesId = entry?.seriesId ?? entry?.series;
  assert(seriesById.has(seriesId), `Recent anime entry has unknown series: ${seriesId}`);
}

console.log(`Anime catalog validated: ${catalog.series.length} series.`);
