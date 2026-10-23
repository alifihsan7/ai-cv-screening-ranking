"""Document section segmentation and ContextSectionType classification tool."""

from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, Field

from src.domain.models import ActionInput, ContextSectionType, ParserActionInput
from src.domain.tools.base import BaseTool, agent_tool


class ParsedSection(BaseModel):
    section_type: ContextSectionType
    heading: str
    text: str
    char_start: int = 0
    char_end: int = 0


class ParsedSectionsOutput(BaseModel):
    document_id: str
    sections: list[ParsedSection] = Field(default_factory=list)


_SECTION_PATTERNS: list[tuple[ContextSectionType, re.Pattern[str]]] = [
    (
        ContextSectionType.WORK_EXPERIENCE,
        re.compile(
            r"^(?:work\s+)?experience|pengalaman\s+kerja|riwayat\s+pekerjaan|employment(?:\s+history)?|professional\s+experience",
            re.IGNORECASE,
        ),
    ),
    (
        ContextSectionType.EDUCATION,
        re.compile(
            r"^education|pendidikan|academic(?:\s+background)?|riwayat\s+pendidikan",
            re.IGNORECASE,
        ),
    ),
    (
        ContextSectionType.SKILL_LIST,
        re.compile(
            r"^skills|keahlian|kemampuan|tech(?:\s+stack)?|technical\s+skills|kompetensi",
            re.IGNORECASE,
        ),
    ),
    (
        ContextSectionType.PROJECT,
        re.compile(
            r"^projects|proyek|portfolio|portofolio|personal\s+projects",
            re.IGNORECASE,
        ),
    ),
]


def classify_heading(heading: str) -> ContextSectionType:
    clean = heading.strip().lower()
    for stype, pat in _SECTION_PATTERNS:
        if pat.search(clean):
            return stype
    return ContextSectionType.UNKNOWN


@agent_tool(action_type="DOCLING_PARSER")
class DoclingParserTool(BaseTool):
    """Tool that segments raw or markdown document text into typed context sections."""

    name: str = "docling_parser"
    action_type: str = "DOCLING_PARSER"

    async def run(
        self,
        action_input: ActionInput,
        context: dict[str, Any] | None = None,
    ) -> ParsedSectionsOutput:
        if not isinstance(action_input, ParserActionInput):
            raise TypeError(f"Expected ParserActionInput, got {type(action_input)}")

        doc_id = action_input.document_id
        ctx = context or {}
        raw_text = ctx.get("raw_cv_text") or ctx.get("markdown") or ctx.get("text") or ""

        if not raw_text:
            return ParsedSectionsOutput(document_id=doc_id, sections=[])

        sections: list[ParsedSection] = []
        lines = raw_text.splitlines()

        current_heading = "HEADER"
        current_type = ContextSectionType.UNKNOWN
        current_lines: list[str] = []
        current_start = 0
        running_char = 0

        for line in lines:
            line_str = line.strip()
            is_header = line_str.startswith("#") or (
                len(line_str) < 60
                and any(pat.search(line_str) for _, pat in _SECTION_PATTERNS)
            )

            if is_header:
                if current_lines:
                    text_block = "\n".join(current_lines).strip()
                    sections.append(
                        ParsedSection(
                            section_type=current_type,
                            heading=current_heading,
                            text=text_block,
                            char_start=current_start,
                            char_end=running_char,
                        )
                    )
                    current_lines = []

                current_heading = line_str.lstrip("#").strip()
                current_type = classify_heading(current_heading)
                current_start = running_char

            current_lines.append(line)
            running_char += len(line) + 1

        if current_lines:
            text_block = "\n".join(current_lines).strip()
            sections.append(
                ParsedSection(
                    section_type=current_type,
                    heading=current_heading,
                    text=text_block,
                    char_start=current_start,
                    char_end=running_char,
                )
            )

        return ParsedSectionsOutput(document_id=doc_id, sections=sections)
