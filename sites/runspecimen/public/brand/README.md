# RunSpecimen brand assets

Hand-authored production SVGs for the marketing site, plus marketplace raster packs staged for copy-out. Marks do not require webfonts.

## Site files

| File | Purpose |
|------|---------|
| `mark.svg` | Color specimen-capsule / lease-latch icon (header, app-icon glyph) |
| `mark-mono.svg` | Same mark, `currentColor` strokes for theming |
| `wordmark.svg` | Horizontal lockup: mark + “RunSpecimen” on dark backgrounds |
| `wordmark-mono.svg` | `currentColor` lockup |
| `seal.svg` | Circular instrument emblem (readable at ~128px+) |
| `favicon.svg` | Simplified mark on a dark rounded square for browser tabs |
| `apple-touch-icon.png` | 180×180 opaque raster (no pre-rounded corners; iOS applies the mask) |

Wordmark and seal `<text>` prefer Sora / IBM Plex Mono with `system-ui` / `ui-monospace` fallbacks. Marks are outlined geometry only.

## Color tokens used

| Token | Hex | In these files |
|-------|-----|----------------|
| `--bg` | `#070A0F` | Favicon field, seal ground, **all store masters** |
| `--bg-elevated` | `#0d1219` | Capsule fill |
| `--bg-panel` | `#111821` | Latch-plate fill |
| `--ink` | `#eef3f8` | Wordmark text |
| `--signal` | `#9be56a` | Capsule stroke, tick, seal majors / top legend |
| `--cyan` | `#6ec8ff` | Lease shackle, latch plate, seal minors / bottom legend |

`--signal-deep` (`#6fbf45`) and `--amber` (`#e8b84a`) are site palette tokens not required by this glyph set.

Store rasters are flattened **RGB** (no alpha) on `#070A0F`. Corners are **square** — macOS / iOS apply their own masks.

## Marketplace copy-out

Masters live here for copy into other repos. Do not invent a `package.json` in those repos from this site; wire the fields below when those manifests already exist.

Regenerate rasters: `python3 marketplace/render_icons.py` (CoreSVG 2048px render → RGB flatten → Lanczos downscale → `iconutil`).

### Cursor / VS Code extension

Copy any of these to the extension `icon` path (256 recommended for Retina):

```
brand/marketplace/cursor/icon-128.png
brand/marketplace/cursor/icon-256.png
brand/marketplace/cursor/icon-512.png
```

`package.json` (when the extension manifest exists):

```json
{
  "icon": "media/icon.png",
  "galleryBanner": {
    "color": "#070A0F",
    "theme": "dark"
  }
}
```

Use `icon-256.png` (or `icon-512.png`) as `media/icon.png`. Gallery banner color is brand `--bg`.

### Codex / OpenAI plugins

Plugin convention is `./assets/...` inside the plugin package. Copy:

```
brand/marketplace/codex/logo.png              →  assets/logo.png          (512×512 PNG)
brand/marketplace/codex/logo-512.png          →  alias of logo.png
brand/marketplace/codex/composer-icon.png     →  assets/composer-icon.png (128×128 PNG, ~6 KB)
brand/marketplace/codex/composer-icon-128.png →  alias of composer-icon.png
brand/marketplace/codex/logo.svg              →  assets/logo.svg          (512×512, square viewBox)
brand/marketplace/codex/composer-icon.svg     →  assets/composer-icon.svg (128×128, square viewBox)
```

`interface.logo` and `interface.composerIcon` are required on submission. SVGs are UTF-8 with numeric `width` / `height` / square `viewBox` (min 48). Rasters are square RGB PNG, well under 5 MiB.

Shared vector source (same glyph, 1024 numeric canvas):

```
brand/marketplace/shared/mark-on-field.svg
```

### macOS App Store / Mac

```
brand/marketplace/macos/AppIcon-1024.png
brand/marketplace/macos/AppIcon.iconset/icon_16x16.png
brand/marketplace/macos/AppIcon.iconset/icon_16x16@2x.png
brand/marketplace/macos/AppIcon.iconset/icon_32x32.png
brand/marketplace/macos/AppIcon.iconset/icon_32x32@2x.png
brand/marketplace/macos/AppIcon.iconset/icon_128x128.png
brand/marketplace/macos/AppIcon.iconset/icon_128x128@2x.png
brand/marketplace/macos/AppIcon.iconset/icon_256x256.png
brand/marketplace/macos/AppIcon.iconset/icon_256x256@2x.png
brand/marketplace/macos/AppIcon.iconset/icon_512x512.png
brand/marketplace/macos/AppIcon.iconset/icon_512x512@2x.png
brand/marketplace/macos/AppIcon.icns
```

Xcode: point the app icon set at `AppIcon.iconset` or drop `AppIcon.icns`. App Store 1024 is `AppIcon-1024.png` — square, opaque `#070A0F`, **not** pre-rounded.

### Shared master

```
brand/marketplace/shared/master-1024.png   RGB, no alpha, square, #070A0F field
```
