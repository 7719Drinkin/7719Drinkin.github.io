from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets"
DESTINATION = ASSETS / "Basketball" / "MJ"
SUPPORTED_IMAGES = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
TEXT_SUFFIXES = {".html", ".css", ".js", ".json", ".md"}
SKIP_DIRS = {".git", ".github", "node_modules"}

GALLERY_MARKUP = """      <div id="gallery-wall" class="gallery-wall">
        <article class="gallery-card gallery-card--feature gallery-card--motion"><img src="/assets/Basketball/MJ/1719206567496.gif" alt="Michael Jordan tribute frame 01" loading="eager" decoding="async"><div class="card-label"><span>01</span><small>MOTION</small><strong>TAKEOFF</strong></div></article>
        <article class="gallery-card gallery-card--tall"><img src="/assets/Basketball/MJ/15942445778634938029.JPG" alt="Michael Jordan tribute frame 02" loading="eager" decoding="async"><div class="card-label"><span>02</span><strong>AIR</strong></div></article>
        <article class="gallery-card gallery-card--wide gallery-card--motion"><img src="/assets/Basketball/MJ/1719206571910.gif" alt="Michael Jordan tribute frame 03" loading="eager" decoding="async"><div class="card-label"><span>03</span><small>MOTION</small><strong>HANGTIME</strong></div></article>
        <article class="gallery-card"><img src="/assets/Basketball/MJ/17882157698450135981.JPG" alt="Michael Jordan tribute frame 04" loading="eager" decoding="async"><div class="card-label"><span>04</span><strong>FLIGHT</strong></div></article>
        <article class="gallery-card gallery-card--tall gallery-card--motion"><img src="/assets/Basketball/MJ/1719206583651.gif" alt="Michael Jordan tribute frame 05" loading="lazy" decoding="async"><div class="card-label"><span>05</span><small>MOTION</small><strong>FOOTWORK</strong></div></article>
        <article class="gallery-card gallery-card--wide"><img src="/assets/Basketball/MJ/10196131834617797520.JPG" alt="Michael Jordan tribute frame 06" loading="lazy" decoding="async"><div class="card-label"><span>06</span><strong>FOCUS</strong></div></article>
        <article class="gallery-card gallery-card--feature gallery-card--motion"><img src="/assets/Basketball/MJ/1719206586380.gif" alt="Michael Jordan tribute frame 07" loading="lazy" decoding="async"><div class="card-label"><span>07</span><small>MOTION</small><strong>DRIVE</strong></div></article>
        <article class="gallery-card"><img src="/assets/Basketball/MJ/10488980165229573680.JPG" alt="Michael Jordan tribute frame 08" loading="lazy" decoding="async"><div class="card-label"><span>08</span><strong>CLUTCH</strong></div></article>
        <article class="gallery-card gallery-card--wide gallery-card--motion"><img src="/assets/Basketball/MJ/1719206589518.gif" alt="Michael Jordan tribute frame 09" loading="lazy" decoding="async"><div class="card-label"><span>09</span><small>MOTION</small><strong>RHYTHM</strong></div></article>
        <article class="gallery-card gallery-card--tall"><img src="/assets/Basketball/MJ/11775843438435290282.JPG" alt="Michael Jordan tribute frame 10" loading="lazy" decoding="async"><div class="card-label"><span>10</span><strong>RISE</strong></div></article>
        <article class="gallery-card gallery-card--motion"><img src="/assets/Basketball/MJ/1719206594945.gif" alt="Michael Jordan tribute frame 11" loading="lazy" decoding="async"><div class="card-label"><span>11</span><small>MOTION</small><strong>CONTROL</strong></div></article>
        <article class="gallery-card gallery-card--feature"><img src="/assets/Basketball/MJ/12114021349949282200.JPG" alt="Michael Jordan tribute frame 12" loading="lazy" decoding="async"><div class="card-label"><span>12</span><strong>LEGACY</strong></div></article>
        <article class="gallery-card gallery-card--tall gallery-card--motion"><img src="/assets/Basketball/MJ/1719206599848.gif" alt="Michael Jordan tribute frame 13" loading="lazy" decoding="async"><div class="card-label"><span>13</span><small>MOTION</small><strong>PRESSURE</strong></div></article>
        <article class="gallery-card gallery-card--wide"><img src="/assets/Basketball/MJ/16706842144915762594.JPG" alt="Michael Jordan tribute frame 14" loading="lazy" decoding="async"><div class="card-label"><span>14</span><strong>23</strong></div></article>
        <article class="gallery-card gallery-card--feature gallery-card--motion"><img src="/assets/Basketball/MJ/1719206605569.gif" alt="Michael Jordan tribute frame 15" loading="lazy" decoding="async"><div class="card-label"><span>15</span><small>MOTION</small><strong>FIRE</strong></div></article>
        <article class="gallery-card"><img src="/assets/Basketball/MJ/18251605632468628377.JPG" alt="Michael Jordan tribute frame 16" loading="lazy" decoding="async"><div class="card-label"><span>16</span><strong>GLORY</strong></div></article>
        <article class="gallery-card gallery-card--wide gallery-card--motion"><img src="/assets/Basketball/MJ/1719206609737.gif" alt="Michael Jordan tribute frame 17" loading="lazy" decoding="async"><div class="card-label"><span>17</span><small>MOTION</small><strong>FOREVER</strong></div></article>
        <article class="gallery-card gallery-card--feature"><img src="/assets/Basketball/MJ/5389104262546023871.JPG" alt="Michael Jordan tribute frame 18" loading="lazy" decoding="async"><div class="card-label"><span>18</span><strong>ICON</strong></div></article>
      </div>"""

