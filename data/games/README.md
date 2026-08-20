# Games data model

`Games` is a personal archive, not a replacement for official sites or game encyclopedias.

## Home catalog

`catalog.json` drives `/games/`.

```json
{
  "schemaVersion": 1,
  "home": {
    "heroBackground": "/assets/Games/Home/backgrounds/example.webp",
    "heroPosition": "50% 50%"
  },
  "games": [],
  "featured": {
    "explore": [],
    "moments": [],
    "sound": [],
    "memory": []
  },
  "recent": []
}
```

The homepage uses six stable entry points:

- `LIBRARY`: canonical game entries.
- `EXPLORE`: cross-game selections of any type: world, character, system, vehicle, faction, map, equipment, etc.
- `MOMENTS`: screenshots and remembered scenes.
- `SOUND`: selected OST, themes, radio or other audio entries.
- `MEMORY`: personal play history and notes.
- `RECENT`: recent starts, completions, returns or new records.

Do not create fake entries merely to fill a section. Empty arrays are valid.

## Game detail

A game detail file should live at `data/games/games/<slug>.json` when the first real game is added.

The page model is deliberately modular. Only `overview` is conceptually required. `modules` must describe what actually matters for that game rather than forcing every game to have characters, worlds or any other fixed category.

```json
{
  "schemaVersion": 1,
  "slug": "example-game",
  "title": "示例游戏",
  "titleEn": "Example Game",
  "overview": {
    "hero": "/assets/Games/ExampleGame/hero/main.webp",
    "summary": "",
    "summaryEn": "",
    "status": "playing",
    "platforms": ["PC"],
    "firstPlayed": null,
    "lastPlayed": null
  },
  "modules": [
    {
      "id": "systems",
      "type": "system",
      "title": "系统",
      "titleEn": "SYSTEMS",
      "items": []
    }
  ],
  "externalSources": [],
  "memory": []
}
```

`modules[].type` is open-ended. Examples include:

`world`, `character`, `system`, `vehicle`, `faction`, `map`, `equipment`, `build`, `record`, `civilization`, `location`, `visual`.

A game with no characters should simply have no character module.

## External sources

Official sites, wikis, databases and interactive maps should be treated as first-class sources instead of copying entire encyclopedias into 7719.

```json
{
  "type": "wiki",
  "label": "Official Wiki",
  "url": "https://example.com/wiki",
  "mode": "link"
}
```

Supported design intent:

- `mode: "link"` is the default and safest integration.
- If a source provides a stable API, a future build step may fetch a small amount of structured information and cache it locally.
- `iframe` embedding should only be used after the source is verified to permit framing through its CSP / X-Frame-Options policy.
- External data should remain attributed to its source and should not become an uncontrolled copy of the source site.

## Routing

Canonical game pages use:

`/games/<game-slug>/`

Optional deeper routes may be added only when the content justifies them, for example:

`/games/<game-slug>/characters/<character-slug>/`

Do not create a top-level `/games/characters/` or `/games/worlds/` hierarchy as the canonical data model. Cross-game homepage sections are discovery shortcuts only.
