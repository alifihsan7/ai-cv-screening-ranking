"""Low-level Anti-Adversarial PDF Inspection & Canonical Text Standardization.

Provides deep structural scanning using PyMuPDF (fitz) to detect:
1. Invisible text rendered with PDF Text Render Mode 3 (Neither fill nor stroke).
2. Extremely small micro-fonts (< 2.0 pt).
3. Low-contrast / white text on white background (WCAG contrast ratio < 1.2:1).
4. Zero-width invisible Unicode characters (\\u200b, \\u200c, \\u200d, \\ufeff, etc.).

Standardizes text into canonical NFKC form with line de-hyphenation while preserving
full provenance and generating transparent recruiter audit flags (HIDDEN_TEXT).
"""

from __future__ import annotations

import logging
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

import pymupdf as fitz

logger = logging.getLogger("cv_screening.pdf_inspector")

# ---------------------------------------------------------------------------
# Zero-Width & Invisible Unicode Code Points
# ---------------------------------------------------------------------------

ZERO_WIDTH_CHARS = {
    "\u200b",  # Zero-width space
    "\u200c",  # Zero-width non-joiner
    "\u200d",  # Zero-width joiner
    "\ufeff",  # Zero-width no-break space (BOM)
    "\u200e",  # Left-to-right mark
    "\u200f",  # Right-to-left mark
    "\u202a",  # Left-to-right embedding
    "\u202b",  # Right-to-left embedding
    "\u202c",  # Pop directional formatting
    "\u202d",  # Left-to-right override
    "\u202e",  # Right-to-left override
}

ZERO_WIDTH_PATTERN = re.compile(r"[\u200b\u200c\u200d\ufeff\u200e\u200f\u202a-\u202e]")

# Zero-width characters are normal in templates (a ZWSP after a heading, a BOM in metadata). They only matter when
# they cut a word (keyword smuggling: "py<ZWSP>thon"), come in runs (bits hidden in text), or override text direction.
_ZW_CLASS = "\u200b\u200c\u200d\ufeff"
SUSPICIOUS_ZERO_WIDTH = re.compile(rf"(?<=\w)[{_ZW_CLASS}](?=\w)|[{_ZW_CLASS}\u200e\u200f]{{3,}}|[\u202a-\u202e]")


def has_suspicious_zero_width(text: str) -> bool:
    return bool(SUSPICIOUS_ZERO_WIDTH.search(text))


# Raw file bytes: only ZWSP and ZWNJ; ZWJ, direction marks and the BOM are ordinary in metadata and emoji.
ZERO_WIDTH_BYTES = [
    b"\xe2\x80\x8b",  # U+200B
    b"\xe2\x80\x8c",  # U+200C
]

RENDER_MODE_3_STREAM_PATTERN = re.compile(rb"(?:^|\s)3\s+Tr(?:\s|$)")


# ---------------------------------------------------------------------------
# WCAG Contrast Ratio Calculation Against White Background
# ---------------------------------------------------------------------------


def srgb_channel_to_linear(channel_val: float) -> float:
    """Converts an 8-bit sRGB channel (0-255) to linear relative luminance component."""
    c = channel_val / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def calculate_relative_luminance(r: int, g: int, b: int) -> float:
    """Calculates WCAG 2.1 relative luminance for an sRGB triplet."""
    return (
        0.2126 * srgb_channel_to_linear(r)
        + 0.7152 * srgb_channel_to_linear(g)
        + 0.0722 * srgb_channel_to_linear(b)
    )


def calculate_contrast_against_white(color_val: int | tuple[Any, ...] | list[Any]) -> float:
    """Calculates contrast ratio against a standard white background (L_white = 1.0).

    WCAG Contrast Ratio = (L1 + 0.05) / (L2 + 0.05).
    Since white is L=1.0, CR = 1.05 / (L_text + 0.05).
    Pure white text gives 1.05 / 1.05 = 1.00:1.
    Values < 1.20:1 are virtually indistinguishable from white backgrounds.
    """
    if isinstance(color_val, (tuple, list)):
        if all(isinstance(c, float) and c <= 1.0 for c in color_val):
            r, g, b = (int(c * 255) for c in color_val[:3])
        else:
            r, g, b = (int(c) for c in color_val[:3])
    elif isinstance(color_val, int):
        r = (color_val >> 16) & 0xFF
        g = (color_val >> 8) & 0xFF
        b = color_val & 0xFF
    else:
        return 21.0  # High contrast fallback

    lum = calculate_relative_luminance(r, g, b)
    return 1.05 / (lum + 0.05)


