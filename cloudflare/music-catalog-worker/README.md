# Music Catalog Worker

This Worker exposes a read-only music catalog derived from the objects stored in the `drinkins-music` R2 bucket.

Expected object key structure:

```text
<artist-prefix>/<album-name>/<audio-file>
```

Recommended single-disc naming:

```text
tom-chang/想念我/01 - 张雨生 - 如果你要離開我.mp3
tom-chang/想念我/02 - 张雨生 - 第二首歌.mp3
```

Recommended multi-disc naming:

```text
tom-chang/某双碟专辑/1-01 - 张雨生 - 第一首歌.mp3
tom-chang/某双碟专辑/1-02 - 张雨生 - 第二首歌.mp3
tom-chang/某双碟专辑/2-01 - 张雨生 - 第二碟第一首.mp3
```

The Worker also accepts `CD1-01`, `DISC1-01`, `01. 歌名` and `01 - 歌名` prefixes.

## Album track ordering

Track order is derived from the filename during the same R2 object-list operation used to build the catalog. No audio object or extra manifest file is read.

Sorting priority:

1. Disc number.
2. Track number.
3. Song title as a stable fallback.

Numbered tracks always appear before unnumbered tracks. The numeric prefix is removed from the displayed song title, while the catalog response preserves `discNumber`, `trackNumber`, and `orderLabel`.

Example response item:

```json
{
  "title": "如果你要離開我",
  "discNumber": 1,
  "trackNumber": 1,
  "orderLabel": "01"
}
```

This naming convention is the preferred source of truth because it keeps the original album sequence next to the audio file and does not create additional R2 reads.

## Why this Worker exists

A public `r2.dev` bucket can serve a known object URL, but it does not provide a public directory listing. The website therefore cannot discover tracks directly from the public bucket URL.

The Worker lists only one artist prefix when a catalog needs refreshing, converts the object keys into album and track data, and stores the result in KV. Normal page requests read the cached KV catalog rather than listing R2 repeatedly.

Default behavior:

- One R2 list refresh per artist at most every 12 hours when the catalog is requested.
- Stale catalog data is returned immediately while a background refresh runs.
- Browser responses are cacheable for five minutes.
- Audio objects are not read while building the catalog. Only object metadata and keys are listed.
- Audio is requested from R2 only after the visitor clicks a song.

## Cloudflare bindings

Create or select a Worker and configure these bindings:

- R2 binding name: `MUSIC_BUCKET`
- R2 bucket: `drinkins-music`
- KV binding name: `MUSIC_CATALOG`
- KV namespace: the existing music catalog namespace, such as `Drinkin's_Music`

Copy `wrangler.jsonc.example` to `wrangler.jsonc`, then replace the KV namespace ID.

Set the Worker secret used for manual refresh:

```bash
npx wrangler secret put REFRESH_TOKEN
```

Deploy:

```bash
npx wrangler deploy
```

## Endpoints

Read a catalog:

```text
GET /catalog/tom-chang
```

The result groups tracks by album based on the R2 key:

```json
{
  "version": 2,
  "artistPrefix": "tom-chang",
  "ordering": "disc-track-title",
  "totalTracks": 1,
  "albums": [
    {
      "name": "想念我",
      "tracks": [
        {
          "title": "如果你要離開我",
          "discNumber": 1,
          "trackNumber": 1,
          "orderLabel": "01",
          "src": "https://pub-...r2.dev/tom-chang/...mp3",
          "type": "audio/mpeg"
        }
      ]
    }
  ]
}
```

Force a refresh immediately after uploading, deleting, or renaming songs:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_REFRESH_TOKEN" \
  https://YOUR_WORKER.workers.dev/catalog/tom-chang/refresh
```

Without a manual refresh, a changed R2 catalog becomes visible after the configured catalog TTL. The default TTL is 43,200 seconds.

## Supported audio extensions

- `.mp3`
- `.m4a`
- `.aac`
- `.ogg`
- `.wav`
- `.flac`
- `.webm`

Objects that do not match `<artist>/<album>/<file>` or do not have a supported audio extension are ignored.
