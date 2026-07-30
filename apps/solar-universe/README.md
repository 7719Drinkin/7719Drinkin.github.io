# 7719 Solar Universe

An isolated React Three Fiber application that renders personal interests as miniature 3D worlds. It is designed to be deployed at `/solar-universe/` while the existing static homepage and interest pages remain unchanged.

## Commands

```bash
npm install
npm run dev
npm run build
```

The Vite base path is fixed to `/solar-universe/`. The production build is written to `dist/`.

## Architecture

- `src/scene/` — camera, orbital system, lighting and render pipeline
- `src/worlds/` — one component per interest world
- `src/basketball/` — The Last Court landmarks, Bulls-inspired 23 monument and championship gallery
- `src/ui/` — DOM HUD and planet information panel
- `src/data/` — orbit, axial rotation and route metadata

Orbital motion and axial rotation are represented by different scene nodes and independent angular velocities. Selecting a planet changes only the camera target; it does not alter axial rotation.

The trophy and number designs are original tribute models that reference broad visual language. They do not include official NBA or Chicago Bulls logos or asset files.