MOTION_CSS = r"""
/* 2026 MJ wall refresh: animated studies from the new GIF set. */
.gallery-card--motion {
  border-color: rgba(215, 25, 32, 0.3);
  box-shadow: inset 0 0 0 1px rgba(215, 25, 32, 0.08);
}

.gallery-card--motion .card-label small {
  position: absolute;
  right: 20px;
  bottom: 58px;
  padding: 5px 8px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.82);
  background: rgba(5, 5, 5, 0.62);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.2em;
  backdrop-filter: blur(8px);
}

.gallery-card--motion:hover {
  border-color: rgba(215, 25, 32, 0.58);
}

@media (max-width: 820px) {
  .gallery-card--motion .card-label small {
    right: 14px;
    bottom: 48px;
    padding: 4px 6px;
    font-size: 7px;
  }
}
"""


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_if_changed(path: Path, content: str) -> bool:
    old = read_text(path)
    if old == content:
        return False
    path.write_text(content, encoding="utf-8")
    return True


def move_root_images() -> list[str]:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    moved: list[str] = []

    for source in sorted(ASSETS.iterdir(), key=lambda item: item.name.lower()):
        if not source.is_file() or source.suffix.lower() not in SUPPORTED_IMAGES:
            continue

        target = DESTINATION / source.name
        if target.exists():
            raise RuntimeError(f"Destination already exists: {target.relative_to(ROOT)}")
        source.rename(target)
        moved.append(source.name)

    if not moved:
        moved = sorted(
            [
                item.name
                for item in DESTINATION.iterdir()
                if item.is_file() and item.suffix.lower() in SUPPORTED_IMAGES
            ],
            key=str.lower,
        )

    if not moved:
        raise RuntimeError("No MJ image files were found to migrate.")

    return moved


def update_asset_references(moved: list[str]) -> int:
    changed = 0
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue

        text = read_text(path)
        updated = text
        for name in moved:
            updated = updated.replace(
                f"/assets/{name}",
                f"/assets/Basketball/MJ/{name}",
            )

        if updated != text:
            path.write_text(updated, encoding="utf-8")
            changed += 1

    return changed


def update_archive(moved: list[str]) -> None:
    archive_path = ROOT / "archive.js"
    text = read_text(archive_path)
    text = text.replace(
        "contents/assets?ref=main",
        "contents/assets/Basketball/MJ?ref=main",
    )
    text = text.replace(
        "`/assets/${encodeURIComponent(name)}`",
        "`/assets/Basketball/MJ/${encodeURIComponent(name)}`",
    )
    text = text.replace(
        "image.loading = index < 10 ? 'eager' : 'lazy';",
        "image.loading = index < 4 ? 'eager' : 'lazy';",
    )

    fallback_lines = ",\n".join(
        f"  {json.dumps(name)}" for name in sorted(moved, key=str.lower)
    )
    replacement = "const fallbackAssets = [\n" + fallback_lines + "\n];"
    text, count = re.subn(
        r"const fallbackAssets = \[.*?\n\];",
        replacement,
        text,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise RuntimeError("Could not update archive fallback asset list.")

    write_if_changed(archive_path, text)


def update_mj_wall() -> None:
    page_path = ROOT / "basketball" / "michael-jordan" / "index.html"
    text = read_text(page_path)
    text = text.replace(
        "<span>16 CURATED FRAMES</span>",
        "<span>18 CURATED FRAMES · 9 MOTION STUDIES</span>",
    )
    text = re.sub(
        r'      <div id="gallery-wall" class="gallery-wall">.*?      </div>\n\n      <a class="archive-entry',
        GALLERY_MARKUP + '\n\n      <a class="archive-entry',
        text,
        count=1,
        flags=re.S,
    )
    text = text.replace(
        "/gallery-fit.css?v=20260730-2",
        "/gallery-fit.css?v=20260805-1",
    )
    text = text.replace(
        "/gallery-fit.js?v=20260730-1",
        "/gallery-fit.js?v=20260805-1",
    )
    write_if_changed(page_path, text)

    gallery_css_path = ROOT / "gallery-fit.css"
    css = read_text(gallery_css_path)
    marker = "/* 2026 MJ wall refresh:"
    if marker not in css:
        css = css.rstrip() + "\n\n" + MOTION_CSS.strip() + "\n"
    write_if_changed(gallery_css_path, css)


def bump_archive_cache() -> None:
    page_path = ROOT / "basketball" / "michael-jordan" / "archive" / "index.html"
    text = read_text(page_path)
    text = re.sub(
        r"/archive\.js\?v=[^\"']+",
        "/archive.js?v=20260805-1",
        text,
        count=1,
    )
    write_if_changed(page_path, text)


def main() -> None:
    moved = move_root_images()
    reference_files = update_asset_references(moved)
    update_archive(moved)
    update_mj_wall()
    bump_archive_cache()

    print(f"Moved {len(moved)} MJ images into assets/Basketball/MJ/")
    print(f"Updated asset references in {reference_files} text files.")
    print("Refreshed the curated MJ wall with all nine new GIFs.")


if __name__ == "__main__":
    main()
