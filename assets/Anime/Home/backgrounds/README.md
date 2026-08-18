# Anime Home Backgrounds

这个目录只存放 `/anime/` 主页使用的全屏背景图。

具体作品的封面、人物、场景等素材不要放在这里，应放到各自的 `assets/Anime/<Series>/` 目录中。

## 建议规格

- 推荐格式：`.webp` 或 `.avif`
- 推荐尺寸：至少 1920 × 1080；高分辨率素材可使用 2560 × 1440
- 建议避免图片本身包含大段文字，因为页面文字始终覆盖在背景之上
- 建议优先使用横向构图，并给主体留出一定留白

## 启用背景

上传图片后，在 `data/anime/home-backgrounds.json` 中登记。

例如：

```json
{
  "schemaVersion": 1,
  "backgrounds": [
    {
      "id": "city-night",
      "src": "/assets/Anime/Home/backgrounds/city-night.webp",
      "sections": ["hero", "series"],
      "position": "center 40%"
    },
    {
      "id": "train-window",
      "src": "/assets/Anime/Home/backgrounds/train-window.webp",
      "sections": ["characters", "scenes"]
    },
    {
      "id": "sunset",
      "src": "/assets/Anime/Home/backgrounds/sunset.webp",
      "sections": ["sound", "recent"]
    }
  ]
}
```

支持的 section：`hero`、`series`、`characters`、`scenes`、`sound`、`recent`。

`sections` 可以省略。省略时，主页会按照背景列表顺序自动循环分配，因此只放 2～3 张图也可以覆盖整个主页。

`position` 对应 CSS `background-position`，可省略，默认使用 `center`。
