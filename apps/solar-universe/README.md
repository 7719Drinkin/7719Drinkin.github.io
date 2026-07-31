# 7719 Solar Universe

An isolated React Three Fiber application that renders personal interests as miniature 3D worlds. It is designed for `/solar-universe/` while the existing static homepage and interest pages remain independently deployable.

## Current stage

The project is in an Alpha visual-polish phase.

- The shared solar-system scene, camera, orbit, lighting, HUD and deployment pipeline are implemented.
- Basketball / The Last Court is the completed reference world and is undergoing final visual validation.
- Games and Music currently use forming-world placeholders and remain the next major content phase.
- Pull requests are published to `/preview/solar-universe/` for review before the feature branch is merged.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

The normal Vite base path is `/solar-universe/`. The GitHub Actions pull-request workflow overrides it with `/preview/solar-universe/`. Production output is written to `dist/`.

## Deployment

- Pages source: GitHub Actions
- Production site: `https://7719drinkin.github.io/`
- Production 3D experience: `https://7719drinkin.github.io/solar-universe/`
- Pull-request preview: `https://7719drinkin.github.io/preview/solar-universe/`
- Workflow: `.github/workflows/deploy-pages.yml`

A push to `main` builds the Vite application with `/solar-universe/` as its base path, assembles the complete static site, uploads a GitHub Pages artifact and deploys it through the `github-pages` environment.

## Architecture

- `src/scene/` — Canvas, camera controller, orbital system, gravity grid, Sun and render pipeline
- `src/worlds/` — complete interest worlds and the shared procedural terrain generator
- `src/basketball/` — court layout, stands, court dynamics, living terrain details, 23 monument and championship satellites
- `src/ui/` — DOM HUD and celestial information panel
- `src/data/` — orbit, axial rotation, route and world metadata

`PlanetSystem.jsx` owns only generic celestial mechanics. Interest-specific landmarks are composed inside their world component. Basketball satellites remain under the planet carrier but outside the axial body, so they orbit independently instead of inheriting surface rotation.

## Motion model

Orbital motion and axial rotation use separate scene nodes and independent angular velocities. Selecting a body changes the camera target without pausing either motion.

The Basketball championship system contains two non-coplanar three-peat orbits:

- 1991 / 1992 / 1993
- 1996 / 1997 / 1998

All six trophies share the same geometry, material, scale and axial spin. Each trophy counteracts the parent revolution angle before applying its own stable vertical-axis rotation, preventing orbital tumbling.

## Basketball world

The reference world currently includes:

- a procedural living surface with vegetation, grassland, clay regions, lakes and trails
- a shallow north-pole court integrated into a flattened terrain zone
- low sideline stands and a reduced miniature crowd
- a replay basketball whose trajectory is derived from the shared hoop layout and passes through the rim
- animated sideline light waves and a restrained court pulse
- a layered programmatic 23 monument
- two non-coplanar championship satellite orbits

Shared court dimensions and hoop coordinates are centralized in `src/basketball/courtLayout.js` so the court mesh, stands and replay animation remain aligned.

## Rendering controls

The HUD provides:

- Quality / Eco rendering modes
- orbit-line visibility
- gravity-grid visibility
- solar output from 25% to 250%

The Sun combines a procedural photosphere, chromosphere, intermittent flare, concentrated HDR radiance and nonlinear point-light output. Its visible halo is intentionally restrained while planetary illumination remains strong.

## Assets and attribution

The 3D visuals are generated from programmatic geometry, shaders and canvas textures. No external image or video assets are bundled in the current scene.

The trophy and number designs are original non-commercial tribute models that reference broad visual language. They do not include official NBA or Chicago Bulls logos or asset files.
