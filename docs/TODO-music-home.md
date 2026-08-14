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

### 2. Real 3D gramophone carrier

- Use a real downloadable 3D gramophone asset instead of hand-building the whole object with CSS/SVG.
- Prefer GLB/glTF or an asset that can be converted cleanly to GLB, with a clear reuse license, moderate polygon count, and PBR textures.
- First candidate class: middle/low-poly vintage gramophones around 4k-15k triangles so the hero remains practical on desktop and mobile.
- Treat the gramophone body/horn as the static carrier and the vinyl record as a separately addressable mesh. The record must be able to rotate continuously around its own local spindle axis without rotating the gramophone body.
- If the selected model already contains a record, either animate that mesh directly or hide/replace it with our own record mesh. Do not overlay a flat DOM record on top of a 3D model unless the perspective can be proven to match.
- Keep the current Music hero composition: large gramophone on the right, slightly diagonal, dark body, brass/gold horn accents, vinyl still visually prominent.
- Reuse the existing visual idea of the rotating black record, but move the rotation into the 3D scene so lighting, perspective, platter height, and tonearm alignment remain coherent.
- Inspect model node/mesh names after import. Add a one-time adapter that resolves the record/platter mesh by configured name rather than scattering model-specific selectors through rendering code.
- If the downloaded model does not expose the record as a separate mesh, edit the asset once in Blender or split the mesh during preprocessing; avoid runtime geometry surgery in the browser.
- Render the hero object in a homepage-only WebGL layer. Keep 3D loading and animation outside shared artist/album runtime code.
- Use compressed production assets where practical (mesh compression / optimized textures) and lazy-start the renderer after the hero is ready.
- Provide a poster/static fallback if WebGL/model loading fails.
- On tablet/mobile, reduce DPR/quality and camera framing instead of simply shrinking the desktop canvas. The horn may be partially cropped as part of the composition, but the record and base must remain recognizable.
- Respect `prefers-reduced-motion`: keep the model visible but stop record rotation and nonessential camera/highlight motion.

### 3. 3D asset selection checklist

- Clear web-usable license and attribution requirements documented in-repo.
- Downloadable source suitable for GLB/glTF conversion.
- Prefer <= 15k triangles; tolerate somewhat more only if the visual gain is meaningful and optimization is straightforward.
- PBR material separation for wood/dark metal/brass is preferred.
- Horn silhouette must read clearly from the angled hero camera.
- Record/platter must be a separable mesh or easy to split offline.
- Avoid assets dominated by huge 4K/8K texture sets unless they can be downscaled aggressively for the web.
- Final model should visually harmonize with the site's navy/black/gold palette rather than forcing the page to adopt the asset's original colors.

## Verification targets

- Hero copy remains readable at desktop, tablet, and mobile widths.
- Dynamic quote never pushes the CTA or changes the hero's overall height during phrase changes.
- Cursor animation does not cause text reflow.
- Gramophone model loads without blocking first meaningful paint.
- Vinyl rotates around the physically correct local axis with no wobble or texture sliding.
- Tonearm/platter/record perspective remains coherent from the chosen camera angle.
- Gramophone does not overflow into the fixed header or persistent player in an unintended way.
- WebGL failure still leaves a deliberate static hero visual.
- No homepage-specific behavior is introduced into artist/album pages.
