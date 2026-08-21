# Music content model

Music uses a shared canonical library. Songs and albums are independent entities; artist profiles and public collections are editorial/presentation layers that reference or resolve those canonical entities.

## Canonical files

- `artists.json` — registry of artists that have a full 7719 artist profile/page.
- `artists/<slug>.json` — one full artist page's editorial content plus canonical song/album ID references.
- `songs.json` — canonical song library. A song may reference an artist key even when that artist has no 7719 profile.
- `albums.json` — canonical album metadata and canonical cover references. Album data does not imply that an album detail page must exist.
- `collections.json` — public Music collection registry. Collections organize canonical songs without duplicating song metadata.
- `collections/<id>.json` — one collection's editorial metadata and either dynamic source rules or, for editorial collections, canonical song ID references.
- `catalog.json` — runtime/R2 catalog mapping. Keys under `artists` are artist identity keys, not profile slugs and not proof that a profile page exists.
- `home.json` — Music landing-page editorial data.
- `runtime/` — generated/runtime catalog snapshots.

## Artist references

Song and album artist references use a stable `key` plus display names. The key is resolved against `artists.json` only when the UI needs a profile link.

- key found in `artists.json` → render a link to the artist profile.
- key not found in `artists.json` → render the artist name as plain text.

A missing profile is therefore valid and does not make the song, album, or catalog identity incomplete.

## Collections

Collections are the public organization layer for songs. They never duplicate canonical song, album, or artist metadata.

- `dynamic` collections resolve songs from a small validated source rule.
- `editorial` collections store an ordered array of canonical song IDs.
- collection membership does not determine whether an artist profile exists.

The first published collection is `recently-curated`. Its dynamic resolver owns the frozen Recently Curated contract: sort by `curatedAt` descending, keep at most one song per primary artist, use legacy source order as fallback, and limit the result to three songs. The Music homepage exposes Collections instead of a standalone song-listing concept.

`/music/listening/` is retained only as a compatibility URL and redirects to `/music/collections/recently-curated/`; it is not part of the public Music information architecture and does not render the complete canonical song library.

## Canonical reference boundary

Artist detail files contain only canonical IDs in `selectedSongs` and `albums`. Build scripts hydrate those references in memory through `music-library-repository.mjs`; they never rewrite source JSON into legacy inline song/album objects.

`validate-music-library.mjs` permanently rejects inline objects in artist detail reference arrays. `validate-music-catalog-config.mjs` validates catalog identity keys independently from profile-page existence. `validate-music-collections.mjs` validates collection registry/detail integrity and resolved canonical song IDs.

Album covers live under `assets/Music/Albums/<artist-key>/`. Person-specific portraits, hero images and gallery assets remain under `assets/Music/Artists/<AssetKey>/`.

See `docs/music-library-refactor.md` for the canonical library migration and `docs/music-collections-refactor.md` for the Collections migration plan and review log.
