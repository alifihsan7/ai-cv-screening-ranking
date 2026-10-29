"""Reading order of PDF pages: scrambled object order, right-aligned dates, and sidebar layouts."""

from __future__ import annotations

import io

import pymupdf
from reportlab.lib.colors import black
from reportlab.pdfgen import canvas

from src.worker.pdf_reading_order import Block, find_gutter, order_blocks, page_text_in_reading_order

W, H = 595, 842


def _page(draw) -> pymupdf.Page:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(W, H))
    c.setFillColor(black)
    draw(c)
    c.save()
    return pymupdf.open(stream=buf.getvalue(), filetype="pdf")[0]


def _positions(text: str, *markers: str) -> list[int]:
    return [text.index(m) for m in markers]


def test_text_written_in_scrambled_order_is_read_top_to_bottom():
    def draw(c):
        for y, s in [(400, "THIRD line of the page"), (700, "FIRST line of the page"), (550, "SECOND line of the page")]:
            c.drawString(60, y, s)

    text = page_text_in_reading_order(_page(draw))
    assert _positions(text, "FIRST", "SECOND", "THIRD") == sorted(_positions(text, "FIRST", "SECOND", "THIRD"))


def test_a_date_aligned_right_stays_with_its_title_row():
    def draw(c):
        # long paragraphs span the page, so there is no column gutter; titles left, dates right on the same row
        for title, date, y in [("TITLE_A", "DATE_A", 700), ("TITLE_B", "DATE_B", 500)]:
            c.drawString(60, y, title)
            c.drawString(450, y, date)
            c.drawString(60, y - 20, "Built services with Python and PostgreSQL for the billing platform used by many teams every day")
            c.drawString(60, y - 36, "Reviewed pull requests and wrote integration tests for the reporting module across several releases")

    text = page_text_in_reading_order(_page(draw))
    a, da, b, db = _positions(text, "TITLE_A", "DATE_A", "TITLE_B", "DATE_B")
    assert a < da < b < db  # A's date comes before B's title, not after every title


def test_a_two_column_page_is_read_one_column_at_a_time_below_a_full_width_header():
    def draw(c):
        c.drawString(60, 800, "HEADER_NAME across the whole page width  " + "x " * 60)
        for i in range(6):  # sidebar column
            c.drawString(40, 700 - i * 40, f"SIDE_{i} skill")
        for i in range(6):  # main column, written first so the file order is main then sidebar
            c.drawString(300, 700 - i * 40, f"MAIN_{i} experience line of the main column")
            c.drawString(300, 685 - i * 40, f"MAIN_{i}_detail more text of the main column here")

    page = _page(draw)
    text = page_text_in_reading_order(page)
    sides = _positions(text, *[f"SIDE_{i}" for i in range(6)])
    mains = _positions(text, *[f"MAIN_{i} " for i in range(6)])
    assert text.index("HEADER_NAME") < min(sides + mains)
    assert sides == sorted(sides) and mains == sorted(mains)
    assert max(sides) < min(mains) or max(mains) < min(sides)  # one column fully before the other


def test_a_single_column_page_keeps_its_order():
    def draw(c):
        for i in range(8):
            c.drawString(60, 760 - i * 30, f"LINE_{i} of an ordinary single column page with enough words to look real")

    text = page_text_in_reading_order(_page(draw))
    pos = _positions(text, *[f"LINE_{i}" for i in range(8)])
    assert pos == sorted(pos)


def test_a_heading_that_starts_a_little_inside_the_gap_belongs_to_the_right_column():
    sidebar = [Block(20, 150 + i * 60, 200, 190 + i * 60, f"S{i}") for i in range(5)]
    main = [Block(247, 150 + i * 60, 560, 190 + i * 60, f"M{i}") for i in range(5)]
    heading = Block(211, 110, 413, 140, "HEADING")  # begins in the gap between the columns
    texts = [b.text for b in order_blocks(sidebar + main + [heading], 595)]
    assert texts.index("HEADING") < texts.index("M0")
    assert texts.index("HEADING") > texts.index("S4")  # the sidebar is read first, then the heading and the main column


def test_gutter_needs_text_on_both_sides_and_few_crossing_blocks():
    left = [Block(40, 100 + i * 50, 200, 130 + i * 50, f"L{i}") for i in range(5)]
    right = [Block(300, 100 + i * 50, 560, 130 + i * 50, f"R{i}") for i in range(5)]
    assert find_gutter(left + right, 600) is not None  # (gap left edge, gap right edge)
    wide = [Block(40, 100 + i * 50, 560, 130 + i * 50, f"W{i}") for i in range(5)]
    assert find_gutter(wide + left[:1], 600) is None  # most of the text crosses the middle: no gutter
    assert [b.text for b in order_blocks(left + right, 600)][:5] == [f"L{i}" for i in range(5)]


def test_a_block_beside_a_spanning_block_is_not_lost():
    # a wide contact block across the page, and a narrow block that starts inside its vertical extent
    sidebar = [Block(20, 150 + i * 60, 200, 190 + i * 60, f"S{i}") for i in range(5)]
    main = [Block(247, 150 + i * 60, 560, 190 + i * 60, f"M{i}") for i in range(5)]
    wide = Block(18, 56, 586, 104, "WIDE_CONTACT")
    inside = Block(18, 90, 200, 130, "INSIDE_THE_WIDE_BLOCKS_EXTENT")
    ordered = order_blocks(sidebar + main + [wide, inside], 595)
    assert sorted(b.text for b in ordered) == sorted(b.text for b in sidebar + main + [wide, inside])


def test_ordering_is_always_a_permutation_of_the_blocks():
    import random

    rnd = random.Random(7)
    for _ in range(300):
        blocks = []
        for i in range(rnd.randint(1, 25)):
            x0 = rnd.choice([18, 20, 150, 230, 247, 300, 370])
            width = rnd.choice([60, 120, 200, 330, 560])
            y0 = rnd.uniform(20, 780)
            blocks.append(Block(x0, y0, min(x0 + width, 590), y0 + rnd.uniform(8, 120), f"B{i}"))
        ordered = order_blocks(blocks, 595)
        assert sorted(b.text for b in ordered) == sorted(b.text for b in blocks)


def test_reading_order_never_loses_or_adds_words_on_the_synthetic_cv_pdfs():
    """Reordering must be a permutation of the page's text. A lost block once dropped a whole contact line."""
    from collections import Counter
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent
    pdfs = sorted(root.glob("docs/spec/golden_dataset/cvs/core/*.pdf")) + sorted(root.glob("docs/eval/*/cvs/core/*.pdf"))
    if not pdfs:
        import pytest

        pytest.skip("synthetic CV PDFs are not built (python scripts/build_holdout_set.py ...)")
    for pdf in pdfs:
        for page in pymupdf.open(pdf):
            assert Counter(page_text_in_reading_order(page).split()) == Counter(page.get_text().split()), pdf.name
