"""Smart Document Boundary Isolator: separates core CV/Resume pages from
auxiliary portfolio showcases, scanned certificates, and academic transcripts
without imposing arbitrary page number limits.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

ATTACHMENT_INDICATORS = [
    re.compile(
        r"\b(?:lampiran|attachment|kumpulan\s+karya|project\s+showcase|galeri\s+proyek|screens(?:hots)?|desain\s+arsitektur|denah|gambar\s+kerja)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:transkrip(?:\s+nilai|\s+akademik)?|daftar\s+nilai|academic\s+transcript|kartu\s+hasil\s+studi|khs|ijazah|surat\s+keterangan\s+lulus|skl|diploma|certificate\s+of\s+completion|piagam(?:\s+penghargaan)?)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:surat\s+keterangan\s+catatan\s+kepolisian|skck|kartu\s+tanda\s+penduduk|ktp|kartu\s+keluarga)\b",
        re.IGNORECASE,
    ),
]

STRONG_ACADEMIC_DIRECT = re.compile(
    r"\b(?:transkrip(?:\s+nilai|\s+akademik)?|academic\s+transcript|daftar\s+nilai|kartu\s+hasil\s+studi|khs|ijazah|surat\s+keterangan\s+lulus|skl|diploma)\b",
    re.IGNORECASE,
)

STRONG_ACADEMIC_COMBOS = [
    re.compile(r"\b(?:nomor\s+ijazah(?:\s+nasional)?|no\.?\s*ijazah)\b", re.IGNORECASE),
    re.compile(r"\byudisium\b", re.IGNORECASE),
    re.compile(r"\bsks\s*[x*]\s*n\b", re.IGNORECASE),
    re.compile(r"\bsemester\s+(?:[ivx]+|\d+)\b", re.IGNORECASE),
    re.compile(r"\b(?:dekan|rektor)\b", re.IGNORECASE),
]

ADMIN_ATTACHMENT_INDICATORS = re.compile(
    r"\b(?:surat\s+keterangan\s+catatan\s+kepolisian|skck|kartu\s+tanda\s+penduduk|ktp|kartu\s+keluarga)\b",
    re.IGNORECASE,
)


def is_strong_academic_page(text: str) -> bool:
    """Detects definitive academic graduation certificates, diplomas, or transcripts."""
    if STRONG_ACADEMIC_DIRECT.search(text):
        return True
    combo_hits = sum(1 for p in STRONG_ACADEMIC_COMBOS if p.search(text))
    if combo_hits >= 2:
        return True
    if re.search(r"\b(?:nomor\s+ijazah(?:\s+nasional)?|yudisium|sks\s*[x*]\s*n)\b", text, re.IGNORECASE):
        return True
    return False


CV_CORE_INDICATORS = [
    re.compile(r"\b(?:pengalaman(?:\s+kerja)?|work\s+experience|professional\s+experience|employment\s+history|riwayat\s+pekerjaan|pengalaman\s+organisasi|career\s+history|project\s+experience)\b", re.IGNORECASE),
    re.compile(r"\b(?:pendidikan|education|educational\s+background|riwayat\s+pendidikan|academic\s+history|latar\s+belakang\s+pendidikan)\b", re.IGNORECASE),
    re.compile(r"\b(?:keahlian|skills|technical\s+skills|kemampuan|kompetensi|core\s+competencies|ringkasan\s+profesional|professional\s+summary|profil\s+profesional|tentang\s+saya|about\s+me)\b", re.IGNORECASE),
    re.compile(r"\b(?:curriculum\s+vitae|daftar\s+riwayat\s+hidup|resume)\b", re.IGNORECASE),
]


@dataclass
class PageClassification:
    page_num: int
    page_type: str  # CV_CORE, PORTFOLIO_PROJECT, ATTACHMENT_ACADEMIC, ATTACHMENT_ADMIN
    confidence: float
    detected_headers: list[str] = field(default_factory=list)


@dataclass
class BoundaryResult:
    total_pages: int
    cv_core_pages: list[int]
    attachment_pages: list[int]
    cv_core_text: str
    attachments: list[dict[str, Any]] = field(default_factory=list)


def isolate_document_boundaries(pages: list[dict[str, Any]]) -> BoundaryResult:
    """Classifies each page structurally into CV_CORE vs ATTACHMENTS dynamically."""
    cv_core_pages: list[int] = []
    attachment_pages: list[int] = []
    classified_pages: list[PageClassification] = []
    attachments_list: list[dict[str, Any]] = []

    # State tracking: once we hit pure certificates/transcripts at the end, subsequent pages default to attachments
    has_entered_attachments = False
    last_attachment_type = "PORTFOLIO_PROJECT"

    for idx, p in enumerate(pages, 1):
        text = p.get("text", "").strip()
        img_count = p.get("image_count", 0)
        word_count = len(text.split())

        has_work_exp = bool(CV_CORE_INDICATORS[0].search(text))
        has_cv_core = any(ind.search(text) for ind in CV_CORE_INDICATORS)
        is_attachment_title = any(ind.search(text[:600]) for ind in ATTACHMENT_INDICATORS)
        is_strong_academic = is_strong_academic_page(text)

        page_type = "CV_CORE"

        if is_strong_academic and not has_work_exp:
            has_entered_attachments = True
            page_type = "ATTACHMENT_ACADEMIC"
            last_attachment_type = "ATTACHMENT_ACADEMIC"
        elif ADMIN_ATTACHMENT_INDICATORS.search(text[:600]) and not has_work_exp:
            has_entered_attachments = True
            page_type = "ATTACHMENT_ADMIN"
            last_attachment_type = "ATTACHMENT_ADMIN"
        elif is_attachment_title and not (has_work_exp and word_count >= 80):
            has_entered_attachments = True
            is_portfolio = bool(
                ATTACHMENT_INDICATORS[0].search(text[:600])
                or re.search(r"\b(?:proyek|project|portfolio|portofolio|karya|showcase|desain|galeri)\b", text, re.IGNORECASE)
            )
            page_type = "PORTFOLIO_PROJECT" if is_portfolio else "ATTACHMENT_ACADEMIC"
            last_attachment_type = page_type
        elif has_cv_core:
            page_type = "CV_CORE"
        elif has_entered_attachments:
            if is_strong_academic:
                page_type = "ATTACHMENT_ACADEMIC"
            else:
                page_type = last_attachment_type
        elif not has_cv_core and word_count < 80 and img_count > 0:
            # Low text with images on later pages
            if idx > 2:
                page_type = "PORTFOLIO_PROJECT"
                has_entered_attachments = True
                last_attachment_type = "PORTFOLIO_PROJECT"

        classified_pages.append(PageClassification(page_num=idx, page_type=page_type, confidence=0.9))

        if page_type == "CV_CORE":
            cv_core_pages.append(idx)
        else:
            attachment_pages.append(idx)
            attachments_list.append(
                {
                    "page_number": idx,
                    "type": page_type,
                    "preview": text[:200] if text else "[Image/Scan Page]",
                }
            )

    # Fallback safety: If by some edge-case no page was marked CV_CORE, designate page 1 as CV_CORE
    if not cv_core_pages and pages:
        cv_core_pages = [1]
        attachment_pages = [p for p in attachment_pages if p != 1]
        attachments_list = [a for a in attachments_list if a["page_number"] != 1]

    cv_core_text = "\n\n".join([pages[p - 1].get("text", "") for p in cv_core_pages if p - 1 < len(pages)])

    return BoundaryResult(
        total_pages=len(pages),
        cv_core_pages=cv_core_pages,
        attachment_pages=attachment_pages,
        cv_core_text=cv_core_text,
        attachments=attachments_list,
    )
