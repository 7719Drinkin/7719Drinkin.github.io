# Music library refactor plan

Branch: `music-library-refactor-phase-1`

## Goal

Keep the existing full artist-profile structure while allowing classic songs to exist without creating a full page for every performer. Songs and albums become canonical shared entities; artist profiles become optional editorial profiles that reference them.

## Invariants

These rules must hold throughout the refactor:

1. Existing artist routes remain stable: `/music/artists/<slug>/`.
2. Existing generated album routes remain stable until a later explicit routing decision.
3. No artist profile is created merely because a song references that artist.
4. Song and album data use the same schema regardless of whether their artists have profile pages.
5. `artist.key` is an identity/reference key, not proof that a profile page exists.
6. Album ownership and asset classification are based on the release itself, not on profile-page existence.
7. R2/catalog behavior is not changed until the canonical data migration is proven stable.
8. Visual archive, photo wall, Header and persistent shell are outside the data refactor unless a later round explicitly requires them.
9. Asset moves use copy → verify → delete, never destructive move in one deployment.
10. Every round is reviewed against this plan before the next round begins.

## Dependency audit (Phase 0)

| Area | Current dependency | Planned change |
| --- | --- | --- |
| `scripts/build-music-pages.mjs` | Reads artist detail `selectedSongs`, `albums`, `gallery` | Phase 2: resolve song/album IDs through shared library repository; gallery remains artist-owned |
| `scripts/enhance-music-albums.mjs` | Reads inline `selectedSongs` and `albums`; generates existing artist album routes | Phase 2: resolve canonical IDs while preserving generated routes and DOM |
| `scripts/music/music-collection-repository.mjs` | Walks profile artists and flattens each detail's `selectedSongs` | Phase 2 build projection keeps its current input stable; Phase 3 switches LISTENING/recent selection to the global song library |
| `scripts/update-music-recent-listening.mjs` + recent-listening modules | Consume collection repository output | Phase 2 build projection preserves current behavior; Phase 3 changes the source only after global LISTENING exists |
| `data/music/catalog.json` / `js/music-catalog.js` | Runtime prefix lookup is currently keyed by artist slug/key | Preserve through Phases 1–3; later formalize as artist-key mapping without requiring a profile |
| `scripts/embed-music-i18n-data.mjs` | Reads inline song/album fields for embedded page data | Phase 2 build projection preserves the legacy input shape until the compatibility boundary is removed |
| `scripts/enhance-music-visual-videos.mjs` | Uses artist `gallery` | No canonical song/album migration required |
| `scripts/patch-music-header.mjs` | Uses artist registry/profile data | No canonical song/album migration required |
| `assets/Music/Artists/<Artist>/albums/` | Current album-cover location | Phase 4: copy to `assets/Music/Albums/...`, verify, then delete legacy copies in a later deployment |
| `.github/workflows/deploy-pages.yml` | Validates current Music runtime but not canonical song/album data | Phase 1: add repository syntax/test and canonical library validator before generation |

## Target data model

```text
data/music/
├── artists.json
├── artists/
│   └── <profile-slug>.json
├── songs.json
├── albums.json
├── home.json
├── catalog.json
└── runtime/
```

Artist detail after migration:

```json
{
  "id": "artist-key",
  "selectedSongs": ["artist-key--song-id"],
  "albums": ["artist-key--album-id"],
  "gallery": []
}
```

A song may reference an artist without a profile:

```json
{
  "id": "lowell-lo--yi-sheng-suo-ai",
  "title": { "zh": "一生所爱" },
  "artists": [
    {
      "key": "lowell-lo",
      "name": { "zh": "卢冠廷", "en": "Lowell Lo" },
      "role": "primary"
    }
  ],
  "albumId": null,
  "artwork": null
}
```

The renderer resolves `artist.key` against `artists.json`: a matching profile yields a link; no match yields plain text.

## Rounds

### Round 1 — Phase 0 + Phase 1: foundation

Scope:

- [x] Create isolated refactor branch from current `main`.
- [x] Record dependency audit and invariants.
- [x] Add empty schema-v1 `songs.json` and `albums.json` without changing production content.
- [x] Add `music-library-repository.mjs` for canonical lookup and relation resolution.
- [x] Add song artwork precedence: song artwork → album cover → profile cover → placeholder.
- [x] Add migration-compatible `validate-music-library.mjs`.
- [x] Add tests proving an artist reference can exist without a profile page.
- [x] Add tests for artwork fallback and broken album references.
- [x] Add CI syntax/test/validation commands.
- [x] PR workflow passes on the branch (run 601).

Must not happen in Round 1:

- [x] No artist detail migration.
- [x] No album asset move.
- [x] No page visual change.
- [x] No `/music/listening/` page.
- [x] No catalog/R2 behavior change.

#### Round 1 review

Result: **PASS**. PR workflow run 601 completed successfully. The branch diff contained only the canonical empty library, repository, validator/tests, documentation and CI checks. No artist detail, assets, page markup, catalog mapping or runtime behavior changed. `main` remained on the pre-refactor commit after the PR preview step.

### Round 2 — Phase 2: migrate existing artist data

After the Round 1 audit, one implementation detail was adjusted: four independent build consumers still expect inline song/album objects. Patching all of them in the same migration round would widen the visual/regression surface. Round 2 therefore introduces one temporary build projection: canonical ID-based artist details are materialized into the old renderer shape only inside the build workspace, then restored before final validation. This preserves the planned canonical source model while keeping current page generators unchanged. The projection is reviewed for removal in Round 5.