def _color_to_rgb(color_val: int | tuple[Any, ...] | list[Any]) -> tuple[int, int, int] | None:
    if isinstance(color_val, (tuple, list)):
        if all(isinstance(c, float) and c <= 1.0 for c in color_val):
            return tuple(int(c * 255) for c in color_val[:3])  # type: ignore[return-value]
        return tuple(int(c) for c in color_val[:3])  # type: ignore[return-value]
    if isinstance(color_val, int):
        return (color_val >> 16) & 0xFF, (color_val >> 8) & 0xFF, color_val & 0xFF
    return None


def contrast_against_background(color_val: int | tuple[Any, ...] | list[Any], background: tuple[int, int, int]) -> float:
    """WCAG contrast ratio of a text color against the background actually drawn under it."""
    text_rgb = _color_to_rgb(color_val)
    if text_rgb is None:
        return 21.0
    l_text, l_bg = calculate_relative_luminance(*text_rgb), calculate_relative_luminance(*background)
    lighter, darker = max(l_text, l_bg), min(l_text, l_bg)
    return (lighter + 0.05) / (darker + 0.05)


def dominant_background_rgb(page: Any, bbox: tuple[float, ...]) -> tuple[int, int, int] | None:
    """The most common color under a text span, rendered from the page; None when it cannot be rendered.

    A span with a white font is only hidden if the page is white there. White text over a dark sidebar (a common
    two-column template) is plainly visible, so the check needs the real background, not an assumed white one.
    """
    try:
        rect = fitz.Rect(bbox) & page.rect
        if rect.is_empty:
            return None
        pix = page.get_pixmap(clip=rect, dpi=36, colorspace=fitz.csRGB, alpha=False)
        raw = pix.samples
        counts = Counter(raw[i : i + 3] for i in range(0, len(raw) - 2, 3))
        top = counts.most_common(1)[0][0]
        return top[0], top[1], top[2]
    except Exception as e:
        logger.debug(f"Could not render the background under a span: {e}")
        return None


# ---------------------------------------------------------------------------
# Canonical Text Standardization (NFKC & De-Hyphenation)
# ---------------------------------------------------------------------------


def normalize_canonical_text(text: str) -> str:
    """Standardizes raw extracted text into canonical form.

    1. Applies Unicode NFKC normalization.
    2. Strips zero-width invisible control characters.
    3. De-hyphenates line breaks (e.g. 'experi-\\nence' -> 'experience').
    4. Normalizes newlines and trailing line whitespaces.
    """
    if not text:
        return ""

    # 1. Unicode NFKC normalization
    normalized = unicodedata.normalize("NFKC", text)

    # 2. Strip zero-width invisible characters
    cleaned = ZERO_WIDTH_PATTERN.sub("", normalized)

    # 3. De-hyphenation across linebreaks (e.g. 'develop-\\nment' -> 'development')
    dehyphenated = re.sub(r"(\b[A-Za-z]+)-\s*\n\s*([A-Za-z]+\b)", r"\1\2", cleaned)

    # 4. Standardize CRLF to LF
    standard_newlines = dehyphenated.replace("\r\n", "\n").replace("\r", "\n")

    # 5. Clean trailing whitespace per line and collapse 3+ blank lines to 2
    clean_lines = re.sub(r"[ \t]+$", "", standard_newlines, flags=re.MULTILINE)
    clean_lines = re.sub(r"\n{3,}", "\n\n", clean_lines)

    return clean_lines.strip()


