# 7719 Universe Architecture

## 1. Purpose

The root site is an interest registry and navigation layer. Each interest is an independent module, and each detailed subject is a collection under an interest.

```text
Universe
└── Interest
    └── Collection
        └── Archive
```

Current implementation:

```text
/
├── basketball/
│   └── michael-jordan/
│       └── archive/
├── movies/
├── games/
└── music/
```

## 2. Design patterns

### Registry pattern

`data/interests.json` is the source of truth for homepage interest entries. The homepage must not hard-code the final list of interests.

### Factory pattern

`js/universe.js` contains `InterestCardFactory`, which converts one registry record into a standard homepage card.

### Template method

Interest landing pages share the same structural sequence:

1. Global navigation
2. Interest hero
3. Collection grid
4. Back to Universe
5. Shared footer

The content and theme change, while the structure remains stable.

### Strategy pattern

Collections may choose different content strategies without changing the root site:

- Curated gallery
- Complete archive
- YouTube film section
- Poster wall
- Timeline
- Screenshot gallery

### Repository pattern

The MJ archive reads media through one repository boundary: GitHub's `assets` directory API, with a local static fallback. Page components do not need to know how the file list is obtained.

## 3. Shared resources

```text
css/universe.css       Shared homepage and interest-page design system
js/universe.js         Registry loading, card factory and shared reveal behavior
data/interests.json    Interest registry
```

Existing MJ-specific assets remain at the repository root for backward compatibility:

```text
styles.css
script.js
gallery-fit.css
gallery-fit.js
archive.css
archive.js
assets/
```

## 4. Adding a new interest

1. Create `/new-interest/index.html` using an existing interest page as a template.
2. Add one entry to `data/interests.json`.
3. Select a theme identifier or add a new theme class to `css/universe.css`.
4. Keep interest-specific media in a dedicated assets subdirectory when practical.
5. Add collections under `/new-interest/collection-name/`.
6. Reuse existing gallery, archive, video and navigation components before creating new ones.

Example registry entry:

```json
{
  "id": "photography",
  "title": "Photography",
  "subtitle": "Frames from the world around me.",
  "description": "Personal photos and visual observations.",
  "route": "/photography/",
  "theme": "photography",
  "status": "preview",
  "number": "05",
  "cover": null
}
```

## 5. Routing rules

- `/` is always the Universe homepage.
- `/<interest>/` is an interest landing page.
- `/<interest>/<collection>/` is a detailed collection.
- `/<interest>/<collection>/archive/` is the collection's full media archive.
- Short routes such as `/mj/` may redirect to canonical collection routes.

## 6. Extension principles

- Data before markup: register new entries instead of manually editing the homepage card grid.
- Shared component before duplication: reuse navigation, card and archive behavior.
- Collection isolation: changes inside one interest should not affect another interest.
- Progressive publishing: unfinished interests may exist as preview pages.
- Backward compatibility: old public links should redirect rather than disappear.
