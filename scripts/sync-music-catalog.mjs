import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = join(ROOT, 'data/music/catalog.json');
const DEFAULT_RUNTIME_ROOT = join(ROOT, 'data/music/runtime');
const REFRESH_TOKEN = String(process.env.MUSIC_CATALOG_REFRESH_TOKEN || '').trim();
const ALLOW_EMPTY = /^(?:1|true|yes)$/i.test(String(process.env.MUSIC_CATALOG_ALLOW_EMPTY || ''));
const REQUEST_TIMEOUT_MS = positiveInteger(process.env.MUSIC_CATALOG_REQUEST_TIMEOUT_MS, 20_000);
const REQUESTED_PREFIXES = new Set(
  String(process.env.MUSIC_CATALOG_ARTISTS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function snapshotDirectory(config) {
  const base = String(config.snapshotBase || '/data/music/runtime').trim();
  const relative = base.replace(/^\/+/, '').replace(/\/+$/, '');
  return relative ? join(ROOT, relative) : DEFAULT_RUNTIME_ROOT;
}

function snapshotPath(runtimeRoot, prefix) {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(prefix)) {
    throw new Error(`Unsafe artist prefix: ${prefix}`);
  }
  return join(runtimeRoot, `${prefix}.json`);
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${options.method || 'GET'} ${url} returned non-JSON data (${response.status}).`);
  }

  if (!response.ok) {
    const detail = payload?.error || payload?.message || response.statusText;
    throw new Error(`${options.method || 'GET'} ${url} failed (${response.status}): ${detail}`);
  }

  return payload;
}

function validateCatalog(catalog, expectedPrefix) {
  if (!catalog || typeof catalog !== 'object') {
    throw new Error(`${expectedPrefix}: catalog is not an object.`);
  }
  if (Number(catalog.version) < 2) {
    throw new Error(`${expectedPrefix}: unsupported catalog version ${catalog.version}.`);
  }
  if (catalog.artistPrefix !== expectedPrefix) {
    throw new Error(`${expectedPrefix}: Worker returned artistPrefix=${catalog.artistPrefix}.`);
  }
  if (!Array.isArray(catalog.albums)) {
    throw new Error(`${expectedPrefix}: albums is not an array.`);
  }

  let computedTracks = 0;
  for (const album of catalog.albums) {
    if (!album || typeof album.name !== 'string' || !album.name.trim()) {
      throw new Error(`${expectedPrefix}: catalog contains an album without a valid name.`);
    }
    if (!Array.isArray(album.tracks)) {
      throw new Error(`${expectedPrefix}/${album.name}: tracks is not an array.`);
    }

    for (const track of album.tracks) {
      if (!track?.src || !/^https:\/\//i.test(String(track.src))) {
        throw new Error(`${expectedPrefix}/${album.name}: track is missing an HTTPS src.`);
      }
      if (!track?.title && !track?.fileName) {
        throw new Error(`${expectedPrefix}/${album.name}: track is missing both title and fileName.`);
      }
      computedTracks += 1;
    }
  }

  const declaredTracks = Number(catalog.totalTracks);
  if (!Number.isInteger(declaredTracks) || declaredTracks < 0) {
    throw new Error(`${expectedPrefix}: totalTracks is invalid.`);
  }
  if (declaredTracks !== computedTracks) {
    throw new Error(`${expectedPrefix}: totalTracks=${declaredTracks}, but albums contain ${computedTracks} tracks.`);
  }
  if (declaredTracks === 0 && !ALLOW_EMPTY) {
    throw new Error(`${expectedPrefix}: refusing to publish an empty catalog. Set MUSIC_CATALOG_ALLOW_EMPTY=1 only for an intentional clear.`);
  }

  return catalog;
}

function semanticCatalog(catalog) {
  if (!catalog) return null;
  const { generatedAt: _generatedAt, ...content } = catalog;
  return content;
}

function catalogsEqual(left, right) {
  return JSON.stringify(semanticCatalog(left)) === JSON.stringify(semanticCatalog(right));
}

async function fetchCatalog(workerBase, prefix) {
  const encodedPrefix = encodeURIComponent(prefix);

  if (REFRESH_TOKEN) {
    const refreshUrl = `${workerBase}/catalog/${encodedPrefix}/refresh`;
    const refreshed = await requestJson(refreshUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REFRESH_TOKEN}` }
    });
    return { catalog: refreshed, source: 'forced Worker refresh' };
  }

  const catalogUrl = `${workerBase}/catalog/${encodedPrefix}`;
  const catalog = await requestJson(catalogUrl, {
    method: 'GET',
    cache: 'no-store'
  });
  return { catalog, source: 'current Worker catalog (no refresh token configured)' };
}

async function main() {
  const config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
  const workerBase = String(config.workerBase || '').replace(/\/+$/, '');
  if (!workerBase) throw new Error('data/music/catalog.json is missing workerBase.');

  const runtimeRoot = snapshotDirectory(config);
  await mkdir(runtimeRoot, { recursive: true });

  const prefixes = [...new Set(
    Object.values(config.artists || {})
      .map((artist) => String(artist?.prefix || '').trim())
      .filter(Boolean)
  )].filter((prefix) => !REQUESTED_PREFIXES.size || REQUESTED_PREFIXES.has(prefix));

  if (!prefixes.length) throw new Error('No Music artist prefixes are configured for synchronization.');

  if (!REFRESH_TOKEN) {
    console.warn('MUSIC_CATALOG_REFRESH_TOKEN is not configured; snapshots can be generated, but freshness remains subject to the Worker/KV TTL.');
  }

  let changed = 0;
  for (const prefix of prefixes) {
    const path = snapshotPath(runtimeRoot, prefix);
    const existing = await readJson(path);
    const { catalog: rawCatalog, source } = await fetchCatalog(workerBase, prefix);
    const catalog = validateCatalog(rawCatalog, prefix);

    if (catalogsEqual(existing, catalog)) {
      console.log(`${prefix}: unchanged (${catalog.totalTracks} tracks, ${catalog.albums.length} albums; ${source}).`);
      continue;
    }

    await writeFile(path, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    changed += 1;
    console.log(`${prefix}: wrote ${catalog.totalTracks} tracks across ${catalog.albums.length} albums from ${source}.`);
  }

  console.log(`Music catalog snapshot sync complete: ${changed} file(s) changed.`);
}

main().catch((error) => {
  console.error(`Music catalog snapshot sync failed: ${error?.stack || error}`);
  process.exitCode = 1;
});