# ---------------------------------------------------------------------------
# Inspection Findings & Result Dataclasses
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class HiddenTextFinding:
    """Structured evidence of hidden/adversarial text inside a document."""

    page_number: int
    finding_type: str  # "RENDER_MODE_3", "TINY_FONT", "LOW_CONTRAST_WHITE", "ZERO_WIDTH_UNICODE"
    detail: str
    sample_text: str
    bbox: tuple[float, float, float, float] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "page_number": self.page_number,
            "finding_type": self.finding_type,
            "detail": self.detail,
            "sample_text": self.sample_text[:120],
            "bbox": list(self.bbox) if self.bbox else None,
        }


@dataclass
class PdfInspectionReport:
    """Comprehensive inspection report for a PDF document."""

    has_hidden_text: bool = False
    findings: list[HiddenTextFinding] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)
    raw_text: str = ""
    canonical_text: str = ""
    page_count: int = 0


# ---------------------------------------------------------------------------
# Primary Inspection Engine
# ---------------------------------------------------------------------------


# One character cannot carry a keyword or an instruction; a lone glyph in a zero-width box is a layout artifact.
MIN_HIDDEN_SPAN_CHARS = 2


def _visible_on_real_background(page: Any, color: Any, bbox: tuple[float, ...]) -> bool:
    """True when text that is white-ish against a white page is drawn over a background that makes it readable."""
    background = dominant_background_rgb(page, bbox)
    return background is not None and contrast_against_background(color, background) >= 1.20


