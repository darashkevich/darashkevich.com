#!/usr/bin/env python3
"""Generate a D6 hexaflake / hexagram-tunnel mark (hypnotic, 6-fold)."""
from __future__ import annotations

import math
from pathlib import Path

BRAND = Path(__file__).resolve().parents[1]
MP = BRAND / "marketplace"

GREEN = "#9be56a"
CYAN = "#6ec8ff"
AMBER = "#e8b84a"
CORE = "#0d1219"
BG = "#070a0f"

SIZE = 512.0
CX = CY = SIZE / 2.0


def hex_pts(cx: float, cy: float, r: float, rot_deg: float = 0.0) -> str:
    pts = []
    for i in range(6):
        a = math.radians(rot_deg - 90.0 + i * 60.0)
        pts.append(f"{cx + r * math.cos(a):.3f},{cy + r * math.sin(a):.3f}")
    return " ".join(pts)


def tri_pts(cx: float, cy: float, r: float, rot_deg: float) -> str:
    pts = []
    for i in range(3):
        a = math.radians(rot_deg - 90.0 + i * 120.0)
        pts.append(f"{cx + r * math.cos(a):.3f},{cy + r * math.sin(a):.3f}")
    return " ".join(pts)


def sw(base: float, r: float, r_ref: float) -> float:
    return max(0.7, base * (r / r_ref))


def star_tunnel(
    cx: float,
    cy: float,
    r_max: float,
    *,
    green: str,
    cyan: str,
    amber: str,
    levels: int,
    ratio: float,
    hexagrams: bool,
    stroke_base: float,
) -> list[str]:
    """Concentric hex / 30°-hex / hexagram stack — kaleidoscope well."""
    parts: list[str] = []
    r = r_max
    for i in range(levels):
        col_a = green if i % 2 == 0 else cyan
        col_b = cyan if i % 2 == 0 else green
        w = sw(stroke_base, r, r_max)
        parts.append(
            f'<polygon points="{hex_pts(cx, cy, r, 0)}" fill="none" '
            f'stroke="{col_a}" stroke-width="{w:.3f}" stroke-linejoin="miter"/>'
        )
        parts.append(
            f'<polygon points="{hex_pts(cx, cy, r * 0.866, 30)}" fill="none" '
            f'stroke="{col_b}" stroke-width="{w * 0.85:.3f}" stroke-linejoin="miter"/>'
        )
        if hexagrams and i % 2 == 0 and r > r_max * 0.18:
            tw = max(0.65, w * 0.7)
            parts.append(
                f'<polygon points="{tri_pts(cx, cy, r * 0.72, 0)}" fill="none" '
                f'stroke="{col_b}" stroke-width="{tw:.3f}" stroke-linejoin="miter"/>'
            )
            parts.append(
                f'<polygon points="{tri_pts(cx, cy, r * 0.72, 180)}" fill="none" '
                f'stroke="{col_b}" stroke-width="{tw:.3f}" stroke-linejoin="miter"/>'
            )
        r *= ratio
    # amber core hex + counter-rotated void
    core_r = r_max * (ratio ** levels) / ratio
    core_r = max(r_max * 0.055, min(core_r, r_max * 0.12))
    parts.append(
        f'<polygon points="{hex_pts(cx, cy, core_r * 1.35, 0)}" fill="{amber}" '
        f'stroke="{amber}" stroke-width="{sw(stroke_base * 0.4, core_r, r_max):.3f}" '
        f'stroke-linejoin="miter"/>'
    )
    parts.append(
        f'<polygon points="{hex_pts(cx, cy, core_r * 0.62, 30)}" fill="{CORE}" stroke="none"/>'
    )
    return parts


def hexaflake(
    cx: float,
    cy: float,
    r: float,
    depth: int,
    *,
    green: str,
    cyan: str,
    stroke_base: float,
    r_ref: float,
    acc: list[str],
) -> None:
    """True hexaflake: center + 6 vertex children, each 1/3 radius."""
    col = green if depth % 2 == 0 else cyan
    w = sw(stroke_base, r, r_ref)
    acc.append(
        f'<polygon points="{hex_pts(cx, cy, r, 0)}" fill="none" '
        f'stroke="{col}" stroke-width="{w:.3f}" stroke-linejoin="miter"/>'
    )
    if depth <= 0:
        return
    nr = r / 3.0
    d = 2.0 * r / 3.0
    hexaflake(cx, cy, nr, depth - 1, green=green, cyan=cyan, stroke_base=stroke_base, r_ref=r_ref, acc=acc)
    for i in range(6):
        a = math.radians(-90.0 + i * 60.0)
        hexaflake(
            cx + d * math.cos(a),
            cy + d * math.sin(a),
            nr,
            depth - 1,
            green=green,
            cyan=cyan,
            stroke_base=stroke_base,
            r_ref=r_ref,
            acc=acc,
        )


