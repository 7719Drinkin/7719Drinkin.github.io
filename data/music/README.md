# Music content model

- `artists.json` is the artist registry used by the Music directory.
- `artists/<slug>.json` stores one artist's page content.
- `scripts/build-music-pages.mjs` validates the registry and generates the Music index plus artist pages.

To add an artist:

1. Add an asset directory under `assets/Music/Artists/<AssetKey>/`.
2. Add a detail JSON file under `data/music/artists/<slug>.json`.
3. Register the artist in `data/music/artists.json`.
4. Run `node scripts/build-music-pages.mjs`.
