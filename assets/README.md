# Website assets

这里只放你自己提供或确认使用的图片、GIF 和视频封面。

## 首页素材

- `hero.gif`：首页全屏主视觉，建议横版 1920 × 1080
- `portrait.jpg`：Legacy 区域竖版图片，建议 3:4

## 图片墙素材

图片墙目前提供 14 个位置。文件扩展名可以使用 `.jpg`、`.png`、`.webp` 或 `.gif`，只要在 `index.html` 中保持一致即可。

- `moment-01.jpg`
- `moment-02.jpg`
- `moment-03.jpg`
- `moment-04.jpg`
- `moment-05.jpg`
- `moment-06.jpg`
- `moment-07.jpg`
- `moment-08.jpg`
- `moment-09.jpg`
- `moment-10.jpg`
- `moment-11.jpg`
- `moment-12.jpg`
- `moment-13.jpg`
- `moment-14.jpg`

在 `index.html` 中找到对应的占位元素：

```html
<div class="media-slot placeholder">
  <span>IMAGE / GIF 01</span>
  <small>moment-01</small>
</div>
```

替换为：

```html
<img src="assets/moment-01.jpg" alt="Basketball moment 01" loading="lazy">
```

真实图片会自动获得悬停放大和点击全屏预览效果。需要增加更多位置时，复制任意一个 `gallery-card` 即可。

YouTube 视频不需要上传到此目录。只需在 `index.html` 中找到 `VIDEO_ID`，替换为视频地址中的 ID，并按照注释启用 iframe。