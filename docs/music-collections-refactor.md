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

## Round 2 — Public Collections switch — PASS

- [x] Add one shared collection-page generator.
- [x] Generate only `/music/collections/recently-curated/`.
- [x] Replace homepage `SELECTED LISTENING` song rows with one `COLLECTIONS` entry for Recently Curated.
- [x] Change landing Header `LISTENING` to `COLLECTIONS`.
- [x] Keep the existing `/music/listening/` archive temporarily available during the transition.
- [x] Do not create a `/music/collections/` directory page while only one collection exists.
- [x] Do not create any future editorial collection placeholders.
- [x] Run complete PR workflow and review this round against the plan.

Validation: workflow #616 reached the fully generated Collections state but failed because the legacy Listening validator still required the Music homepage to expose `/music/listening/`. The transitional validator was then decoupled from homepage IA while retaining strict validation of the 11-song archive. PR workflow #617 PASS. The generated Recently Curated page resolves 2 songs under the preserved selection contract; the Music homepage exposes Collections instead of naked recent-song rows; the Header exposes ARTISTS / COLLECTIONS; and the old Listening archive remains available only for the Round 2 transition.

## Round 3 — Retire legacy Listening/Recent presentation — PASS

- [x] Remove the all-songs Listening archive from the public IA.
- [x] Keep `/music/listening/` only as a compatibility route pointing users to Recently Curated.
- [x] Remove obsolete Listening page generator/CSS/validator/tests after dependency audit.
- [x] Remove obsolete Recent Listening selector/presenter/renderer/updater/validator after Collection resolver fully owns the behavior.
- [x] Keep shared utilities that are still used elsewhere.
- [x] Simplify workflow to Collections-based generation/validation.
- [x] Run complete PR workflow and review this round against the plan.

Validation: PR workflow #619 PASS. The Collection generator now owns the legacy `/music/listening/` compatibility page and points it to `/music/collections/recently-curated/`; the 11-song archive renderer is no longer generated. The old Listening and Recent Listening generator/selector/presenter/renderer/validator/test chain was removed after dependency audit. The dynamic resolver test now freezes the preserved Recently Curated behavior directly, so no legacy selector remains as a test dependency. Music runtime, canonical library, Collection validation, album assets, catalog identity/config, generated pages, site revision, and persistent shell validation all continue to pass.

## Final audit — PASS

- [x] Compare the final branch against the then-current `main`.
- [x] Confirm only planned Music Collections changes are present.
- [x] Confirm no song/album/artist/catalog data was invented or silently reclassified.
- [x] Confirm existing Artist and Album routes remain valid.
- [x] Confirm the final PR workflow passes.
- [x] Merge only after all checks pass.

Validation: final branch-vs-main comparison is a clean forward series from `e74552c9ed023079711b091dacf4478ab24910a5`; the diff contains only the planned Collections data/config, Music presentation/build/validation changes, documentation, and retirement of the old Listening/Recent chain. Canonical `songs.json` is byte-identical to `main`, and `albums.json`, `artists.json`, and `catalog.json` are absent from the diff. The current branch head differs from workflow-validated code commit `6c9448ab850e9445db74b3ae6ac9eb264974856f` only by validation documentation. PR #89 is mergeable; the merge gate is satisfied.
