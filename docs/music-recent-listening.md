# Music Recent Listening

## Goal

`music/index.html` remains a manually designed page. Only the rows inside **最近整理 / Recent Listening** are generated from artist curation data.

The feature follows a small set of Refactoring.Guru-style design principles without introducing unnecessary framework code:

- **SRP**: data access, selection policy, presentation mapping, HTML rendering, and HTML replacement have separate responsibilities.
- **DIP**: the presenter receives a `resolvePlayable` dependency instead of knowing how runtime catalogs are stored.
- **OCP / Strategy**: the selector accepts comparison and distinct-key strategies; changing ranking or diversity policy does not require changing the repository or renderer.
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

Legacy selected songs without `curatedAt` remain valid. They are used only as a migration fallback for artists that have no dated curation yet, and they rank after all dated artist picks. A malformed non-empty timestamp is a build error.

## Pipeline

```text
data/music/artists.json + data/music/artists/*.json
                  |
                  v
       MusicCollectionRepository
                  |
                  v
       RecentListeningSelector
   recent first + one song per artist
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
- `recent-listening-selector.mjs`: pure ranking and artist-diversity policy. It does not know files, HTML, R2, routes, or GitHub Actions.
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

## Ranking and diversity rules

1. Validate every non-empty `curatedAt`.
2. Rank dated songs by `curatedAt` descending.
3. Use repository/source order as the deterministic tie breaker.
4. Walk the ranked songs and keep only the first song encountered for each artist.
5. After dated picks, allow one legacy undated fallback for an artist that has not already been represented.
6. Stop after three artists.

This means one artist can never occupy multiple rows. The newest song for each artist wins; artists with older un-timestamped curator picks can still appear during the migration period.

## Status rules

The homepage does not store a second `PLAYABLE` flag. The presenter asks the runtime resolver to match the selected song against `data/music/runtime/<prefix>.json` using the same normalized album/title idea as the browser catalog runtime.

- runtime match -> `PLAYABLE`
- no current runtime match -> `ARCHIVE`

## Build order

The deploy workflow intentionally restores the manual music homepage after the broad page generator runs. Recent Listening is therefore updated **after that restore**, before later design/i18n/shell processing and final validation.

This keeps the generated feature independent from the existing full-page generator and preserves the manual homepage as the owning template.
