# Anime catalog data model

The Anime archive is **series-first**.

User-facing hierarchy:

```text
ANIME
└── SERIES
    ├── Characters
    ├── Selected Scenes
    ├── Releases
    ├── Video Archive
    ├── Music
    ├── Visual Archive
    └── Personal Memory
```

Seasons, films, OVAs and specials are release metadata inside a series. They do not create another required page level.

Homepage character, scene and sound sections are shortcuts only. They reference content already owned by a series.

## Route convention

```text
/anime/<series>/
/anime/<series>/characters/<character>/
/anime/<series>/scenes/<scene>/
```

There is intentionally no required route such as `/anime/<series>/season-1/`.

## Catalog shape

`data/anime/catalog.json`:

```json
{
  "schemaVersion": 1,
  "series": [],
  "featured": {
    "series": [],
    "characters": [],
    "scenes": [],
    "sounds": []
  },
  "recent": []
}
```

A series entry may use this shape:

```json
{
  "id": "example-series",
  "slug": "example-series",
  "route": "/anime/example-series/",
  "title": {
    "zh": "示例系列",
    "en": "Example Series",
    "ja": ""
  },
  "years": "2020 — 2024",
  "tagline": {
    "zh": "一句个人定义。",
    "en": "A short personal definition."
  },
  "cover": "/assets/Anime/ExampleSeries/cover.jpg",
  "releases": [
    {
      "id": "season-1",
      "type": "season",
      "title": { "zh": "第一季", "en": "Season 1" },
      "year": "2020",
      "video": null
    }
  ],
  "characters": [
    {
      "id": "character-a",
      "slug": "character-a",
      "name": { "zh": "角色 A", "en": "Character A" },
      "image": null,
      "note": { "zh": "", "en": "" }
    }
  ],
  "scenes": [
    {
      "id": "scene-a",
      "slug": "scene-a",
      "title": { "zh": "场景 A", "en": "Scene A" },
      "release": "Season 1",
      "episode": "EP. 01",
      "image": null,
      "note": { "zh": "", "en": "" }
    }
  ],
  "music": [
    {
      "id": "track-a",
      "title": { "zh": "歌曲 A", "en": "Track A" },
      "artist": "",
      "type": "OP",
      "release": "Season 1",
      "url": null
    }
  ],
  "videos": [],
  "visuals": [],
  "memory": {}
}
```

## Featured references

Series references use the series id:

```json
"series": ["example-series"]
```

Characters, scenes and sounds use `seriesId:itemId`:

```json
"characters": ["example-series:character-a"],
"scenes": ["example-series:scene-a"],
"sounds": ["example-series:track-a"]
```

The homepage renderer resolves those references back into the owning series, so featured content never becomes a separate global content library.