def inspect_pdf_adversarial(content: bytes) -> PdfInspectionReport:
    """Performs deep low-level inspection of PDF binary to detect hidden / adversarial text.

    Scans for:
    - Text render mode 3 (neither fill nor stroke = invisible).
    - Font sizes < 2.0 pt with non-empty text.
    - Low-contrast text on white (contrast ratio < 1.20:1).
    - Zero-width Unicode characters (in strings, streams, and raw payload).

    Returns structured PdfInspectionReport with findings and canonical text.
    """
    report = PdfInspectionReport()

    # Pre-check: binary scan for zero-width bytes
    for zw_byte in ZERO_WIDTH_BYTES:
        if zw_byte in content:
            report.findings.append(
                HiddenTextFinding(
                    page_number=1,
                    finding_type="ZERO_WIDTH_UNICODE",
                    detail=f"Detected raw zero-width Unicode byte sequence {zw_byte.hex()}",
                    sample_text="[ZERO_WIDTH_BYTES]",
                    bbox=None,
                )
            )
            break

    try:
        doc = fitz.open(stream=content, filetype="pdf")
    except Exception as e:
        logger.warning(f"Could not open PDF for inspection: {e}")
        return report

    report.page_count = len(doc)
    page_texts: list[str] = []

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_num = page_idx + 1
        page_text_val = page.get_text()
        page_raw_text = page_text_val if isinstance(page_text_val, str) else str(page_text_val)
        page_texts.append(page_raw_text)

        # 1. Zero-width Unicode check on extracted page text
        zw_matches = ZERO_WIDTH_PATTERN.findall(page_raw_text)
        if zw_matches and has_suspicious_zero_width(page_raw_text):
            report.findings.append(
                HiddenTextFinding(
                    page_number=page_num,
                    finding_type="ZERO_WIDTH_UNICODE",
                    detail=f"Detected {len(zw_matches)} zero-width Unicode characters (e.g. U+{ord(zw_matches[0]):04X})",
                    sample_text="[ZERO_WIDTH_CHARS]",
                    bbox=None,
                )
            )

        # 2. Check page content stream for Text Render Mode 3 (3 Tr)
        try:
            stream_bytes = page.read_contents()
            if stream_bytes and RENDER_MODE_3_STREAM_PATTERN.search(stream_bytes):
                report.findings.append(
                    HiddenTextFinding(
                        page_number=page_num,
                        finding_type="RENDER_MODE_3",
                        detail="PDF content stream sets text rendering mode to 3 (invisible text)",
                        sample_text="[STREAM_SET_3_Tr]",
                        bbox=None,
                    )
                )
        except Exception as e:
            logger.debug(f"Could not read page {page_num} stream: {e}")

        # 3. Span-level inspection via dict (has explicit text, size, color, bbox)
        try:
            dict_data = page.get_text("dict")
            dict_obj = dict_data if isinstance(dict_data, dict) else {}
            for block in dict_obj.get("blocks", []):
                if "lines" not in block:
                    continue
                for line in block["lines"]:
                    for span in line.get("spans", []):
                        span_text = span.get("text", "")
                        clean_text = span_text.strip()
                        span_bbox = tuple(span.get("bbox", (0, 0, 0, 0)))

                        # Check 3a: Micro-font size (< 2.0 pt)
                        size = float(span.get("size", 10.0))
                        if size < 2.0 and len(clean_text) >= MIN_HIDDEN_SPAN_CHARS:
                            report.findings.append(
                                HiddenTextFinding(
                                    page_number=page_num,
                                    finding_type="TINY_FONT",
                                    detail=f"Extremely small font size ({size:.2f} pt < 2.0 pt)",
                                    sample_text=clean_text[:60],
                                    bbox=span_bbox,
                                )
                            )

                        # Check 3b: Low-contrast / white text on white background (WCAG CR < 1.20:1)
                        color = span.get("color", 0)
                        contrast = calculate_contrast_against_white(color)
                        if (
                            contrast < 1.20
                            and len(clean_text) >= MIN_HIDDEN_SPAN_CHARS
                            and not _visible_on_real_background(page, color, span_bbox)
                        ):
                            report.findings.append(
                                HiddenTextFinding(
                                    page_number=page_num,
                                    finding_type="LOW_CONTRAST_WHITE",
                                    detail=f"Low contrast against white background ({contrast:.2f}:1 < 1.20:1, color={color})",
                                    sample_text=clean_text[:60],
                                    bbox=span_bbox,
                                )
                            )

                        # Check 3c: Zero-width Unicode characters in span text
                        if has_suspicious_zero_width(span_text):
                            report.findings.append(
                                HiddenTextFinding(
                                    page_number=page_num,
                                    finding_type="ZERO_WIDTH_UNICODE",
                                    detail="Zero-width invisible Unicode characters embedded in span text",
                                    sample_text=clean_text[:60],
                                    bbox=span_bbox,
                                )
                            )

        except Exception as e:
            logger.debug(f"Failed dict span-level analysis for page {page_num}: {e}")

        # 4. Char-level inspection via rawdict for explicit render_mode 3
        try:
            raw_data = page.get_text("rawdict")
            raw_obj = raw_data if isinstance(raw_data, dict) else {}
            for block in raw_obj.get("blocks", []):
                if "lines" not in block:
                    continue
                for line in block["lines"]:
                    for span in line.get("spans", []):
                        chars = span.get("chars", [])
                        if any(c.get("render_mode") == 3 for c in chars):
                            sample = "".join(c.get("c", "") for c in chars).strip()
                            report.findings.append(
                                HiddenTextFinding(
                                    page_number=page_num,
                                    finding_type="RENDER_MODE_3",
                                    detail="Characters explicitly flagged with render_mode=3 (invisible)",
                                    sample_text=sample[:60] if sample else "[INVISIBLE_RENDER_MODE_3]",
                                    bbox=tuple(span.get("bbox", (0, 0, 0, 0))),
                                )
                            )
        except Exception as e:
            logger.debug(f"Failed rawdict char-level analysis for page {page_num}: {e}")

    doc.close()

    # Deduplicate findings by (page_number, finding_type, sample_text)
    unique_findings: list[HiddenTextFinding] = []
    seen = set()
    for f in report.findings:
        key = (f.page_number, f.finding_type, f.sample_text[:40])
        if key not in seen:
            seen.add(key)
            unique_findings.append(f)

    report.findings = unique_findings
    if report.findings:
        report.has_hidden_text = True
        report.flags.append("HIDDEN_TEXT")

    report.raw_text = "\n".join(page_texts).strip()
    report.canonical_text = normalize_canonical_text(report.raw_text)

    return report
