"""Reading order for PDF pages.

A PDF stores pieces of text with coordinates, not paragraphs or columns, and many generators (Canva, slide tools)
write them in an arbitrary order. `page.get_text()` returns them in file order, so a job title can land far from its
dates and bullets, and a sidebar can be read in the middle of the main column. The experience parser reads lines in
order, so it cannot recover from that.

The order here comes from the page geometry:
  1. If the page has two columns (a gutter that only a small share of the text crosses), read the left column, then
     the right one. Blocks that cross the gutter (a header across the page) separate the page into zones.
  2. Inside a region, read visual rows top to bottom, and each row left to right, so a title on the left and a date
     aligned to the right stay on one line.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

MIN_GUTTER_PT = 8.0
MAX_CROSSING_SHARE = 0.25  # of the text height; more than this and the gap is not a gutter
MIN_SIDE_SHARE = 0.20  # each column must hold at least this share of the text height
ROW_OVERLAP = 0.5  # vertical overlap (of the shorter block) that puts two blocks in one row


@dataclass(frozen=True)
class Block:
    x0: float
    y0: float
    x1: float
    y1: float
    text: str

    @property
    def height(self) -> float:
        return max(self.y1 - self.y0, 0.0)


def _rows(blocks: list[Block]) -> list[Block]:
    """Blocks in visual row order: rows top to bottom, each row left to right."""
    rows: list[list[Block]] = []
    for b in sorted(blocks, key=lambda b: (b.y0, b.x0)):
        for row in rows:
            top, bottom = min(r.y0 for r in row), max(r.y1 for r in row)
            overlap = min(bottom, b.y1) - max(top, b.y0)
            if overlap >= ROW_OVERLAP * min(b.height, bottom - top or b.height):
                row.append(b)
                break
        else:
            rows.append([b])
    rows.sort(key=lambda row: min(r.y0 for r in row))
    return [b for row in rows for b in sorted(row, key=lambda b: b.x0)]


def _union_height(blocks: list[Block]) -> float:
    spans = sorted((b.y0, b.y1) for b in blocks)
    total, cur_end = 0.0, None
    cur_start = 0.0
    for start, end in spans:
        if cur_end is None or start > cur_end:
            if cur_end is not None:
                total += cur_end - cur_start
            cur_start, cur_end = start, end
        else:
            cur_end = max(cur_end, end)
    if cur_end is not None:
        total += cur_end - cur_start
    return total


def find_gutter(blocks: list[Block], page_width: float) -> tuple[float, float] | None:
    """The (left edge, right edge) of a column gutter, or None. A gutter is a gap few blocks cross and with real text on both sides.

    The margin beside the text is also a gap, so each candidate is checked for text on both sides before the widest
    valid one is chosen.
    """
    if len(blocks) < 4:
        return None
    total = _union_height(blocks)
    if total <= 0:
        return None

    candidates: list[tuple[float, float, float]] = []  # (width, left edge, right edge)
    run_start: float | None = None
    x = page_width * 0.12
    end = page_width * 0.88
    while x <= end + 1:
        crossing = [b for b in blocks if b.x0 < x < b.x1]
        ok = _union_height(crossing) <= MAX_CROSSING_SHARE * total
        if ok and run_start is None:
            run_start = x
        if (not ok or x > end) and run_start is not None:
            if x - run_start >= MIN_GUTTER_PT:
                candidates.append((x - run_start, run_start, x))
            run_start = None
        x += 1.0

    for _width, gap_left, gap_right in sorted(candidates, reverse=True):
        left = [b for b in blocks if _column_of(b, gap_left, gap_right) == "left"]
        right = [b for b in blocks if _column_of(b, gap_left, gap_right) == "right"]
        if _union_height(left) >= MIN_SIDE_SHARE * total and _union_height(right) >= MIN_SIDE_SHARE * total:
            return gap_left, gap_right
    return None


GAP_TOLERANCE_PT = 4.0


def _column_of(b: Block, gap_left: float, gap_right: float) -> str:
    """'left', 'right' or 'span'. A block crosses the gutter only if it reaches past both edges of the gap; one that
    starts a little inside the gap (a heading nudged left of its column) still belongs to the right column."""
    if gap_left - b.x0 > GAP_TOLERANCE_PT and b.x1 - gap_right > GAP_TOLERANCE_PT:
        return "span"
    return "right" if b.x0 >= gap_left - GAP_TOLERANCE_PT else "left"


def order_blocks(blocks: list[Block], page_width: float) -> list[Block]:
    gutter = find_gutter(blocks, page_width)
    if gutter is None:
        return _rows(blocks)

    gap_left, gap_right = gutter
    left = [b for b in blocks if _column_of(b, gap_left, gap_right) == "left"]
    right = [b for b in blocks if _column_of(b, gap_left, gap_right) == "right"]
    spanning = sorted((b for b in blocks if _column_of(b, gap_left, gap_right) == "span"), key=lambda b: b.y0)

    # Zones are cut at the top edge of each spanning block, so a block that starts beside or inside a spanning block's
    # vertical extent still lands in a zone (starting the zone after it) and no block can be dropped.
    ordered: list[Block] = []
    zone_top = float("-inf")
    for k in range(len(spanning) + 1):
        zone_bottom = spanning[k].y0 if k < len(spanning) else float("inf")
        in_left = [b for b in left if zone_top <= b.y0 < zone_bottom]
        in_right = [b for b in right if zone_top <= b.y0 < zone_bottom]
        ordered += _rows(in_left) + _rows(in_right)
        if k < len(spanning):
            ordered.append(spanning[k])
            zone_top = spanning[k].y0
    return ordered


def page_text_in_reading_order(page: Any, textpage: Any = None) -> str:
    """Text of a PyMuPDF page in reading order; falls back to the plain text if the blocks cannot be read."""
    try:
        raw = page.get_text("blocks", textpage=textpage) if textpage is not None else page.get_text("blocks")
        blocks = [Block(b[0], b[1], b[2], b[3], b[4]) for b in raw if b[6] == 0 and b[4].strip()]
        if not blocks:
            return page.get_text(textpage=textpage) if textpage is not None else page.get_text()
        ordered = order_blocks(blocks, float(page.rect.width))
        if len(ordered) != len(blocks) or {id(b) for b in ordered} != {id(b) for b in blocks}:
            # never lose text to a reordering bug: fall back to the file order
            return page.get_text(textpage=textpage) if textpage is not None else page.get_text()
        return "".join(b.text if b.text.endswith("\n") else b.text + "\n" for b in ordered)
    except Exception:
        return page.get_text(textpage=textpage) if textpage is not None else page.get_text()
