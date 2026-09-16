#!/usr/bin/env python3
"""Rasterize RunSpecimen marketplace icons from mark-on-field.svg.

Renders the SVG once at 2048px via CoreSVG (AppKit), flattens to opaque
RGB #070A0F (no alpha), then Lanczos-downscales every store size.
"""
from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

BRAND = Path(__file__).resolve().parents[1]
MP = BRAND / "marketplace"
MASTER_SVG = MP / "shared" / "mark-on-field.svg"
BG = (0x07, 0x0A, 0x0F)  # #070A0F

SWIFT = r"""
import AppKit
import Foundation

guard CommandLine.arguments.count >= 4 else { exit(1) }
let src = URL(fileURLWithPath: CommandLine.arguments[1])
let dest = URL(fileURLWithPath: CommandLine.arguments[2])
guard let sizePx = Int(CommandLine.arguments[3]) else { exit(1) }
guard let image = NSImage(contentsOf: src) else {
    fputs("failed to load SVG\n", stderr)
    exit(1)
}
let size = NSSize(width: sizePx, height: sizePx)
guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: sizePx,
    pixelsHigh: sizePx,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else { exit(1) }
rep.size = size
NSGraphicsContext.saveGraphicsState()
guard let ctx = NSGraphicsContext(bitmapImageRep: rep) else { exit(1) }
NSGraphicsContext.current = ctx
NSColor(srgbRed: 7.0/255.0, green: 10.0/255.0, blue: 15.0/255.0, alpha: 1).setFill()
NSBezierPath(rect: NSRect(origin: .zero, size: size)).fill()
image.draw(
    in: NSRect(origin: .zero, size: size),
    from: .zero,
    operation: .sourceOver,
    fraction: 1.0,
    respectFlipped: false,
    hints: [.interpolation: NSImageInterpolation.high]
)
NSGraphicsContext.restoreGraphicsState()
guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try png.write(to: dest)
"""


def flatten_rgb(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGB", im.size, BG)
    bg.paste(im, mask=im.split()[-1])
    return bg


def save_rgb(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = im.convert("RGB")
    rgb.save(path, "PNG", optimize=True)
    check = Image.open(path)
    if check.mode != "RGB":
        raise SystemExit(f"{path} mode is {check.mode}, expected RGB (no alpha)")
    if "transparency" in check.info:
        raise SystemExit(f"{path} still has transparency key")


def rasterize_svg(svg: Path, dest: Path, size: int) -> None:
    with tempfile.NamedTemporaryFile(suffix=".swift", delete=False) as fh:
        fh.write(SWIFT.encode())
        swift_path = fh.name
    try:
        subprocess.run(
            ["swift", swift_path, str(svg), str(dest), str(size)],
            check=True,
        )
    finally:
        Path(swift_path).unlink(missing_ok=True)


def main() -> None:
    work = Path(tempfile.mkdtemp(prefix="rs-icon-"))
    try:
        hi = work / "master-2048.png"
        rasterize_svg(MASTER_SVG, hi, 2048)
        master = flatten_rgb(hi).resize((1024, 1024), Image.Resampling.LANCZOS)
        save_rgb(master, MP / "shared" / "master-1024.png")
        save_rgb(master, MP / "macos" / "AppIcon-1024.png")

        def size_of(px: int) -> Image.Image:
            if px == 1024:
                return master
            return master.resize((px, px), Image.Resampling.LANCZOS)

        save_rgb(size_of(128), MP / "cursor" / "icon-128.png")
        save_rgb(size_of(256), MP / "cursor" / "icon-256.png")
        save_rgb(size_of(512), MP / "cursor" / "icon-512.png")

        save_rgb(size_of(512), MP / "codex" / "logo.png")
        save_rgb(size_of(512), MP / "codex" / "logo-512.png")
        save_rgb(size_of(128), MP / "codex" / "composer-icon.png")
        save_rgb(size_of(128), MP / "codex" / "composer-icon-128.png")

        iconset = MP / "macos" / "AppIcon.iconset"
        if iconset.exists():
            shutil.rmtree(iconset)
        iconset.mkdir(parents=True)
        mapping = {
            "icon_16x16.png": 16,
            "icon_16x16@2x.png": 32,
            "icon_32x32.png": 32,
            "icon_32x32@2x.png": 64,
            "icon_128x128.png": 128,
            "icon_128x128@2x.png": 256,
            "icon_256x256.png": 256,
            "icon_256x256@2x.png": 512,
            "icon_512x512.png": 512,
            "icon_512x512@2x.png": 1024,
        }
        for name, px in mapping.items():
            save_rgb(size_of(px), iconset / name)

        icns = MP / "macos" / "AppIcon.icns"
        subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(icns)], check=True)

        save_rgb(size_of(180), BRAND / "apple-touch-icon.png")

        master_check = Image.open(MP / "shared" / "master-1024.png")
        print(f"master-1024.png {master_check.size} mode={master_check.mode}")
        print(f"icns {icns} bytes={icns.stat().st_size}")
        print(f"composer-icon-128 { (MP / 'codex' / 'composer-icon-128.png').stat().st_size } bytes")
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
