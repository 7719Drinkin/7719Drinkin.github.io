# Music Visual Archive 数据格式

歌手详情文件位于：

```text
data/music/artists/<artist-slug>.json
```

`gallery` 数组可以同时放置本地图片、YouTube 视频和哔哩哔哩视频。生成后的页面会把视频与照片分成两个独立区域：

```text
影像放映 / VIDEO ARCHIVE
照片记录 / PHOTO ARCHIVE
```

## 本地图片

```json
{
  "src": "/assets/Music/Artists/ZhangYusheng/gallery/example.jpg",
  "alt": "张雨生演出影像",
  "caption": "可选说明文字"
}
```

## YouTube

支持普通观看地址、短链接、Shorts 地址和 Embed 地址：

```json
{
  "type": "video",
  "provider": "youtube",
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "title": "视频标题",
  "caption": "可选说明文字",
  "poster": "/assets/Music/Artists/ZhangYusheng/gallery/video-poster.jpg"
}
```

`poster` 可以省略。省略时使用 YouTube 的视频缩略图，点击后才加载播放器。

也可以直接提供 ID：

```json
{
  "type": "video",
  "provider": "youtube",
  "videoId": "VIDEO_ID",
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "title": "视频标题"
}
```

## 哔哩哔哩

普通 BV 地址：

```json
{
  "type": "video",
  "provider": "bilibili",
  "url": "https://www.bilibili.com/video/BVxxxxxxxxxx/",
  "title": "视频标题",
  "caption": "可选说明文字",
  "quality": 80
}
```

哔哩哔哩卡片直接嵌入官方外链播放器，并启用播放器自身的 `poster=1` 封面，因此未播放时显示视频原始封面，而不是网站生成的抽象占位图。

`quality` 默认是 `80`，页面会同时传递 `high_quality=1` 和 `qn=80` 作为高清偏好。但是哔哩哔哩外链播放器最终仍会依据访客网络、登录状态、视频可用清晰度和平台策略选择实际档位；站外页面无法跨域强制修改播放器内部的清晰度菜单。

多 P 视频可以增加 `page`：

```json
{
  "type": "video",
  "provider": "bilibili",
  "url": "https://www.bilibili.com/video/BVxxxxxxxxxx/",
  "page": 2,
  "quality": 80,
  "title": "第二部分"
}
```

也可以显式填写 `bvid`：

```json
{
  "type": "video",
  "provider": "bilibili",
  "bvid": "BVxxxxxxxxxx",
  "url": "https://www.bilibili.com/video/BVxxxxxxxxxx/",
  "title": "视频标题"
}
```

不建议使用 `b23.tv` 短链接，因为静态构建不会请求外部网站解析重定向。请使用完整的 `bilibili.com/video/BV...` 地址。

## 手动 Embed URL

仅当普通链接无法解析时使用。允许的播放器域名为：

- `www.youtube-nocookie.com`
- `www.youtube.com`
- `player.bilibili.com`

```json
{
  "type": "video",
  "provider": "bilibili",
  "url": "原始视频页面地址",
  "embedUrl": "https://player.bilibili.com/player.html?bvid=BVxxxxxxxxxx&p=1&poster=1",
  "title": "视频标题"
}
```

## 展示与性能

- 视频和照片使用独立的布局，不再混入同一个不对称网格。
- 图片继续使用延迟加载。
- 哔哩哔哩播放器使用浏览器原生 `loading="lazy"`，接近视口时再加载。
- YouTube 使用视频缩略图，点击后才创建播放器。
- YouTube 默认使用隐私增强域名 `youtube-nocookie.com`。
- 每个视频卡片保留原始来源链接，嵌入受限或需要手动选择更高清晰度时可以跳转原网站。
