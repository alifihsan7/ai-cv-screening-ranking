"""DOCX body text in document order, including tables.

CVs often put each job's title, company, and date range in a table row. Reading only `document.paragraphs`
skips every table, so those jobs vanish before parsing and the experience section comes back empty.
"""

from __future__ import annotations

import io
from collections.abc import Iterator

import docx
from docx.oxml.ns import qn
from docx.table import Table, _Cell
from docx.text.paragraph import Paragraph


def _blocks(parent: object, element: object) -> Iterator[Paragraph | Table]:
    for child in element.iterchildren():  # type: ignore[attr-defined]
        if child.tag == qn("w:p"):
            yield Paragraph(child, parent)  # type: ignore[arg-type]
        elif child.tag == qn("w:tbl"):
            yield Table(child, parent)  # type: ignore[arg-type]


def _cell_lines(cell: _Cell) -> list[str]:
    lines: list[str] = []
    for block in _blocks(cell, cell._tc):
        if isinstance(block, Paragraph):
            if block.text.strip():
                lines.append(block.text.strip())
        else:
            lines.extend(_table_lines(block))
    return lines


def _table_lines(table: Table) -> list[str]:
    """One line per non-empty cell, left to right, row by row. Merged cells are emitted once."""
    lines: list[str] = []
    for row in table.rows:
        seen: set[int] = set()
        for cell in row.cells:
            if id(cell._tc) in seen:
                continue
            seen.add(id(cell._tc))
            lines.extend(_cell_lines(cell))
    return lines


def extract_docx_text(content: bytes) -> str:
    """Returns the document text with one line per paragraph or table cell, in reading order."""
    document = docx.Document(io.BytesIO(content))
    lines: list[str] = []
    for block in _blocks(document, document.element.body):
        if isinstance(block, Paragraph):
            lines.append(block.text)
        else:
            lines.extend(_table_lines(block))
    return "\n".join(lines)
