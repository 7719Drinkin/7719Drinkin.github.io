# Music content model

Music uses a shared canonical library. Songs and albums are independent entities; artist profiles are optional editorial pages that reference those entities by ID.

## Canonical files

- `artists.json` — registry of artists that have a full 7719 artist profile/page.
- `artists/<slug>.json` — one full artist page's editorial content plus canonical song/album ID references.
- `songs.json` — canonical song library. A song may reference an artist key even when that artist has no 7719 profile.
- `albums.json` — canonical album metadata and canonical cover references. Album data does not imply that an album detail page must exist.
- `catalog.json` — runtime/R2 catalog mapping. Keys under `artists` are artist identity keys, not profile slugs and not proof that a profile page exists.
- `home.json` — Music landing-page editorial data.
- `runtime/` — generated/runtime catalog snapshots.

## Artist references

Song and album artist references use a stable `key` plus display names. The key is resolved against `artists.json` only when the UI needs a profile link.

- key found in `artists.json` → render a link to the artist profile.
- key not found in `artists.json` → render the artist name as plain text.

A missing profile is therefore valid and does not make the song, album, or catalog identity incomplete.

## Canonical reference boundary

Artist detail files contain only canonical IDs in `selectedSongs` and `albums`. Build scripts hydrate those references in memory through `music-library-repository.mjs`; they never rewrite source JSON into legacy inline song/album objects.

`validate-music-library.mjs` permanently rejects inline objects in artist detail reference arrays. `validate-music-catalog-config.mjs` validates catalog identity keys independently from profile-page existence.

Album covers live under `assets/Music/Albums/<artist-key>/`. Person-specific portraits, hero images and gallery assets remain under `assets/Music/Artists/<AssetKey>/`.

See `docs/music-library-refactor.md` for the staged migration plan and round-by-round review log.
