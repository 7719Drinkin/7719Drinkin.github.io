# Games assets

Use one canonical asset directory per game. Homepage-only imagery stays separate.

```text
assets/Games/
├── Home/
│   └── backgrounds/
│
└── <GameName>/
    ├── hero/
    ├── world/
    ├── characters/
    ├── moments/
    ├── visuals/
    └── thumbnails/
```

`Home/backgrounds/` is reserved for `/games/` background imagery. Do not duplicate a game asset into `Home/` unless the homepage requires a dedicated crop or composite.

Per-game folders are optional by content. A game with no character material does not need a `characters/` directory. Other game-specific folders such as `vehicles/`, `systems/`, `maps/`, `equipment/` or `records/` may be introduced when needed.

Prefer local images for archive visuals. Large video files should not be committed to GitHub Pages; store provider URLs / IDs in game data and embed or link to the external source when appropriate.
