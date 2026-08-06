const AUDIO_TYPES = new Map([
  ['mp3', 'audio/mpeg'],
  ['m4a', 'audio/mp4'],
  ['aac', 'audio/aac'],
  ['ogg', 'audio/ogg'],
  ['wav', 'audio/wav'],
  ['flac', 'audio/flac'],
  ['webm', 'audio/webm']
]);

const DEFAULT_TTL_SECONDS = 43_200;
const LOCK_TTL_SECONDS = 90;

export default {
  async fetch(request, env, ctx) {
    const origin = env.ALLOWED_ORIGIN || 'https://7719drinkin.github.io';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts[0] !== 'catalog' || !parts[1]) {
      return jsonResponse({ error: 'Not found.' }, 404, origin, 'miss');
    }

    const artistPrefix = decodeURIComponent(parts[1]);
    if (!isAllowedArtist(artistPrefix, env)) {
      return jsonResponse({ error: 'Unknown artist prefix.' }, 404, origin, 'miss');
    }

    if (request.method === 'POST' && parts[2] === 'refresh') {
      if (!isAuthorized(request, env)) {
        return jsonResponse({ error: 'Unauthorized.' }, 401, origin, 'miss');
      }

      try {
        const catalog = await buildCatalog(env, artistPrefix);
        return jsonResponse(catalog, 200, origin, 'refresh');
      } catch (error) {
        return jsonResponse({ error: error.message || 'Catalog refresh failed.' }, 500, origin, 'error');
      }
    }

    if (request.method !== 'GET' || parts.length !== 2) {
      return jsonResponse({ error: 'Method not allowed.' }, 405, origin, 'miss');
    }

    const ttlSeconds = positiveInteger(env.CATALOG_TTL_SECONDS, DEFAULT_TTL_SECONDS);
    const cacheKey = catalogKey(artistPrefix);
    const cached = await env.MUSIC_CATALOG.get(cacheKey, { type: 'json' });

    if (cached && isFresh(cached, ttlSeconds)) {
      return jsonResponse(cached, 200, origin, 'hit');
    }

    if (cached) {
      ctx.waitUntil(refreshWithLock(env, artistPrefix));
      return jsonResponse(cached, 200, origin, 'stale');
    }

    try {
      const catalog = await buildCatalog(env, artistPrefix);
      return jsonResponse(catalog, 200, origin, 'miss');
    } catch (error) {
      return jsonResponse({ error: error.message || 'Catalog generation failed.' }, 500, origin, 'error');
    }
  }
};

async function refreshWithLock(env, artistPrefix) {
  const lockKey = `${catalogKey(artistPrefix)}:refreshing`;
  const existingLock = await env.MUSIC_CATALOG.get(lockKey);
  if (existingLock) return;

  await env.MUSIC_CATALOG.put(lockKey, String(Date.now()), {
    expirationTtl: LOCK_TTL_SECONDS
  });

  try {
    await buildCatalog(env, artistPrefix);
  } finally {
    await env.MUSIC_CATALOG.delete(lockKey);
  }
}

async function buildCatalog(env, artistPrefix) {
  const publicBase = String(env.R2_PUBLIC_BASE || '').replace(/\/+$/, '');
  if (!publicBase) throw new Error('R2_PUBLIC_BASE is not configured.');

  const prefix = `${artistPrefix}/`;
  const objects = [];
  let cursor;

  do {
    const page = await env.MUSIC_BUCKET.list({
      prefix,
      cursor,
      limit: 1000
    });

    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const albums = new Map();
  let ignoredObjects = 0;

  for (const object of objects) {
    const parsed = parseTrack(object, artistPrefix, publicBase);
    if (!parsed) {
      ignoredObjects += 1;
      continue;
    }

    if (!albums.has(parsed.album)) albums.set(parsed.album, []);
    albums.get(parsed.album).push(parsed.track);
  }

  const albumRows = [...albums.entries()]
    .map(([name, tracks]) => ({
      name,
      tracks: tracks.sort((left, right) => left.title.localeCompare(right.title, 'zh-CN'))
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));

  const generatedAt = new Date().toISOString();
  const catalog = {
    version: 1,
    artistPrefix,
    generatedAt,
    totalTracks: albumRows.reduce((sum, album) => sum + album.tracks.length, 0),
    ignoredObjects,
    albums: albumRows
  };

  await env.MUSIC_CATALOG.put(catalogKey(artistPrefix), JSON.stringify(catalog));
  return catalog;
}

function parseTrack(object, artistPrefix, publicBase) {
  const parts = object.key.split('/').filter(Boolean);
  if (parts.length < 3 || parts[0] !== artistPrefix) return null;

  const fileName = parts.at(-1);
  const extension = fileName.includes('.') ? fileName.split('.').at(-1).toLowerCase() : '';
  const type = AUDIO_TYPES.get(extension);
  if (!type) return null;

  const album = parts.slice(1, -1).join(' / ');
  const stem = fileName.slice(0, -(extension.length + 1));
  const separatorIndex = stem.indexOf(' - ');
  const title = separatorIndex >= 0 ? stem.slice(separatorIndex + 3).trim() : stem.trim();
  const encodedKey = object.key.split('/').map(encodeURIComponent).join('/');

  return {
    album,
    track: {
      title: title || stem,
      fileName,
      key: object.key,
      src: `${publicBase}/${encodedKey}`,
      type,
      size: object.size,
      uploadedAt: object.uploaded instanceof Date ? object.uploaded.toISOString() : object.uploaded
    }
  };
}

function catalogKey(artistPrefix) {
  return `music-catalog:v1:${artistPrefix}`;
}

function isFresh(catalog, ttlSeconds) {
  const generatedAt = Date.parse(catalog.generatedAt || '');
  return Number.isFinite(generatedAt) && Date.now() - generatedAt < ttlSeconds * 1000;
}

function isAllowedArtist(artistPrefix, env) {
  const configured = String(env.ALLOWED_ARTIST_PREFIXES || 'tom-chang,alan-tam')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.includes(artistPrefix);
}

function isAuthorized(request, env) {
  if (!env.REFRESH_TOKEN) return false;
  return request.headers.get('Authorization') === `Bearer ${env.REFRESH_TOKEN}`;
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function jsonResponse(payload, status, origin, cacheState) {
  const headers = new Headers(corsHeaders(origin));
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', cacheState === 'hit' || cacheState === 'stale'
    ? 'public, max-age=300'
    : 'no-store');
  headers.set('X-Music-Catalog-Cache', cacheState);

  return new Response(JSON.stringify(payload), { status, headers });
}
