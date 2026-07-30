# 7719 Solar Universe — 3D Experiment

## 1. Experiment goal

This branch explores a full-screen interactive solar-system homepage. Each registered interest becomes one planet. The star and orbital layout are navigation metaphors rather than an astronomically accurate simulation.

The production homepage on `main` remains unchanged.

## 2. Technical approach

- Static GitHub Pages deployment
- Three.js loaded as an ES module from a pinned CDN version
- WebGL 2 renderer
- Procedural planet surfaces generated with Canvas textures
- No external planet images, 3D models or high-resolution texture downloads
- DOM labels projected from 3D world positions
- Raycasting for hover and selection
- OrbitControls for drag and zoom navigation
- Interest data loaded from `data/interests.json`

## 3. Why the model is symbolic

Real solar-system scale is unsuitable for a navigation interface. If planet diameter and orbital distance used real proportions, most planets would be visually tiny and difficult to select.

The experiment therefore uses:

- Compressed orbital distances
- Enlarged planets
- Slower and simplified orbital motion
- A fixed central light source
- No gravity or physical simulation

This keeps the interaction understandable while preserving the solar-system concept.

## 4. Performance budget

### Desktop quality mode

- Pixel ratio capped at 1.7
- Approximately 3,300 star points
- Planet sphere geometry uses 48 longitudinal segments
- Procedural textures up to 512 × 256
- No shadow maps
- No bloom or post-processing composer

### Mobile / eco mode

- Pixel ratio capped near 1.1–1.15
- Approximately 1,100 star points
- Planet geometry reduced to 24 segments
- Procedural textures reduced to 256 × 128
- Antialiasing disabled
- Renderer requests the low-power GPU profile

### Runtime controls

- The animation loop pauses when the tab is hidden
- Users can switch between Eco and Quality modes
- `prefers-reduced-motion` disables automatic orbital movement
- Rendering falls back to static HTML navigation when WebGL 2 is unavailable or initialization fails

## 5. Extensibility

Planets are created from the interest registry:

```text
data/interests.json
        ↓
loadInterests()
        ↓
createPlanet()
        ↓
3D planet + DOM label + information panel
```

Adding a new interest normally requires:

1. Add an entry to `data/interests.json`.
2. Create its route and page.
3. Optionally add a visual profile to `planetThemes`.

If no profile exists, the default planet material is used.

Orbital radius is calculated from the registry index, so additional interests automatically create additional orbits. For more than roughly eight to ten interests, the design should evolve into one of these strategies:

- Multiple solar systems grouped by interest category
- A zoomable galaxy map containing several systems
- Pagination or sector navigation
- Dynamically compressed orbit spacing

## 6. Known constraints

- Three.js is loaded from a CDN, so the first load depends on an external network request.
- WebGL performance varies significantly between integrated GPUs, mobile devices and browser power-saving modes.
- A continuous 3D canvas uses more battery than the normal `main` homepage.
- Screen readers cannot interpret the 3D canvas itself, so the static fallback and information panel remain necessary.
- Accurate shadows, volumetric nebulae and bloom would materially increase GPU and memory cost and are deliberately excluded from this prototype.

## 7. Evaluation criteria

Before considering a merge into `main`, test:

- Chrome, Edge, Firefox and Safari
- Desktop integrated graphics and discrete graphics
- Android and iOS devices
- High-DPI screens
- Reduced-motion mode
- WebGL-disabled fallback
- Touch drag and zoom behavior
- Initial load on slower networks
- Navigation reliability for every planet

This branch should be treated as an interaction experiment, not yet as the production homepage.
