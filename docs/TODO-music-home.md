# Temporary Music Homepage Plan

> Temporary planning note. Delete this file after the corresponding work is completed and verified.

## Deferred: scalable artist collection rail

- Replace the current fixed artist grid with a horizontally scrollable artist rail inspired by Spotify browsing behavior while keeping the existing large editorial card style.
- Use native horizontal overflow + scroll snap as the primary interaction; add restrained previous/next controls for desktop.
- Keep the section height stable as artist count grows; deliberately expose part of the next card to signal horizontal continuation.
- All curated artists may appear in the rail. If the collection later becomes large, add a separate `/music/artists/` archive for efficient lookup rather than forcing long horizontal navigation.
- Preserve current Music visual language: large cards, per-artist accents, archive numbering, dark navy/gold palette.

## Current priority: Music hero refinement

### 1. Rotating typed quote

Reference implementation: `7719Drinkin/HCI_XiuXian-Station/src/views/Home.vue`.

- Keep the `⌈ ⌋` framing in the Music hero.
- Convert the quote content into a small list of phrases that can be extended later.
- Implement a plain-JavaScript typing state machine for the static Music site: type -> hold -> delete -> next phrase -> repeat.
- Preserve the reference timing character: roughly 120 ms typing, 50 ms deletion, 1.5 s hold, with a blinking cursor.
- Keep the cursor visible next to the active text while typing/deleting.
- Isolate homepage-only behavior from the shared Music runtime.
- Respect `prefers-reduced-motion`: show one complete sentence without automatic typing/deleting and avoid blinking animation.
- Prevent layout jumps when phrases differ in length; reserve a stable text area and allow controlled wrapping on narrow screens.

### 2. Large gramophone carrier

- Replace the visually sparse modern turntable carrier on the right side of the hero with a large stylized gramophone composition.
- Keep the vinyl record as the focal moving/visual element, but make it clearly sit on the gramophone base/platter.
- Add a large horn with a curved neck, brass/gold edge treatment, dark metal interior, and subtle depth/shadow.
- Rework the current tonearm/base so the hardware reads as one coherent gramophone rather than separate floating shapes.
- Prefer scalable HTML/CSS + inline SVG geometry over a raster image so the object remains crisp, themeable, responsive, and lightweight.
- Preserve the current right-side diagonal composition instead of centering the gramophone like a product photo.
- On mobile/tablet, simplify the horn and reduce overlap so it does not compete with the hero copy.
- Respect `prefers-reduced-motion`; any record or highlight animation must stop or become static.

## Verification targets

- Hero copy remains readable at desktop, tablet, and mobile widths.
- Dynamic quote never pushes the CTA or changes the hero's overall height during phrase changes.
- Cursor animation does not cause text reflow.
- Gramophone does not overflow into the fixed header or persistent player.
- No homepage-specific behavior is introduced into artist/album pages.
