# Music Recent Listening

## Goal

`music/index.html` remains a manually designed page. Only the rows inside **最近整理 / Recent Listening** are generated from artist curation data.

The feature follows a small set of Refactoring.Guru-style design principles without introducing unnecessary framework code:

- **SRP**: data access, selection policy, presentation mapping, HTML rendering, and HTML replacement have separate responsibilities.
- **DIP**: the presenter receives a `resolvePlayable` dependency instead of knowing how runtime catalogs are stored.
- **OCP / Strategy**: the selector accepts a comparison strategy; changing ranking logic does not require changing the repository or renderer.
- **Single source of truth**: song title, album, note and curation time live only in each artist's `selectedSongs` array.

## Data contract

A newly curated song should include:

```json
{
  "title": "河",
  "album": "口是心非",
  "note": "就算億年換幾吋 我也寧願這麼盼",
  "curatedAt": "2026-08-14T14:23:35+08:00"
}
```

`curatedAt` means **the time the song entered the curator-picked list**. Editing the lyric excerpt later must not update this timestamp.

Legacy selected songs without `curatedAt` are valid but are excluded from Recent Listening until a curation timestamp is assigned. A malformed non-empty timestamp is a build error.

## Pipeline

```text
data/music/artists.json + data/music/artists/*.json
                  |
                  v
       MusicCollectionRepository
                  |
                  v
       RecentListeningSelector
       curatedAt desc, limit 3
                  |
                  v
       RecentListeningPresenter
        + playability resolver
                  |
                  v
       RecentListeningRenderer
                  |
                  v
          HtmlRegionUpdater
                  |
                  v
 music/index.html guarded region only
```

## Module boundaries

- `music-collection-repository.mjs`: reads visible artists and flattens their `selectedSongs` into transport-neutral records.
- `recent-listening-selector.mjs`: pure ranking policy. It does not know files, HTML, R2, routes, or GitHub Actions.
- `runtime-playability-resolver.mjs`: resolves whether a selected song currently exists in the committed runtime snapshot.
- `recent-listening-presenter.mjs`: maps selected records to homepage view models.
- `recent-listening-renderer.mjs`: renders only Recent Listening row markup.
- `html-region-updater.mjs`: generic guarded-region replacement; it has no Music-specific knowledge.
- `update-music-recent-listening.mjs`: orchestration only.
- `validate-music-recent-listening.mjs`: integration/invariant checks.

## Homepage ownership boundary

The updater may only replace content between:

```html
<!-- RECENT-LISTENING:START -->
<!-- RECENT-LISTENING:END -->
```

Hero content, artist cards, navigation, footer, spacing and page-level visual design remain manually owned.

## Ranking rules

1. Ignore selected songs with no `curatedAt`.
2. Reject malformed non-empty `curatedAt` values.
3. Sort by `curatedAt` descending.
4. If timestamps are identical, preserve deterministic repository/source order.
5. Take the first three rows.

## Status rules

The homepage does not store a second `PLAYABLE` flag. The presenter asks the runtime resolver to match the selected song against `data/music/runtime/<prefix>.json` using the same normalized album/title idea as the browser catalog runtime.

- runtime match -> `PLAYABLE`
- no current runtime match -> `ARCHIVE`

## Build order

The deploy workflow intentionally restores the manual music homepage after the broad page generator runs. Recent Listening is therefore updated **after that restore**, before later design/i18n/shell processing and final validation.

This keeps the generated feature independent from the existing full-page generator and preserves the manual homepage as the owning template.
