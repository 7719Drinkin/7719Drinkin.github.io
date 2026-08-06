# Music Visual Archive 数据格式

歌手详情文件位于：

```text
data/music/artists/<artist-slug>.json
```

`gallery` 数组可以同时放置本地图片、YouTube 视频和哔哩哔哩视频。页面不会在初次打开时创建外部播放器；访客点击视频卡片后才加载 iframe。

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

`poster` 可省略。省略时使用网站自身的抽象视频占位图，不会在页面加载阶段请求 YouTube 缩略图。

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
  "caption": "可选说明文字"
}
```

多 P 视频可增加 `page`：

```json
{
  "type": "video",
  "provider": "bilibili",
  "url": "https://www.bilibili.com/video/BVxxxxxxxxxx/",
  "page": 2,
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
  "embedUrl": "https://player.bilibili.com/player.html?bvid=BVxxxxxxxxxx&page=1",
  "title": "视频标题"
}
```

## 展示与性能

- 图片继续使用延迟加载。
- 外部视频播放器只有在用户点击卡片后才创建。
- YouTube 默认使用隐私增强域名 `youtube-nocookie.com`。
- 视频卡片始终保留原始来源链接，嵌入受限时可以跳转到原网站观看。
