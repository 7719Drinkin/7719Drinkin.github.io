# Music content model

Music is migrating from artist-owned song/album objects to a shared library model. The migration is intentionally staged so existing artist pages, album routes, R2 playback and visual archives remain stable while the data layer changes underneath them.

## Canonical files

- `artists.json` — registry of artists that have a full 7719 artist profile/page.
- `artists/<slug>.json` — one full artist page's editorial content and references.
- `songs.json` — canonical song library. A song may reference an artist key even when that artist has no 7719 profile.
- `albums.json` — canonical album metadata and cover references. Album data does not imply that an album detail page must exist.
- `catalog.json` — runtime/R2 catalog mapping. It remains independent from whether an artist has a profile page.
- `home.json` — Music landing-page editorial data.
- `runtime/` — generated/runtime catalog snapshots.

## Artist references

Song and album artist references use a stable `key` plus display names. The key is resolved against `artists.json` only when the UI needs a profile link.

- key found in `artists.json` → render a link to the artist profile.
- key not found in `artists.json` → render the artist name as plain text.

A missing profile is therefore valid and does not make the song or album incomplete.

## Migration state

Phase 1 introduces the canonical `songs.json` / `albums.json`, repository and validator only. Existing artist detail files still contain legacy inline `selectedSongs` and `albums` objects during this phase. `scripts/validate-music-library.mjs` accepts those objects in compatibility mode and reports them as migration warnings. `--strict-references` will be enabled after the artist details are migrated to ID references.

See `docs/music-library-refactor.md` for the staged plan and round-by-round review log.
