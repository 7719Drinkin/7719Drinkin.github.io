# Music Collections migration

## Goal

Move the public song-browsing model from a special `LISTENING` concept to a reusable `COLLECTIONS` layer without undoing the canonical `songs.json` / `albums.json` architecture.

Current scope is deliberately narrow: only `RECENTLY CURATED / 最近整理` exists. Do not create placeholder data or empty pages for future collections such as Take It Easy, Energetic, or Rock'n Roll.

## Invariants

- `songs.json` remains the only canonical song data source.
- Collections never duplicate song, album, or artist metadata.
- Artist profile existence remains optional and independent from collection membership.
- The first dynamic collection must preserve the current Recent Listening selection result before any public IA switch.
- Do not change existing `curatedAt` values or song ordering during the migration.
- Do not change Artist, Album, Visual Archive, catalog/R2, or unrelated site behavior.

## Round 1 — Collection foundation — PASS

- [x] Add `data/music/collections.json` with only `recently-curated`.
- [x] Add `data/music/collections/recently-curated.json`.
- [x] Extend `music-collection-repository.mjs` with collection registry/detail access.
- [x] Add a small dynamic collection resolver.
- [x] Preserve current Recently Curated semantics: `curatedAt desc`, primary-artist distinctness, legacy fallback, limit 3.
- [x] Add parity tests against the existing Recent Listening selector.
- [x] Add collection validation and CI checks.
- [x] Keep Music homepage, Header, `/music/listening/`, and all visual output unchanged.
- [x] Run complete PR workflow and review this round against the plan.

Validation: PR workflow #614 PASS. The new dynamic resolver and the old Recent Listening selector produce the same selected song IDs for the guarded parity fixture. Existing Recent Listening, Listening archive, Music runtime, canonical library, album asset, and catalog checks also continue to pass.

## Round 2 — Public Collections switch

- [ ] Add one shared collection-page generator.
- [ ] Generate only `/music/collections/recently-curated/`.
- [ ] Replace homepage `SELECTED LISTENING` song rows with one `COLLECTIONS` entry for Recently Curated.
- [ ] Change landing Header `LISTENING` to `COLLECTIONS`.
- [ ] Keep the existing `/music/listening/` archive temporarily available during the transition.
- [ ] Do not create a `/music/collections/` directory page while only one collection exists.
- [ ] Do not create any future editorial collection placeholders.
- [ ] Run complete PR workflow and review this round against the plan.

## Round 3 — Retire legacy Listening/Recent presentation

- [ ] Remove the all-songs Listening archive from the public IA.
- [ ] Keep `/music/listening/` only as a compatibility route pointing users to Recently Curated.
- [ ] Remove obsolete Listening page generator/CSS/validator/tests after dependency audit.
- [ ] Remove obsolete Recent Listening selector/presenter/renderer/updater/validator after Collection resolver fully owns the behavior.
- [ ] Keep shared utilities that are still used elsewhere.
- [ ] Simplify workflow to Collections-based generation/validation.
- [ ] Run complete PR workflow and review this round against the plan.

## Final audit

- [ ] Compare the final branch against the then-current `main`.
- [ ] Confirm only planned Music Collections changes are present.
- [ ] Confirm no song/album/artist/catalog data was invented or silently reclassified.
- [ ] Confirm existing Artist and Album routes remain valid.
- [ ] Confirm the final PR workflow passes.
- [ ] Merge only after all checks pass.
