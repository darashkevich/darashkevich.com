#!/usr/bin/env python3
"""Verify resume PDF output, metadata, fonts, links, and text selection."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import fitz
import pikepdf
from pypdf import PdfReader


CONTACT_PARTS = [
    "Remote · U.S. & EU work-authorized",
    "yahor@darashkevich.com",
    "+1 (617) 528-9656",
    "linkedin.com/in/darashkevich",
    "darashkevich.com",
]

EXPECTED_LINKS = [
    "mailto:yahor@darashkevich.com",
    "tel:+16175289656",
    "https://linkedin.com/in/darashkevich",
    "https://darashkevich.com",
]

SAMPLE_WORDS = [
  "Darashkevich",
  "darashkevich.com",
  "yahor@darashkevich.com",
  "linkedin.com/in/darashkevich",
]

LINK_TEXT_HINTS = {
    "mailto:yahor@darashkevich.com": "yahor@darashkevich.com",
    "tel:+16175289656": "528-9656",
    "https://linkedin.com/in/darashkevich": "linkedin.com/in/darashkevich",
    "https://darashkevich.com": "darashkevich.com",
}

EXPECTED_TITLE = "Yahor Darashkevich Resume"


def rect_width(rect) -> float:
    return float(rect[2]) - float(rect[0])


def collect_spans(page: fitz.Page) -> list[tuple[str, fitz.Rect]]:
    spans: list[tuple[str, fitz.Rect]] = []
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                text = span["text"].strip()
                if text:
                    spans.append((text, fitz.Rect(span["bbox"])))
    return spans


def spans_for_word(spans: list[tuple[str, fitz.Rect]], word: str) -> list[tuple[str, fitz.Rect]]:
    needle = word.lower()
    return [(text, rect) for text, rect in spans if needle in text.lower()]


def spans_overlapping_rect(
    spans: list[tuple[str, fitz.Rect]], rect: fitz.Rect, min_overlap: float = 1.0
) -> list[tuple[str, fitz.Rect]]:
    """Spans with meaningful horizontal overlap; ignores sub-point boundary slivers."""
    result = []
    for text, span_rect in spans:
        intersection = fitz.Rect(span_rect) & rect
        if not intersection.is_empty and intersection.width >= min_overlap:
            result.append((text, span_rect))
    return result


def is_linearized(pdf_path: Path) -> bool:
    with pdf_path.open("rb") as handle:
        return b"Linearized" in handle.read(4096)


def pdf_accessibility_info(pdf_path: Path) -> tuple[bool, int]:
    mcid_count = 0
    with pikepdf.open(pdf_path) as pdf:
        tagged = "/StructTreeRoot" in pdf.Root
        for page in pdf.pages:
            if "/Contents" not in page:
                continue
            contents = page.Contents
            streams = contents if isinstance(contents, pikepdf.Array) else [contents]
            for stream in streams:
                mcid_count += stream.read_bytes().count(b"/MCID")
    return tagged, mcid_count


def collect_fonts(pdf_path: Path) -> tuple[list[tuple[str, str]], int]:
    doc = fitz.open(str(pdf_path))
    fonts: dict[tuple[str, str], None] = {}
    type3_count = 0
    for page in doc:
        for entry in page.get_fonts(full=True):
            font_type = entry[2] if len(entry) > 2 else ""
            basefont = entry[3] if len(entry) > 3 else ""
            fonts[(basefont, font_type)] = None
            if font_type == "Type3":
                type3_count += 1
    doc.close()
    return sorted(fonts.keys()), type3_count


def verify(pdf_path: Path) -> int:
    reader = PdfReader(str(pdf_path))
    errors: list[str] = []
    warnings: list[str] = []

    if len(reader.pages) < 2:
        errors.append(f"expected at least 2 pages, got {len(reader.pages)}")

    page1 = reader.pages[0].extract_text() or ""
    lines = [line.strip() for line in page1.splitlines() if line.strip()]

    if not lines:
        errors.append("page 1 has no extractable text")
    else:
        if lines[0] != "Yahor Darashkevich":
            errors.append(f"page 1 should start with name, got: {lines[0]!r}")

        header_patterns = [
            (r"\b\d{1,2}/\d{1,2}/\d{2,4}\b", "date header"),
            (r"\b\d{1,2}:\d{2}\s*(AM|PM)?\b", "time header"),
            (r"Yahor Darashkevich — Resume", "document title header"),
            (r"file://", "file URL header"),
        ]
        for pattern, label in header_patterns:
            if re.search(pattern, page1, re.IGNORECASE):
                errors.append(f"found {label} in page 1 text")

    contact_line = next(
        (line for line in lines if "Remote · U.S. & EU work-authorized" in line),
        "",
    )
    if not contact_line:
        errors.append("contact line missing on page 1")
    else:
        for part in CONTACT_PARTS:
            if part not in contact_line:
                errors.append(f"contact line missing {part!r}")
        if "\n" in contact_line:
            errors.append("contact line is split across lines")

    title = (reader.metadata.title or "").strip() if reader.metadata else ""
    if title != EXPECTED_TITLE:
        errors.append(f"PDF metadata title should be {EXPECTED_TITLE!r}, got: {title!r}")

    producer = (reader.metadata.producer or "").strip() if reader.metadata else ""
    creator = (reader.metadata.creator or "").strip() if reader.metadata else ""
    tagged, mcid_count = pdf_accessibility_info(pdf_path)
    linearized = is_linearized(pdf_path)

    print("PDF technical report:")
    print(f"  tagged: {tagged} (MCID markers: {mcid_count})")
    print(f"  producer: {producer!r}")
    print(f"  creator: {creator!r}")
    print(f"  linearized (fast web view): {linearized}")

    if not tagged:
        warnings.append("PDF is not tagged for accessibility (no StructTreeRoot)")
    if not linearized:
        warnings.append("PDF is not linearized for fast web view")
    if "skia" in producer.lower() or "headlesschrome" in creator.lower():
        warnings.append("PDF metadata still references Skia/HeadlessChrome")

    font_list, type3_count = collect_fonts(pdf_path)
    print(f"Font analysis for {pdf_path.name}:")
    for basefont, font_type in font_list:
        print(f"  - {basefont or '(unnamed)'} [{font_type}]")
    print(f"  Type3 font references: {type3_count}")
    if type3_count > 0:
        warnings.append(
            f"PDF contains {type3_count} Type3 font reference(s); ATS parsers may prefer TrueType/Type1"
        )

    annots = reader.pages[0].get("/Annots")
    links: list[tuple[str, list[float]]] = []
    if annots:
        for annot_ref in annots:
            annot = annot_ref.get_object()
            if annot.get("/Subtype") != "/Link":
                continue
            action = annot.get("/A") or {}
            uri = str(action.get("/URI", "")).rstrip("/")
            rect = [float(v) for v in annot.get("/Rect", [])]
            links.append((uri, rect))

    if len(links) != 4:
        errors.append(f"expected 4 contact links, got {len(links)}")
    else:
        found_uris = [uri.rstrip("/") for uri, _ in links]
        for expected in EXPECTED_LINKS:
            normalized = expected.rstrip("/")
            if not any(found.startswith(normalized) or normalized in found for found in found_uris):
                errors.append(f"missing link URI: {expected}")

        widths = [rect_width(rect) for _, rect in links]
        if any(width < 40 for width in widths):
            errors.append(f"link rects look too narrow: {widths}")

    doc = fitz.open(str(pdf_path))
    page = doc[0]
    spans = collect_spans(page)

    # Use fitz link rects (top-left origin) for span overlap checks.
    fitz_links: list[tuple[str, fitz.Rect]] = []
    for link in page.get_links():
        uri = link.get("uri", "")
        rect = link.get("from")
        if uri and rect:
            fitz_links.append((uri.rstrip("/"), fitz.Rect(rect)))

    print(f"Text span analysis for {pdf_path.name}:")
    print(f"  total spans on page 1: {len(spans)}")

    for word in SAMPLE_WORDS:
        matches = spans_for_word(spans, word)
        print(f"  '{word}': {len(matches)} span(s)")
        for text, rect in matches:
            print(f"    {text!r} width={rect.width:.1f}")
        if word == "Darashkevich":
            full_name = [text for text, _ in matches if text == "Yahor Darashkevich"]
            if len(full_name) != 1:
                errors.append(
                    f"name should be a single 'Yahor Darashkevich' span, got {len(full_name)}"
                )

    print("Link annotation coverage:")
    for uri, lrect in fitz_links:
        normalized_uri = uri.rstrip("/")
        overlapping = spans_overlapping_rect(spans, lrect)
        text_width = sum(r.width for _, r in overlapping)
        ratio = lrect.width / text_width if text_width else 0.0
        print(
            f"  {normalized_uri}: rect={lrect.width:.1f}pt spans={len(overlapping)} "
            f"text_width={text_width:.1f}pt ratio={ratio:.2f}"
        )
        if len(overlapping) > 1:
            hint = LINK_TEXT_HINTS.get(normalized_uri, "")
            exact_hint = [text for text, _ in overlapping if text.strip() == hint]
            if hint and exact_hint:
                pass
            elif normalized_uri.startswith("tel:"):
                warnings.append(
                    f"phone link uses {len(overlapping)} text spans (acceptable if rect covers all)"
                )
            else:
                errors.append(
                    f"link {normalized_uri} overlaps {len(overlapping)} text spans; want 1"
                )
        if text_width and ratio < 0.88:
            errors.append(
                f"link {normalized_uri} rect too narrow: {ratio:.2f} of visible text width"
            )
        if text_width and ratio > 1.15:
            warnings.append(
                f"link {normalized_uri} rect wider than text: ratio={ratio:.2f}"
            )

    doc.close()

    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"  - {warning}")

    if errors:
        print(f"VERIFICATION FAILED for {pdf_path}:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print(f"VERIFICATION PASSED for {pdf_path}")
    print(f"  metadata title: {title!r}")
    print(f"  metadata producer: {producer!r}")
    print(f"  metadata creator: {creator!r}")
    print(f"  tagged: {tagged} (MCID markers: {mcid_count})")
    print(f"  linearized: {linearized}")
    print(f"  page 1 starts: {lines[0]!r}")
    print(f"  contact line: {contact_line!r}")
    print(f"  links: {len(links)}")
    for uri, rect in links:
        print(f"    {uri} width={rect_width(rect):.1f}pt")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    args = parser.parse_args()
    return verify(args.pdf)


if __name__ == "__main__":
    raise SystemExit(main())
