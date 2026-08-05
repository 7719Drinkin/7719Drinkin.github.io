# Music media hierarchy

Music assets are organized by content type and artist.

```text
assets/Music/
└── Artists/
    ├── ZhangYusheng/
    │   ├── hero/
    │   ├── portraits/
    │   ├── albums/
    │   └── gallery/
    └── TanYonglin/
        ├── hero/
        ├── portraits/
        ├── albums/
        └── gallery/
```

Each artist is registered in `data/music/artists.json` and has a matching detail file in `data/music/artists/`.

Audio files are hosted outside the GitHub repository in Cloudflare R2. The player reads complete encoded object URLs from the artist detail JSON, so original Chinese object names can be preserved without changing the website routing model.

The player uses explicit synchronized width and height transitions, with a compact right-bottom collapsed state.