- [x] Extract current inline albums into `albums.json`.
- [x] Extract current selected songs into `songs.json`.
- [x] Convert all three current artist detail files to ID references.
- [x] Preserve existing Tan album fallback slugs/routes (`7890`, `lorelei`, `album-XX`) through canonical IDs/projection.
- [x] Add canonical → legacy build projection using the shared repository.
- [x] Restore canonical detail JSON after Music generation.
- [x] Enable `--strict-references` for source validation.
- [x] Preserve current artist routes, album routes, Header, player, R2 behavior and visual archive inputs.
- [x] Unit-test canonical detail hydration and strict reference validation.
- [x] PR workflow passes for Round 2 (run 602).

Must not happen in Round 2:

- [x] No album asset move.
- [x] No `/music/listening/` page.
- [x] No global recent-listening semantic change.
- [x] No catalog/R2 mapping change.
- [x] No Music visual redesign.

#### Round 2 review

Result: **PASS**. PR workflow run 602 completed successfully. Canonical source now contains 11 selected songs and 55 albums; the two non-empty artist detail files use ID references while the already-empty Leslie song/album arrays remain valid canonical references. Existing Music generators and recent-listening validation ran against the temporary compatibility projection, then canonical details were restored and strict validation passed again. No album assets, LISTENING route, catalog mapping, player, Header or visual design changed. `main` remained on the pre-refactor commit after the PR preview step.

### Round 3 — Phase 3: global LISTENING

- [x] Make the global song library the source for cross-artist listening/recent selection.
- [x] Add `/music/listening/`.
- [x] Keep homepage LISTENING intentionally small and link to the complete collection.
- [x] Render profile artists as links and non-profile artists as plain text using the same song schema.
- [x] Do not generate empty artist or album pages for standalone songs.
- [x] Add tests/validation for standalone songs and profile-aware artist links.
- [x] PR workflow passes for Round 3 (run 604).

Must not happen in Round 3:

- [x] No new song content invented or added for the refactor.
- [x] No new artist profile created for a standalone song reference.
- [x] No new album detail page generated merely because a song references an album.
- [x] No album asset migration yet.
- [x] No catalog/R2 mapping change.

#### Round 3 review

Result: **PASS**. PR workflow run 604 completed successfully. The global collection and homepage Recent Listening now read canonical `songs.json`; `/music/listening/` is generated from the same library and distinguishes profile-backed artists from metadata-only artists without changing the song schema. The homepage remains a small recent selection with a link to the complete archive. Tests verified that a song whose artist has no profile is still included and never receives an invented `/music/artists/...` route. No song content, artist profile, album asset, catalog mapping or R2 behavior changed.

### Round 4 — Phase 4: album asset migration

Deployment A:

- [x] Create only the actually needed canonical directories: `assets/Music/Albums/zhang-yusheng/` and `assets/Music/Albums/tan-yonglin/`.
- [x] Copy all 55 existing covers to their canonical locations by reusing the exact existing Git blobs.
- [x] Point all canonical `albums.json` cover paths to `assets/Music/Albums/...`.
- [x] Keep old artist-owned album files during Deployment A.
- [x] Add album-asset validation that requires both canonical covers and legacy copies during Deployment A.
- [x] PR workflow passes for Deployment A (run 606).

Deployment B, only after verification:

- [x] Delete legacy `assets/Music/Artists/ZhangYusheng/albums/` and `assets/Music/Artists/TanYonglin/albums/` after Deployment A passed.
- [x] Keep canonical `assets/Music/Albums/...` trees unchanged.
- [x] Change validation to forbid legacy album copies from returning.
- [x] PR workflow passes for Deployment B (run 607).

Must not happen in Round 4:

- [x] No lossy re-upload or transformation of album images.
- [x] No empty `soundtracks/` or `various-artists/` directory created without actual content.
- [x] No song data, artist profile or catalog/R2 mapping change.
- [x] No Music visual redesign.

#### Round 4 review

Result: **PASS**. Deployment A workflow run 606 proved the copy stage with all 55 canonical covers present while every legacy copy still existed. Deployment B was created only after that success; workflow run 607 then passed with the legacy directories removed and CI switched to `--forbid-legacy-copies`. The canonical directories reuse the exact original Git blobs, so image bytes did not change. No empty soundtrack/compilation directories, song content, artist profile, catalog mapping, R2 behavior or visual redesign was introduced.

### Round 5 — Phase 5: cleanup

- [ ] Remove migration compatibility for inline song/album objects.
- [ ] Make strict canonical reference validation permanent.
- [ ] Make the three mature page-data consumers hydrate canonical IDs in memory.
- [ ] Formalize catalog keys as artist identity keys independent of profile existence.
- [ ] Keep current browser `data-artist-slug` as a compatibility alias while exposing canonical `data-artist-key` on generated pages.
- [ ] Update remaining documentation and remove dead compatibility code.
- [ ] PR workflow passes for Round 5.

Must not happen in Round 5:

- [ ] No song/album content changes.
- [ ] No artist profile or route changes.
- [ ] No album asset changes.
- [ ] No R2 prefix changes.
- [ ] No Music visual redesign.

## Round review rule

At the end of every round:

1. Compare the branch against the round scope above.
2. Confirm all "must not happen" constraints remain true.
3. Run syntax/unit/data validation.
4. Compare branch diff with the pre-round base.
5. Check PR workflow status.
6. Only then mark the round complete and begin the next round.

The branch is merged into `main` only after the final planned round has passed the same review.