def glyph(mono: bool = False, simplified: bool = False) -> str:
    stroke = "currentColor" if mono else None
    g = stroke or GREEN
    c = stroke or CYAN
    a = stroke or AMBER
    plate = "none" if mono else CORE

    parts: list[str] = [
        f'<polygon points="{hex_pts(CX, CY, 242, 0)}" fill="{plate}" '
        f'stroke="{g}" stroke-width="9.5" stroke-linejoin="miter"/>'
    ]

    if simplified:
        parts.extend(
            star_tunnel(
                CX, CY, 210,
                green=g, cyan=c, amber=a,
                levels=6, ratio=0.78, hexagrams=True, stroke_base=6.2,
            )
        )
        return "\n  ".join(parts)

    # Outer hexaflake weave (depth 3) — self-similar lattice
    flake: list[str] = []
    hexaflake(
        CX, CY, 198, 3,
        green=g, cyan=c, stroke_base=3.4, r_ref=198, acc=flake,
    )
    parts.extend(flake)

    # Central kaleidoscope well
    parts.extend(
        star_tunnel(
            CX, CY, 132,
            green=g, cyan=c, amber=a,
            levels=9, ratio=0.82, hexagrams=True, stroke_base=4.4,
        )
    )

    # Six petal wells — the same tunnel, recursively, on every vertex
    petal_r = 58
    petal_d = 168
    for i in range(6):
        ang = math.radians(-90.0 + i * 60.0)
        px = CX + petal_d * math.cos(ang)
        py = CY + petal_d * math.sin(ang)
        parts.extend(
            star_tunnel(
                px, py, petal_r,
                green=g, cyan=c, amber=a,
                levels=5, ratio=0.76, hexagrams=True, stroke_base=2.6,
            )
        )

    return "\n  ".join(parts)


def svg_doc(
    inner: str,
    *,
    width: int | None = None,
    height: int | None = None,
    background: str | None = None,
    rounded: float | None = None,
    title: str = "RunSpecimen mark",
    labelled: bool = False,
) -> str:
    wh = ""
    if width is not None and height is not None:
        wh = f' width="{width}" height="{height}"'
    bg = ""
    if background:
        rx = f' rx="{rounded}"' if rounded else ""
        bg = f'\n  <rect width="{SIZE:.0f}" height="{SIZE:.0f}"{rx} fill="{background}"/>'
    role = ' role="img"' if labelled else ' aria-hidden="true"'
    title_el = f"\n  <title>{title}</title>"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg"{wh} viewBox="0 0 {SIZE:.0f} {SIZE:.0f}" '
        f'fill="none"{role}>{title_el}{bg}\n  {inner}\n</svg>\n'
    )


def wordmark(mono: bool) -> str:
    fill = "currentColor" if mono else "#eef3f8"
    inner = glyph(mono=mono, simplified=True)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 32" fill="none" role="img" aria-labelledby="rs-wm-title">
  <title id="rs-wm-title">RunSpecimen</title>
  <g transform="scale({32 / SIZE})">
    {inner}
  </g>
  <text x="40" y="21.5"
        font-family="Sora, system-ui, sans-serif"
        font-size="15.5"
        font-weight="700"
        letter-spacing="-0.31"
        fill="{fill}">RunSpecimen</text>
</svg>
"""


def seal() -> str:
    inner = glyph(mono=False, simplified=False)
    s = 256 / SIZE
    return f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 256 256" fill="none" role="img" aria-labelledby="rs-seal-title">
  <title id="rs-seal-title">RunSpecimen seal</title>
  <defs>
    <path id="rs-arc-top" d="M49.2 66.43A100 100 0 0 1 206.8 66.43"/>
    <path id="rs-arc-bot" d="M37.37 170.26A100 100 0 0 0 218.63 170.26"/>
  </defs>
  <circle cx="128" cy="128" r="126" fill="{BG}"/>
  <circle cx="128" cy="128" r="123" stroke="{GREEN}" stroke-width="2.25"/>
  <g transform="translate(128 128) scale({0.72 * s:.5f}) translate(-{CX:.0f} -{CY:.0f})">
    {inner}
  </g>
  <text fill="{GREEN}" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="13" font-weight="600" letter-spacing="3.2">
    <textPath href="#rs-arc-top" xlink:href="#rs-arc-top" startOffset="50%" text-anchor="middle">RUNSPECIMEN</textPath>
  </text>
  <text fill="{CYAN}" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="9.5" font-weight="500" letter-spacing="1.4">
    <textPath href="#rs-arc-bot" xlink:href="#rs-arc-bot" startOffset="50%" text-anchor="middle">ONE RUN &#183; ONE RECEIPT</textPath>
  </text>
</svg>
"""


def main() -> None:
    (BRAND / "mark.svg").write_text(
        svg_doc(glyph(False, False), title="RunSpecimen mark"), encoding="utf-8"
    )
    (BRAND / "mark-mono.svg").write_text(
        svg_doc(glyph(True, False), title="RunSpecimen mark"), encoding="utf-8"
    )
    (BRAND / "favicon.svg").write_text(
        svg_doc(
            glyph(False, True),
            background=BG,
            rounded=112,
            title="RunSpecimen",
        ),
        encoding="utf-8",
    )
    (BRAND / "wordmark.svg").write_text(wordmark(False), encoding="utf-8")
    (BRAND / "wordmark-mono.svg").write_text(wordmark(True), encoding="utf-8")
    (BRAND / "seal.svg").write_text(seal(), encoding="utf-8")

    field = glyph(False, False)
    (MP / "shared" / "mark-on-field.svg").write_text(
        svg_doc(field, width=1024, height=1024, background=BG, title="RunSpecimen"),
        encoding="utf-8",
    )
    (MP / "codex" / "logo.svg").write_text(
        svg_doc(field, width=512, height=512, background=BG, title="RunSpecimen"),
        encoding="utf-8",
    )
    (MP / "codex" / "composer-icon.svg").write_text(
        svg_doc(
            glyph(False, True),
            width=128,
            height=128,
            background=BG,
            title="RunSpecimen",
        ),
        encoding="utf-8",
    )
    n = field.count("<polygon")
    print(f"wrote fractal mark SVGs ({n} polygons in full glyph)")


if __name__ == "__main__":
    main()
