#!/usr/bin/env python3
"""Generate resume PDF with embedded fonts, accessibility tags, and clean metadata."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pikepdf

PDF_TITLE = "Yahor Darashkevich Resume"
PDF_CREATOR = "astro-portfolio resume pipeline"
PDF_PRODUCER = "astro-portfolio"


def generate_with_playwright(html_path: Path, output_path: Path) -> str:
    from playwright.sync_api import sync_playwright

    file_url = html_path.resolve().as_uri()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(file_url, wait_until="networkidle")
        page.pdf(
            path=str(output_path),
            format="Letter",
            print_background=True,
            display_header_footer=False,
            margin={"top": "0.7in", "right": "0.7in", "bottom": "0.7in", "left": "0.7in"},
            tagged=True,
        )
        browser.close()
    return "playwright"


def generate_with_weasyprint(html_path: Path, output_path: Path) -> str:
    from weasyprint import HTML

    HTML(filename=str(html_path)).write_pdf(str(output_path))
    return "weasyprint"


def generate_with_chrome(html_path: Path, output_path: Path) -> str:
    chrome_candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ]
    chrome = next((path for path in chrome_candidates if Path(path).is_file()), None)
    if not chrome:
        raise RuntimeError("Chrome or Chromium not found")

    file_url = html_path.resolve().as_uri()
    subprocess.run(
        [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=10000",
            "--no-pdf-header-footer",
            f"--print-to-pdf={output_path}",
            file_url,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return "chrome"


def count_type3_fonts(pdf_path: Path) -> tuple[int, list[tuple[str, str]]]:
    import fitz

    doc = fitz.open(str(pdf_path))
    fonts: dict[tuple[str, str], None] = {}
    type3_count = 0
    for page in doc:
        for entry in page.get_fonts(full=True):
            # entry: (xref, ext, type, basefont, name, encoding, ref)
            font_type = entry[2] if len(entry) > 2 else ""
            basefont = entry[3] if len(entry) > 3 else ""
            key = (basefont, font_type)
            fonts[key] = None
            if font_type == "Type3":
                type3_count += 1
    doc.close()
    return type3_count, sorted(fonts.keys())


def is_linearized(pdf_path: Path) -> bool:
    with pdf_path.open("rb") as handle:
        return b"Linearized" in handle.read(4096)


def is_tagged(pdf_path: Path) -> tuple[bool, int]:
    mcid_count = 0
    with pikepdf.open(pdf_path) as pdf:
        tagged = "/StructTreeRoot" in pdf.Root
        for page in pdf.pages:
            if "/Contents" not in page:
                continue
            contents = page.Contents
            streams = contents if isinstance(contents, pikepdf.Array) else [contents]
            for stream in streams:
                data = stream.read_bytes()
                mcid_count += data.count(b"/MCID")
    return tagged, mcid_count


def postprocess_pdf(pdf_path: Path, title: str = PDF_TITLE) -> None:
    """Set neutral metadata, compress, and linearize for fast web view."""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        staged = Path(tmp.name)

    try:
        with pikepdf.open(pdf_path) as pdf:
            with pdf.open_metadata(set_pikepdf_as_editor=False) as meta:
                meta["dc:title"] = title
                meta["pdf:Producer"] = PDF_PRODUCER
                meta["xmp:CreatorTool"] = PDF_CREATOR
            pdf.docinfo["/Title"] = title
            pdf.docinfo["/Producer"] = PDF_PRODUCER
            pdf.docinfo["/Creator"] = PDF_CREATOR
            pdf.save(
                staged,
                linearize=True,
                compress_streams=True,
                object_stream_mode=pikepdf.ObjectStreamMode.generate,
            )
        shutil.move(str(staged), str(pdf_path))
    except Exception:
        staged.unlink(missing_ok=True)
        raise


def choose_generator(html_path: Path, output_path: Path) -> str:
    generators = [
        ("playwright", generate_with_playwright),
        ("weasyprint", generate_with_weasyprint),
        ("chrome", generate_with_chrome),
    ]

    best_engine = ""
    best_type3 = None
    best_output: Path | None = None

    for name, generator in generators:
        try:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                candidate = Path(tmp.name)
            generator(html_path, candidate)
            type3_count, font_list = count_type3_fonts(candidate)
            print(f"  {name}: {len(font_list)} font(s), Type3 pages refs={type3_count}")
            for basefont, font_type in font_list:
                print(f"    - {basefont or '(unnamed)'} [{font_type}]")

            if best_type3 is None or type3_count < best_type3:
                if best_output and best_output.exists():
                    best_output.unlink(missing_ok=True)
                best_type3 = type3_count
                best_engine = name
                best_output = candidate
            else:
                candidate.unlink(missing_ok=True)
        except Exception as exc:  # noqa: BLE001
            print(f"  {name}: unavailable ({exc})")

    if not best_output or not best_output.exists():
        raise RuntimeError("No PDF generator succeeded")

    shutil.move(str(best_output), str(output_path))
    return best_engine


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--ats",
        action="store_true",
        help="Generate ATS-friendly single-column resume (resume/ats.html)",
    )
    parser.add_argument(
        "--html",
        type=Path,
        default=None,
        help="HTML source (default: resume/index.html or resume/ats.html with --ats)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output PDF path (default: public/YD_resume.pdf or public/YD_resume_ATS.pdf)",
    )
    parser.add_argument(
        "--desktop-copy",
        type=Path,
        default=None,
        help="Desktop copy path (default: ~/Desktop/YD_resume.pdf or YD_resume_ATS.pdf)",
    )
    args = parser.parse_args()

    if args.ats:
        args.html = args.html or root / "resume" / "ats.html"
        args.output = args.output or root / "public" / "YD_resume_ATS.pdf"
        args.desktop_copy = args.desktop_copy or Path(
            "/Users/yahor/Desktop/YD_resume_ATS.pdf"
        )
    else:
        args.html = args.html or root / "resume" / "index.html"
        args.output = args.output or root / "public" / "YD_resume.pdf"
        args.desktop_copy = args.desktop_copy or Path(
            "/Users/yahor/Desktop/YD_resume.pdf"
        )

    if not args.html.is_file():
        print(f"Error: HTML source not found at {args.html}", file=sys.stderr)
        return 1

    args.output.parent.mkdir(parents=True, exist_ok=True)

    print(
        f"Generating {'ATS ' if args.ats else ''}resume PDF (selecting best font embedding)..."
    )
    engine = choose_generator(args.html, args.output)

    tagged_before, mcid_before = is_tagged(args.output)
    print(
        f"Pre-postprocess: tagged={tagged_before}, MCID markers={mcid_before}, "
        f"linearized={is_linearized(args.output)}"
    )

    print("Post-processing (metadata, compression, linearization)...")
    postprocess_pdf(args.output)

    type3_count, font_list = count_type3_fonts(args.output)
    tagged_after, mcid_after = is_tagged(args.output)
    linearized = is_linearized(args.output)

    with pikepdf.open(args.output) as pdf:
        producer = str(pdf.docinfo.get("/Producer", ""))
        creator = str(pdf.docinfo.get("/Creator", ""))
        title = str(pdf.docinfo.get("/Title", ""))
        pages = len(pdf.pages)

    shutil.copy2(args.output, args.desktop_copy)
    size = args.output.stat().st_size

    print(f"Engine: {engine}")
    print(f"Generated: {args.output}")
    print(f"Copied to: {args.desktop_copy}")
    print(f"File size: {size} bytes")
    print(f"Pages: {pages}")
    print(f"Metadata title: {title!r}")
    print(f"Metadata producer: {producer!r}")
    print(f"Metadata creator: {creator!r}")
    print(f"Tagged PDF: {tagged_after} (MCID markers: {mcid_after})")
    print(f"Linearized: {linearized}")
    print(f"Fonts ({len(font_list)}):")
    for basefont, font_type in font_list:
        print(f"  - {basefont or '(unnamed)'} [{font_type}]")
    print(f"Type3 font references: {type3_count}")

    if size < 5120:
        print("Warning: PDF file size is under 5KB — verify output.", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
