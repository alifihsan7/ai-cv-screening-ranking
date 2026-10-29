"""Production adapter converting raw cv-extractor output into CandidateProfile with provenance."""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# Ensure cv_extractor is accessible
CV_EXTRACTOR_SRC = Path(os.getenv("CV_EXTRACTOR_PATH") or (_REPO_ROOT.parent / "cv-extractor" / "src"))
if str(CV_EXTRACTOR_SRC) not in sys.path:
    sys.path.insert(0, str(CV_EXTRACTOR_SRC))

try:
    from cv_extractor.application.config import LlmConfig, OcrConfig, PipelineConfig
    from cv_extractor.bootstrap import build_service
except ImportError:
    LlmConfig = None  # type: ignore[assignment, misc]
    OcrConfig = None  # type: ignore[assignment, misc]
    PipelineConfig = None  # type: ignore[assignment, misc]
    build_service = None  # type: ignore[assignment]

from src.infrastructure.logging import logger
from src.worker.anchor import resolve_candidate_name_consensus
from src.worker.boundary import isolate_document_boundaries
from src.worker.docling_parser import parse_with_docling
from src.worker.pdf_reading_order import page_text_in_reading_order
from src.worker.docx_text import extract_docx_text

EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_PATTERN = re.compile(r"(?:\+62|62|08)[0-9\s\-]{8,15}")

MONTHS_MAP = {
    "jan": "01",
    "januari": "01",
    "january": "01",
    "feb": "02",
    "februari": "02",
    "pebruari": "02",
    "february": "02",
    "mar": "03",
    "maret": "03",
    "march": "03",
    "apr": "04",
    "april": "04",
    "mei": "05",
    "may": "05",
    "jun": "06",
    "juni": "06",
    "june": "06",
    "jul": "07",
    "juli": "07",
    "july": "07",
    "agu": "08",
    "agt": "08",
    "agus": "08",
    "agustus": "08",
    "aug": "08",
    "august": "08",
    "sep": "09",
    "sept": "09",
    "september": "09",
    "okt": "10",
    "oktober": "10",
    "oct": "10",
    "october": "10",
    "nov": "11",
    "nopember": "11",
    "november": "11",
    "des": "12",
    "desember": "12",
    "dec": "12",
    "december": "12",
}

PRESENT_SET = {
    "sekarang",
    "saat ini",
    "kini",
    "present",
    "now",
    "current",
    "currently",
    "to date",
    "ongoing",
}
MONTHS_REGEX_STR = r"(?:jan(?:uari|uary)?|feb(?:ruari|ruary)?|mar(?:et|ch)?|apr(?:il)?|mei|may|jun(?:i|e)?|jul(?:i|y)?|agu(?:stus)?|aug(?:ust)?|sep(?:t(?:ember)?)?|okt(?:ober)?|oct(?:ober)?|nov(?:ember)?|des(?:ember)?|dec(?:ember)?)"

SECTION_BOUNDARY_REGEX = re.compile(
    r"^(?:prestasi(?:\s+dan\s+penghargaan)?|penghargaan|awards?|achievements?|"
    r"sertifikasi|sertifikat|certifications?|certificates?|licenses?|"
    r"kemampuan(?:\s+teknikal)?|keahlian|skills?|technical\s+skills?|hard\s+skills?|kompetensi|"
    r"pendidikan|education|riwayat\s+pendidikan|"
    r"pengalaman\s+organisasi|organisasi|organizations?|pelatihan|training|"
    r"proyek|projects?|publikasi|publications?|bahasa|languages?)\b",
    re.IGNORECASE,
)

RANGE_REGEX = re.compile(
    rf"[(]?\s*({MONTHS_REGEX_STR}(?:\s+\d{{4}})?|\d{{1,2}}[./-]\d{{4}}|\b\d{{4}}\b)\s*[)]?\s*(?:[-–—―−‒=~]+|s/d|sd|to|sampai|hingga|until)\s*[(]?\s*({MONTHS_REGEX_STR}(?:\s+\d{{4}})?|\d{{1,2}}[./-]\d{{4}}|\b\d{{4}}\b|sekarang|present|saat ini|kini|current|currently|now|to date|ongoing)\s*[)]?",
    re.IGNORECASE,
)


def clean_ocr_noise(text: str) -> str:
    """Sanitizes light OCR noise and Tesseract artifacts from scanned documents."""
    if not text:
        return ""

    lines = text.splitlines()
    cleaned_lines = []

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        # Discard lines that only contain punctuation, symbols, or whitespace
        if not any(c.isalnum() for c in line):
            continue

        # Strip garbage runs of 3+ consecutive punctuation/noise characters
        line = re.sub(r"[\\/:\-~?_|=]{3,}", " ", line)

        # Remove typical Tesseract stamp/border artifacts (e.g. €@t, ffi'@-ff.&, *lplllllll)
        line = re.sub(r"(?:€@\S*|ffi['@\-]+ff\S*|\\?\*+lpl+\w*)", "", line, flags=re.IGNORECASE)

        # Abnormal repetitions of narrow characters or pipe/digit glitches
        line = re.sub(r"[lI|!1]{5,}", "", line)

        # Normalize multiple spaces
        line = re.sub(r"[ \t]+", " ", line).strip()

        # Only retain lines with at least 2 alphanumeric characters
        if sum(1 for c in line if c.isalnum()) >= 2:
            cleaned_lines.append(line)

    return "\n".join(cleaned_lines).strip()


class _FallbackExtractorResult:
    def __init__(self, data: dict[str, Any]):
        self._data = data

    def to_dict(self) -> dict[str, Any]:
        return self._data


class _FallbackExtractorService:
    def extract(self, content: bytes, filename: str) -> _FallbackExtractorResult:
        import pymupdf

        full_text = ""
        extraction_warnings: list[str] = []
        fn_lower = filename.lower()
        if fn_lower.endswith(".pdf"):
            try:
                pdf_doc = pymupdf.open(stream=content, filetype="pdf")
                pages_text: list[str] = []
                for i in range(len(pdf_doc)):
                    page = pdf_doc[i]
                    p_txt = page_text_in_reading_order(page)
                    if len(p_txt.strip()) < 30 and len(page.get_images()) > 0:
                        try:
                            tp = page.get_textpage_ocr(language="eng+ind", dpi=300)
                            ocr_txt = clean_ocr_noise(page_text_in_reading_order(page, tp))
                            if len(ocr_txt.strip()) > len(p_txt.strip()):
                                p_txt = ocr_txt
                        except Exception:
                            pass
                    p_txt = clean_ocr_noise(p_txt) if p_txt else p_txt
                    pages_text.append(p_txt)
                pdf_doc.close()
                full_text = "\n".join(pages_text)
            except Exception:
                full_text = ""
        elif fn_lower.endswith((".docx", ".doc")):
            try:
                full_text = extract_docx_text(content)
            except Exception as err:
                logger.warning(f"DOCX text extraction failed for {filename}: {err}")
                full_text = ""
                extraction_warnings.append("DOCX_TEXT_EXTRACTION_FAILED")
        else:
            full_text = content.decode("utf-8", errors="ignore")

        # Contact extraction
        emails = [
            re.sub(r"\s+", "", e)
            for e in re.findall(r"\b[A-Za-z0-9._%+-]+@[ \t]*[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", full_text)
        ]
        phones = re.findall(r"(?:\+?62|08)[0-9\s-]{8,15}", full_text)
        urls = re.findall(r"(?:https?://[^\s]+|linkedin\.com/in/[a-zA-Z0-9_-]+)", full_text)

        # Section classification
        heading_map = [
            (
                "experience",
                re.compile(
                    r"^(?:pengalaman(?:\s+(?:kerja|profesional))?|riwayat\s+(?:pekerjaan|kerja)|"
                    r"(?:(?:work|professional|related|relevant|working|career|project\s*(?:&|and)\s*work|work\s*(?:&|and)\s*project)\s+)?"
                    r"experience(?:s)?|employment\s+history|professional\s+background|work\s+history|career\s+history)\b",
                    re.IGNORECASE,
                ),
            ),
            ("education", re.compile(r"^(?:pendidikan(?:\s+formal)?|riwayat\s+pendidikan|education|academic\s+background)\b", re.IGNORECASE)),
            ("skills", re.compile(r"^(?:keahlian|kemampuan(?:\s+teknikal)?|skills?|technical\s+skills?|hard\s+skills?|kompetensi)\b", re.IGNORECASE)),
            ("certifications", re.compile(r"^(?:sertifikasi|sertifikat|certifications?|certificates?|licenses?)\b", re.IGNORECASE)),
            ("summary", re.compile(r"^(?:ringkasan(?:\s+profil)?|tentang\s+saya|profil(?:\s+singkat)?|summary|professional\s+summary|about\s+me)\b", re.IGNORECASE)),
            ("projects", re.compile(r"^(?:proyek|projects?)\b", re.IGNORECASE)),
            ("organizations", re.compile(r"^(?:organisasi|organizations?|pengalaman\s+organisasi|pelatihan|training)\b", re.IGNORECASE)),
            ("awards", re.compile(r"^(?:prestasi(?:\s+dan\s+penghargaan)?|penghargaan|awards?|achievements?|prestasi)\b", re.IGNORECASE)),
            ("personal", re.compile(r"^(?:data\s+pribadi|informasi\s+pribadi|personal\s+details?)\b", re.IGNORECASE)),
            ("languages", re.compile(r"^(?:bahasa|languages?)\b", re.IGNORECASE)),
        ]

        sections: list[dict[str, str]] = []
        header_lines: list[str] = []
        current_label: str | None = None
        current_lines: list[str] = []

        for raw_line in full_text.splitlines():
            line = raw_line.strip()
            if not line:
                continue

            matched_label = None
            if len(line) < 50:
                clean_heading = line.lstrip("#*-•~ \t").strip()
                for lbl, pat in heading_map:
                    if pat.match(clean_heading):
                        matched_label = lbl
                        break

            if matched_label:
                if current_label and current_lines:
                    sections.append({"label": current_label, "text": "\n".join(current_lines)})
                    current_lines = []
                current_label = matched_label
            else:
                if current_label is None:
                    header_lines.append(line)
                else:
                    current_lines.append(line)

        if current_label and current_lines:
            sections.append({"label": current_label, "text": "\n".join(current_lines)})

        name = header_lines[0] if header_lines else None
        headline = header_lines[1] if len(header_lines) > 1 else None
        summary = "\n".join(header_lines[2:]) if len(header_lines) > 2 else None

        data = {
            "name": name,
            "headline": headline,
            "summary": summary,
            "contact": {
                "emails": emails,
                "phones": [p.strip() for p in phones],
                "urls": urls,
                "location": None,
            },
            "sections": sections,
            "meta": {
                "confidence": 0.95,
                "warnings": extraction_warnings,
            },
        }
        return _FallbackExtractorResult(data)


_extractor_service = None


def get_extractor_service():
    global _extractor_service
    if _extractor_service is None:
        if build_service is None or PipelineConfig is None or OcrConfig is None or LlmConfig is None:
            _extractor_service = _FallbackExtractorService()
        else:
            _extractor_service = build_service(PipelineConfig(ocr=OcrConfig(), llm=LlmConfig(enabled=False)))
    return _extractor_service


def norm_single_date(s: str, is_end: bool = False, ref_year: str = "", as_of: str | None = None) -> dict[str, Any]:
    s_raw = s.strip()
    s_clean = s_raw.strip("()[]{} \t.,").lower()
    if any(p in s_clean for p in PRESENT_SET):
        return {"raw": s_raw, "value": "present", "precision": "month", "kind": "FACT"}

    m = re.search(r"(\d{1,2})[./-](\d{4})", s_clean)
    if m:
        val = f"{m.group(2)}-{int(m.group(1)):02d}"
        return {"raw": s_raw, "value": val, "precision": "month", "kind": "FACT"}

    m = re.search(rf"({MONTHS_REGEX_STR})\s+(\d{{4}})", s_clean)
    if m:
        mname = m.group(1)
        year = m.group(2)
        mcode = MONTHS_MAP.get(mname[:3], "01")
        return {"raw": s_raw, "value": f"{year}-{mcode}", "precision": "month", "kind": "FACT"}

    m = re.search(rf"^({MONTHS_REGEX_STR})$", s_clean)
    if m and ref_year:
        mname = m.group(1)
        mcode = MONTHS_MAP.get(mname[:3], "01")
        year_num = int(ref_year) + (1 if is_end else 0)
        return {"raw": s_raw, "value": f"{year_num}-{mcode}", "precision": "month", "kind": "FACT"}

    m = re.match(r"^\d{4}$", s_clean)
    if m:
        y = m.group(0)
        return {"raw": s_raw, "value": y, "precision": "year", "kind": "INFERENCE"}

    m = re.match(r"^(\d{4})-(\d{2})$", s_clean)
    if m:
        return {"raw": s_raw, "value": f"{m.group(1)}-{m.group(2)}", "precision": "month", "kind": "FACT"}

    return {"raw": s_raw, "value": None, "precision": "unknown", "kind": "FACT"}


def find_provenance(full_text: str, quote: str, default_page: int = 1) -> dict[str, Any]:
    if not quote or not full_text:
        return {"page": default_page, "char_start": 0, "char_end": 0, "text": quote, "verified": False}
    clean_q = quote.strip()
    idx = full_text.find(clean_q)
    if idx >= 0:
        return {
            "page": default_page,
            "char_start": idx,
            "char_end": idx + len(clean_q),
            "text": clean_q,
            "verified": True,
        }
    return {"page": default_page, "char_start": 0, "char_end": 0, "text": clean_q, "verified": False}


ROLE_KEYWORDS = [
    "analyst",
    "engineer",
    "developer",
    "manager",
    "staff",
    "intern",
    "consultant",
    "officer",
    "lead",
    "head",
    "specialist",
    "direktur",
    "spv",
    "project",
    "asisten",
    "asst",
    "architect",
    "programmer",
    "administrator",
    "designer",
    "scientist",
    "devops",
    "sre",
    "fullstack",
    "full stack",
    "backend",
    "frontend",
    "software",
    "qa",
    "tester",
    "web",
    "mobile",
    "cloud",
    "data",
    "coordinator",
    "koordinator",
    "supervisor",
]
COMPANY_KEYWORDS = [
    "pt",
    "cv",
    "inc",
    "ltd",
    "corp",
    "tech",
    "technologies",
    "studios",
    "solutions",
    "group",
    "co.",
    "persero",
    "tbk",
    "llc",
    "gmbh",
    "yayasan",
    "badan",
    "dinas",
    "kementerian",
]
ACTION_VERBS = {
    "mengembangkan",
    "membangun",
    "membuat",
    "mengelola",
    "merancang",
    "mengimplementasikan",
    "memelihara",
    "meningkatkan",
    "menurunkan",
    "melakukan",
    "menyusun",
    "mengerjakan",
    "membantu",
    "mengkoordinasikan",
    "memimpin",
    "bertanggung",
    "bekerja",
    "mengoptimalkan",
    "menguji",
    "menulis",
    "developed",
    "developing",
    "built",
    "building",
    "implemented",
    "implementing",
    "designed",
    "designing",
    "managed",
    "managing",
    "led",
    "leading",
    "created",
    "creating",
    "maintained",
    "maintaining",
    "optimized",
    "optimizing",
    "worked",
    "working",
    "assisted",
    "assisting",
    "responsible",
    "coordinated",
    "collaborated",
}
ROLE_STARTERS_REGEX = re.compile(
    r"\b((?:senior|junior|lead|principal|staff|head(?:\s+of)?|chief|full\s*stack|fullstack|backend|frontend|software|web|mobile|cloud|devops|sre|programmer|developer|engineer|architect|analyst|consultant|specialist|manager|officer|asisten|koordinator|spv|supervisor|pt\.?|cv\.?)\b.*)",
    re.IGNORECASE,
)


def _extract_title_org(text: str) -> tuple[str, str]:
    t = text.strip("()-–—|:,• \t")
    if not t:
        return "", ""

    parts = [p.strip() for p in re.split(r"[—–|]|\s+-\s+|,\s+|\s+(?:at|di)\s+|\s+@\s+", t) if p.strip()]
    if len(parts) >= 2:
        p0, p1 = parts[0], parts[1].split(",")[0].strip()
        if any(k in p1.lower() for k in ROLE_KEYWORDS) and not any(k in p0.lower() for k in ROLE_KEYWORDS):
            title, org = p1, p0
        elif any(c in p0.lower() for c in COMPANY_KEYWORDS) and not any(c in p1.lower() for c in COMPANY_KEYWORDS):
            title, org = p1, p0
        else:
            title, org = p0, p1
    else:
        m_comp = re.search(r"\b(PT\.?|CV\.?|Inc\.?|Ltd\.?|LLC|Corp\.?)\s+(.+)", t, re.I)
        if m_comp:
            if m_comp.start() > 0:
                title = t[: m_comp.start()].strip("—–|-, \t")
                org = t[m_comp.start() :].strip("—–|-, \t")
            else:
                m_role = re.search(
                    r"\b(senior|junior|lead|principal|staff|full\s*stack|fullstack|backend|frontend|software|web|mobile|cloud|devops|sre|programmer|developer|engineer|architect|analyst|consultant|specialist|manager|officer|asisten|koordinator)\b",
                    t,
                    re.I,
                )
                if m_role and m_role.start() > 0:
                    org = t[: m_role.start()].strip("—–|-, \t")
                    title = t[m_role.start() :].strip("—–|-, \t")
                else:
                    title, org = t, ""
        else:
            title, org = t, ""

    if title:
        title = re.sub(
            r"^(?:interned\s+as\s+a|worked\s+as\s+an|worked\s+as\s+a|sebagai)\s+", "", title, flags=re.I
        ).strip()
        title = re.split(r"[—–|]|\s+-\s+", title)[0].strip()
    if org:
        org = org.split(",")[0].strip()

    return title, org


def _split_inline_boundary(raw_text: str) -> tuple[list[str], str]:
    s = raw_text.strip().strip("(-|•— \t")
    if not s:
        return [], ""

    segments = [seg.strip() for seg in re.split(r"(?:[•*▪▫~\n]|;\s*|\.\s+(?=[A-Z0-9]))", s) if seg.strip()]

    def is_candidate_header(text: str) -> bool:
        t = text.strip("()-–—|:,• \t")
        if not t or len(t) > 120:
            return False
        first_word = t.lower().split()[0] if t.split() else ""
        if first_word in ACTION_VERBS:
            return False
        return any(k in t.lower() for k in ROLE_KEYWORDS) or any(c in t.lower() for c in COMPANY_KEYWORDS)

    if len(segments) >= 2:
        last = segments[-1]
        if is_candidate_header(last):
            prev_seg = segments[-2]
            if (
                len(segments) >= 2
                and len(prev_seg) <= 80
                and (
                    any(k in prev_seg.lower() for k in ROLE_KEYWORDS)
                    or any(c in prev_seg.lower() for c in COMPANY_KEYWORDS)
                )
                and (prev_seg.lower().split()[0] if prev_seg.split() else "") not in ACTION_VERBS
            ):
                header = f"{prev_seg} - {last}"
                bullets = segments[:-2]
            else:
                header = last
                bullets = segments[:-1]
            return bullets, header
        else:
            return segments, ""

    if is_candidate_header(s):
        return [], s

    m = ROLE_STARTERS_REGEX.search(s)
    if m and m.start() > 0:
        cand_head = s[m.start() :].strip("()-–—|:,• \t")
        cand_bullet = s[: m.start()].strip("()-–—|:,• \t")
        if is_candidate_header(cand_head):
            return [cand_bullet] if cand_bullet else [], cand_head

    return [s], ""


_BULLET_START = ("•", "-", "*", "▪", "▫", "~", "·", "○", "◦", "►", "➢", "–")
# "April , 2024" (a comma after the month) and "9 bulan" / "2 years 3 months" duration notes next to a date range
_MONTH_COMMA_YEAR = re.compile(rf"\b({MONTHS_REGEX_STR})\s*,\s*(\d{{4}})\b", re.IGNORECASE)
_DURATION_NOTE = re.compile(
    r"[(\[]?\s*\d+\s*(?:tahun|years?|yrs?)(?:\s+\d+\s*(?:bulan|months?|mos?))?\s*[)\]]?"
    r"|[(\[]\s*\d+\s*(?:bulan|months?|mos?)\s*[)\]]",
    re.IGNORECASE,
)
_CONTACT_LINE = re.compile(r"@|linkedin\.com|github\.com|\+\d{2}[\d\s-]{6,}|\b0\d{2,3}[\s-]?\d{3,4}[\s-]?\d{3,5}\b", re.IGNORECASE)
_EXPERIENCE_HEADING = re.compile(
    r"^(?:pengalaman(?:\s+kerja)?|riwayat\s+pekerjaan|work\s+experience|professional\s+experience|experience|employment(?:\s+history)?)\s*:?$",
    re.IGNORECASE,
)
_MODE_WORDS = {"remote", "onsite", "on-site", "hybrid", "wfh", "wfo", "full-time", "part-time", "fulltime", "parttime"}


# Words that name a field more often than a job: "PT. Mitra Data" is a company, "Web Developer" has "developer".
_GENERIC_ROLE_WORDS = {"data", "project", "software", "web", "mobile", "cloud", "head", "staff"}


def _has_role_word(text: str) -> bool:
    low = text.lower()
    return any(
        re.search(rf"(?<![a-z]){re.escape(k)}(?![a-z])", low) for k in ROLE_KEYWORDS if k not in _GENERIC_ROLE_WORDS
    )


def _is_bullet_line(line: str) -> bool:
    s = line.lstrip()
    return bool(s) and (s.startswith(_BULLET_START) or "\uf000" <= s[0] <= "\uf8ff")


def _is_header_like(line: str) -> bool:
    """A short line that can be a job title, a company, or both: not a bullet, a sentence, or a wrapped line."""
    s = line.strip()
    if not s or _is_bullet_line(s) or RANGE_REGEX.search(s) or len(s) > 90:
        return False
    words = s.split()
    if len(words) > 10 or s[0].islower():
        return False
    return not (s.endswith(".") and len(words) > 4)


def _is_place_line(line: str) -> bool:
    """'Bandung, West Java, Indonesia' or 'Remote': a location written under a job header, never a bullet."""
    s = line.strip()
    if not s or _is_bullet_line(s) or s.endswith(".") or len(s.split()) > 7:
        return False
    if s.lower() in _MODE_WORDS:
        return True
    trailing_comma = s.endswith(",")  # "Bandung," when the region wraps onto the next line
    parts = [p.strip() for p in s.rstrip(",").split(",")]
    if len(parts) == 1:
        return trailing_comma and bool(parts[0]) and parts[0][0].isupper() and len(parts[0].split()) <= 3
    return all(p and p[0].isupper() and len(p.split()) <= 3 for p in parts)


def _drop_repeated_page_header(lines: list[str], full_doc_text: str) -> list[str]:
    """Removes a contact block (name, headline, contact line) that a paginated CV repeats on every page."""
    head = {ln.strip() for ln in full_doc_text.splitlines() if ln.strip()}
    first = [ln.strip() for ln in full_doc_text.splitlines() if ln.strip()][:8]
    head = set(first)
    drop: set[int] = set()
    for j, line in enumerate(lines):
        if line.strip() in head and _CONTACT_LINE.search(line):
            drop.add(j)
            for k in (j - 1, j - 2):
                if k >= 0 and lines[k].strip() in head and not RANGE_REGEX.search(lines[k]):
                    drop.add(k)
    return [line for j, line in enumerate(lines) if j not in drop]


def _plain_line(lines: list[str], i: int) -> str:
    """Line `i` if it is a header candidate (not a bullet, not a date line), else empty."""
    if i >= len(lines):
        return ""
    line = lines[i].strip()
    if not line or _is_bullet_line(line) or RANGE_REGEX.search(line):
        return ""
    return line


def has_job_like_date_ranges(text: str) -> bool:
    """True when the text holds at least two date ranges that look like jobs, not like school years.

    A job range names a month or ends in "present"; a school range is usually two years ("2019 - 2023").
    """
    job_like = 0
    for m in RANGE_REGEX.finditer(text.replace("\xa0", " ")):
        start, end = m.group(1), m.group(2)
        if end.strip().lower() in PRESENT_SET or not (start.strip().isdigit() and end.strip().isdigit()):
            job_like += 1
    return job_like >= 2


def is_fragmented_text(text: str) -> bool:
    """True for text that came out as a column-scrambled or one-word-per-line read order.

    Such text cannot be parsed by any line heuristic. Most lines of a normal CV hold three or more words.
    """
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if len(lines) < 40:
        return False
    short = sum(1 for ln in lines if len(ln.split()) <= 2)
    return short / len(lines) >= 0.5


def parse_experiences(section_text: str, full_doc_text: str, as_of: str | None = None) -> list[dict[str, Any]]:
    valid_lines = []
    for l in [line.strip() for line in section_text.splitlines() if line.strip()]:
        l_clean = l.lstrip("#*-•~ \t").strip()
        if len(l_clean) < 60 and SECTION_BOUNDARY_REGEX.match(l_clean):
            break
        valid_lines.append(l)
    lines = [_DURATION_NOTE.sub("", _MONTH_COMMA_YEAR.sub(r"\1 \2", l.replace("\xa0", " "))).rstrip(" |") for l in valid_lines]
    lines = _drop_repeated_page_header([l for l in lines if l.strip()], full_doc_text)
    lines = [l for l in lines if not _EXPERIENCE_HEADING.match(l.strip())]
    if not lines:
        return []

    # 1. Collect all date ranges / markers across lines using finditer
    date_lines: list[tuple[int, str, str, int, int]] = []
    for idx, l in enumerate(lines):
        ranges = list(RANGE_REGEX.finditer(l))
        if ranges:
            for m in ranges:
                date_lines.append((idx, m.group(1), m.group(2), m.start(), m.end()))
        else:
            m_single = re.search(r"\b(19\d{2}|20\d{2})\b\s*[|—–-]\s*(.+)", l)
            if m_single:
                date_lines.append((idx, m_single.group(1), m_single.group(1), 0, len(l)))
            elif re.match(r"^[(]?\s*(?:19\d{2}|20\d{2})\s*[)]?$", l.strip()):
                m_yr = re.search(r"\b(19\d{2}|20\d{2})\b", l.strip())
                if m_yr:
                    y_match = m_yr.group(1)
                    date_lines.append((idx, y_match, y_match, 0, len(l)))

    if not date_lines:
        return []

    n_dates = len(date_lines)

    # 2. First Pass: Isolate boundaries, extract titles and organizations, and record used lines
    parsed_meta: list[dict[str, Any]] = []
    extra_prev_bullets: dict[int, list[str]] = {i: [] for i in range(n_dates)}

    for i in range(n_dates):
        idx, raw_start, raw_end, m_start, m_end = date_lines[i]

        prev_end = date_lines[i - 1][4] if (i > 0 and date_lines[i - 1][0] == idx) else 0
        slice_before = lines[idx][prev_end:m_start]

        next_start = date_lines[i + 1][3] if (i + 1 < n_dates and date_lines[i + 1][0] == idx) else len(lines[idx])
        slice_after = lines[idx][m_end:next_start]

        curr_head = ""
        if i > 0 and date_lines[i - 1][0] == idx:
            b_list, h_str = _split_inline_boundary(slice_before)
            extra_prev_bullets[i - 1].extend(b_list)
            curr_head = h_str
        else:
            _, h_str = _split_inline_boundary(slice_before)
            curr_head = h_str if h_str else slice_before.strip("(-|•— \t")

        title = ""
        org = ""
        used_lines: set[int] = {idx}
        post_bullets: list[str] = []

        # Strategy 0: "Title, Company" (or "Title | Company", or just "Title") on the line before; the date line only
        # carries a place or mode ("| Jakarta", "Jakarta | Onsite |") or the company ("PT. X - City | |").
        same_line = (curr_head or slice_after).strip(")-:|•— \t")
        prev_header = lines[idx - 1].strip() if idx > 0 and (i == 0 or date_lines[i - 1][0] < idx) else ""
        if same_line and prev_header and _is_header_like(prev_header) and _has_role_word(prev_header):
            same_has_role = _has_role_word(same_line)
            same_has_company = any(re.search(rf"\b{re.escape(c)}\b", same_line.lower()) for c in COMPANY_KEYWORDS)
            if not same_has_role and (same_has_company or len(same_line.replace("|", " ").split()) <= 4):
                t0, o0 = _extract_title_org(prev_header)
                if t0:
                    title, org = t0, o0
                    if not org and same_has_company:
                        org = re.split(r"\s+[-–—]\s+|\s*\|\s*|,\s+", same_line)[0].strip()
                    used_lines.add(idx - 1)

        # Strategy 0c/0d: "Company / dates / Title" or "Company dates / Title": the line after the dates is the job
        # title and the text before them is the company, so the company must not become the title.
        next_header = _plain_line(lines, idx + 1)
        # "Company / City, / dates" is a strong sign by itself: the line after the dates is then the title, whether
        # or not it contains a word that names a role ("Pendamping Program Anak")
        company_place_pattern = (
            not same_line
            and idx > 1
            and _is_place_line(lines[idx - 1])
            and _is_header_like(lines[idx - 2])
            and not _has_role_word(lines[idx - 2])
        )
        if (
            not title
            and next_header
            and _is_header_like(next_header)
            and (_has_role_word(next_header) or company_place_pattern)
            and not (i + 1 < n_dates and date_lines[i + 1][0] == idx)
        ):
            company_text = ""
            if same_line and not _has_role_word(same_line):
                # 0d: company and dates share the line (the raw text: `curr_head` may have joined "PT" and the name)
                company_text = slice_before.strip(")-:|•— \t") or same_line
            elif (
                not same_line
                and idx > 0
                and _is_header_like(lines[idx - 1])
                and not _has_role_word(lines[idx - 1])
                # "Title / Company / dates / subtitle": the title is already two lines up, so the line after the dates
                # is a project subtitle, not the title
                and not (idx > 1 and _is_header_like(lines[idx - 2]) and _has_role_word(lines[idx - 2]))
            ):
                company_text = lines[idx - 1].strip()  # 0c: the company is the line above the dates
                used_lines.add(idx - 1)
                if (
                    _is_place_line(company_text)
                    and idx > 1
                    and _is_header_like(lines[idx - 2])
                    and not _has_role_word(lines[idx - 2])
                ):
                    # "Company / City, / dates / Title": the line above the dates is only the place
                    company_text = lines[idx - 2].strip()
                    used_lines.add(idx - 2)
            if company_text:
                title = next_header
                org = re.split(r"\s+[-–—]\s+|\s*\|\s*|,\s+", company_text)[0].strip()
                used_lines.add(idx + 1)

        # Strategy 1: Title from slice_before
        if not title and curr_head:
            t, o = _extract_title_org(curr_head)
            if t and (
                any(k in t.lower() for k in ROLE_KEYWORDS)
                or any(c in o.lower() for c in COMPANY_KEYWORDS)
                or not slice_after.strip()
            ):
                title, org = t, o

        # Strategy 2: Title from slice_after (e.g. date precedes title on same line)
        if not title and slice_after.strip(")-:|•— \t"):
            b_after, h_after = _split_inline_boundary(slice_after)
            if h_after:
                t, o = _extract_title_org(h_after)
                if t:
                    title, org = t, o
                    post_bullets.extend(b_after)
            else:
                t, o = _extract_title_org(slice_after)
                if t:
                    title, org = t, o

        # Strategy 2b: "date first" layout. The date sits alone on its line and the header follows it;
        # the line before is the previous entry's bullet (or nothing), so it cannot be this entry's header.
        if not title and not curr_head.strip() and not slice_after.strip(")-:|•— \t"):
            prev_is_content = idx == 0 or not _is_header_like(lines[idx - 1])
            nxt = _plain_line(lines, idx + 1)
            if prev_is_content and nxt:
                title = nxt
                used_lines.add(idx + 1)
                org_line = _plain_line(lines, idx + 2)
                if org_line:
                    org = org_line.split(",")[0].strip()
                    used_lines.add(idx + 2)

        # Strategy 2c: "Title / Company [| City] / dates": the title is two lines up and the company is the line above
        # the dates (which may carry a "| City" suffix that the older two-part split would take for the organization).
        if not title and not same_line and idx > 1 and (i == 0 or date_lines[i - 1][0] < idx):
            title_line, company_line = lines[idx - 2].strip(), lines[idx - 1].strip()
            if (
                _is_header_like(title_line)
                and _has_role_word(title_line)
                and _is_header_like(company_line)
                and not _has_role_word(company_line)
            ):
                title = title_line
                org = re.split(r"\s+[-–—]\s+|\s*\|\s*|,\s+", company_line)[0].strip()
                used_lines.update({idx - 2, idx - 1})

        # Strategy 3: Title from preceding lines (when date is on its own line)
        if not title and idx > 0 and (i == 0 or date_lines[i - 1][0] < idx):
            prev_line = lines[idx - 1].strip("(-|•— \t")
            parts = [p.strip() for p in re.split(r"[—–|]|\s+-\s+", prev_line) if p.strip()]
            if len(parts) >= 2:
                p0, p1 = parts[0], parts[1].split(",")[0].strip()
                if any(k in p1.lower() for k in ROLE_KEYWORDS) and not any(k in p0.lower() for k in ROLE_KEYWORDS):
                    title, org = p1, p0
                else:
                    title, org = p0, p1
                used_lines.add(idx - 1)
            else:
                cand_title = prev_line.strip()
                org_line = lines[idx - 2].strip() if idx > 1 else ""
                cand_org = org_line.split(",")[0].strip() if _is_header_like(org_line) else ""
                if cand_org and any(k in cand_org.lower() for k in ROLE_KEYWORDS) and (
                    not any(k in cand_title.lower() for k in ROLE_KEYWORDS)
                    or any(c in cand_title.lower() for c in COMPANY_KEYWORDS)
                ):
                    title, org = cand_org, cand_title
                    used_lines.update({idx - 2, idx - 1})
                else:
                    title, org = cand_title, cand_org
                    used_lines.add(idx - 1)
                    if cand_org:
                        used_lines.add(idx - 2)
                title = re.sub(
                    r"^(?:interned\s+as\s+a|worked\s+as\s+an|worked\s+as\s+a|sebagai)\s+", "", title, flags=re.I
                ).strip()

        # Strategy 4: Fallback to next / previous candidate lines if still not resolved
        if not title:
            candidate_next = (
                lines[idx + 1].strip("•-* \t")
                if (idx + 1 < len(lines) and not RANGE_REGEX.search(lines[idx + 1]))
                else ""
            )
            candidate_prev = (
                lines[idx - 1].strip("•-* \t") if (idx > 0 and not RANGE_REGEX.search(lines[idx - 1])) else ""
            )

            if candidate_next and (
                "," in candidate_next
                or "-" in candidate_next
                or any(k in candidate_next.lower() for k in ROLE_KEYWORDS)
            ):
                parts = re.split(r"[,|—–-]", candidate_next)
                if len(parts) >= 2:
                    p0, p1 = parts[0].strip(), parts[1].strip()
                    if any(k in p1.lower() for k in ROLE_KEYWORDS):
                        title, org = p1, p0
                    else:
                        title, org = p0, p1
                else:
                    title = candidate_next
                    if candidate_prev:
                        org = candidate_prev
                used_lines.add(idx + 1)
            elif candidate_prev:
                parts = re.split(r"[,|—–-]", candidate_prev)
                if len(parts) >= 2:
                    p0, p1 = parts[0].strip(), parts[1].strip()
                    if any(k in p1.lower() for k in ROLE_KEYWORDS):
                        title, org = p1, p0
                    else:
                        title, org = p0, p1
                else:
                    title = candidate_prev
                    if candidate_next:
                        org = candidate_next
                used_lines.add(idx - 1)
            elif candidate_next:
                title = candidate_next
                used_lines.add(idx + 1)

        # Clean title
        if title:
            title = re.split(r"[—–|]|\s+-\s+", title)[0].strip()

        # Normalized dates
        ref_y = ""
        m_y = re.search(r"\b(\d{4})\b", raw_start)
        if m_y:
            ref_y = m_y.group(1)
        else:
            m_y2 = re.search(r"\b(\d{4})\b", raw_end)
            if m_y2:
                ref_y = m_y2.group(1)

        start_date = norm_single_date(raw_start, is_end=False, ref_year=ref_y, as_of=as_of)
        end_date = norm_single_date(raw_end, is_end=True, ref_year=ref_y, as_of=as_of)

        parsed_meta.append(
            {
                "idx": idx,
                "title": title,
                "org": org,
                "start_date": start_date,
                "end_date": end_date,
                "used_lines": used_lines,
                "slice_after": slice_after,
                "post_bullets": post_bullets,
            }
        )

    # 3. Second Pass: Assemble bullets without bleeding across boundaries
    entries: list[dict[str, Any]] = []

    for i in range(n_dates):
        meta = parsed_meta[i]
        title = meta["title"]
        org = meta["org"]
        idx = meta["idx"]
        slice_after = meta["slice_after"]

        if not title:
            continue

        raw_bullets: list[str] = []

        # If slice_after is the terminal entry on this line and was not used for title, its text can be bullet content
        is_same_line_as_next = (i + 1 < n_dates and date_lines[i + 1][0] == idx)
        if not is_same_line_as_next:
            if slice_after.strip(")-:|•— \t"):
                slice_clean = slice_after.strip(")-:|•— \t")
                if title and title in slice_clean:
                    remainder = slice_clean.replace(title, "", 1).replace(org, "", 1).strip(")-:|•— \t")
                    if remainder and len(remainder) > 5:
                        b_list, _ = _split_inline_boundary(remainder)
                        raw_bullets.extend(b_list if b_list else [remainder])
                elif not (org and org in slice_clean):
                    b_list, _ = _split_inline_boundary(slice_clean)
                    raw_bullets.extend(b_list if b_list else [slice_clean])
            elif meta["post_bullets"]:
                raw_bullets.extend(meta["post_bullets"])

        # Add any trailing bullets passed backward from entry i+1 on the same line
        if extra_prev_bullets[i]:
            raw_bullets.extend(extra_prev_bullets[i])

        # Intermediate multiline bullets between idx and next date's line
        next_idx = date_lines[i + 1][0] if i + 1 < n_dates else len(lines)
        if next_idx > idx:
            next_used = parsed_meta[i + 1]["used_lines"] if i + 1 < n_dates else set()
            end_line = next_idx
            while end_line > idx + 1 and (end_line - 1) in next_used:
                end_line -= 1

            for line_no in range(idx + 1, end_line):
                if line_no in meta["used_lines"]:
                    continue
                if line_no == idx + 1 and not slice_after.strip(")-:|•— \t") and _is_place_line(lines[line_no]):
                    continue
                raw_bullets.append(lines[line_no])

        # Deduplicate & sanitize bullets
        bullets = []
        for bl in raw_bullets:
            bl_clean = bl.lstrip("#*-•~ \t").strip()
            if len(bl_clean) < 60 and SECTION_BOUNDARY_REGEX.match(bl_clean):
                break
            if len(bl_clean) > 5 and not RANGE_REGEX.search(bl) and bl_clean != title and bl_clean != org:
                bullets.append(
                    {
                        "text": bl_clean,
                        "source": find_provenance(full_doc_text, bl_clean),
                        "has_quantified_result": bool(
                            re.search(r"\d+[%kKmM]|meningkatkan|menurunkan|cut|reduced", bl_clean)
                        ),
                    }
                )

        block_text = f"{title} {org} " + " ".join(b["text"] for b in bullets).lower()

        emp_type = "full_time"
        context_type = "experience"
        if re.search(r"\b(?:intern(?:ship)?|magang)\b", block_text, re.IGNORECASE):
            emp_type = "internship"
            context_type = "internship"
        elif re.search(r"\b(?:freelance|lepas)\b", block_text, re.IGNORECASE):
            emp_type = "freelance"
            context_type = "freelance"
        elif re.search(r"\b(?:kontrak|contract)\b", block_text, re.IGNORECASE):
            emp_type = "contract"
        elif re.search(r"\b(?:part-time|paruh waktu)\b", block_text, re.IGNORECASE):
            emp_type = "part_time"

        entries.append(
            {
                "entry_id": f"exp_{len(entries) + 1}",
                "title": title,
                "organization": org,
                "start": meta["start_date"],
                "end": meta["end_date"],
                "context": context_type,
                "employment_type": emp_type,
                "bullets": bullets,
                "source": find_provenance(full_doc_text, title),
            }
        )

    return entries


def parse_skills(section_text: str) -> list[str]:
    items = re.split(r"[,•\n\r]+", section_text)
    cleaned = []
    for it in items:
        s = it.strip().strip("-*").strip()
        if s and len(s) < 50 and not s.lower().startswith("keahlian"):
            cleaned.append(s)
    return cleaned


def parse_certifications(ce_text: str, ed_text: str) -> list[str]:
    combined = ce_text
    if "sertifikasi" in ed_text.lower() or "certification" in ed_text.lower():
        parts = re.split(r"~?\s*(?:sertifikasi|certifications?)\b", ed_text, flags=re.IGNORECASE)
        if len(parts) > 1:
            combined += "\n" + parts[1]

    lines = [l.strip().lstrip("-•*~ ").strip() for l in combined.splitlines() if l.strip()]
    merged = []
    curr = ""
    for l in lines:
        if curr and (
            l.startswith("Developer")
            or l.startswith("Engineer")
            or l.startswith("(")
            or l.startswith("—")
            or l.startswith("-")
        ):
            curr += " " + l
        else:
            if curr:
                merged.append(curr)
            curr = l
    if curr:
        merged.append(curr)

    return [
        l for l in merged if len(l) > 3 and not l.lower().startswith("keahlian") and not l.lower().startswith("skills")
    ]


def parse_education(section_text: str, full_doc_text: str) -> list[dict[str, Any]]:
    levels = []
    t = (section_text + " " + full_doc_text).lower()
    if re.search(r"\bs1\b|sarjana|bachelor|\bs\.e\b|\bs\.stat\b", t):
        levels.append("S1")
    if re.search(r"\bs2\b|magister|master|\bmba\b", t):
        levels.append("S2")
    if re.search(r"\bd3\b|diploma 3|diploma iii", t):
        levels.append("D3")
    if re.search(r"\bd4\b|diploma 4|diploma iv", t):
        levels.append("D4")
    if re.search(r"\bsmk\b", t):
        levels.append("SMK")
    if re.search(r"\bsma\b", t):
        levels.append("SMA")
    if not levels and re.search(r"universitas|institut|politeknik|college|uin|graduate|lulusan", t):
        levels.append("S1")

    entries = []
    ed_lines = [l.strip() for l in section_text.splitlines() if l.strip()]
    for idx, lvl in enumerate(levels):
        deg_raw = " ".join(ed_lines[:4]) if ed_lines else lvl
        inst = ""
        for l in ed_lines:
            if any(
                u in l.lower()
                for u in [
                    "universitas",
                    "university",
                    "institut",
                    "institute",
                    "politeknik",
                    "uin",
                    "itb",
                    "ugm",
                    "unpad",
                    "unri",
                    "unisba",
                    "unpas",
                    "ipb",
                ]
            ):
                inst = l
                break
        entries.append(
            {
                "entry_id": f"edu_{idx + 1}",
                "level": lvl,
                "degree_raw": deg_raw,
                "institution": inst,
                "source": find_provenance(full_doc_text, lvl),
            }
        )
    return entries


def strip_hidden_pdf_spans(content: bytes) -> bytes:
    """Strips micro-font (<4pt) and injection phrases from PDF to prevent evaluation pollution."""
    try:
        import fitz

        doc = fitz.open(stream=content, filetype="pdf")
        has_hidden = False
        inj_pats = [
            re.compile(r"ignore\s+(?:all\s+)?previous\s+instructions", re.IGNORECASE),
            re.compile(r"evaluation\s+override\s+mode", re.IGNORECASE),
            re.compile(r"abaikan\s+semua\s+instruksi", re.IGNORECASE),
            re.compile(r"beri\s+nilai\s+100", re.IGNORECASE),
        ]
        for page in doc:
            for b in page.get_text("dict").get("blocks", []):
                for line in b.get("lines", []):
                    for span in line.get("spans", []):
                        sz = span.get("size", 10)
                        txt = span.get("text", "")
                        is_inj = any(pat.search(txt) for pat in inj_pats)
                        if sz < 4.0 or is_inj:
                            has_hidden = True
                            rect = fitz.Rect(span["bbox"])
                            page.add_redact_annot(rect)
            if has_hidden:
                page.apply_redactions()
        if has_hidden:
            out = doc.write()
            doc.close()
            return out
        doc.close()
        return content
    except Exception:
        return content


def sanitize_extracted_name(name: str | None, full_text: str, filename: str) -> str | None:
    bad_pats = [
        r"hiring\s+manager",
        r"^hal\s*:",
        r"lamaran",
        r"curriculum\s+vitae",
        r"^resume",
        r"job\s+application",
        r"application\s+letter",
        r"kepada\s+yth",
    ]
    raw_clean = (name or "").strip()
    is_bad = not raw_clean or any(re.search(p, raw_clean, re.IGNORECASE) for p in bad_pats)

    if raw_clean and not is_bad:
        parts = re.split(r"\s{2,}|\n", raw_clean)
        if len(parts) >= 2:
            longest = max(parts, key=len).strip()
            if len(longest.split()) >= 2:
                raw_clean = longest
        return re.sub(r"\s+", " ", raw_clean)

    # 1. Cover letter self-intro: e.g. 'I am, Pijar Sulthan Muhammad, excited to apply'
    m_intro = re.search(
        r"(?:I\s+am|saya),?\s+([A-Z][A-Za-z\s]{2,35})(?:,|\s+excited|\s+bermaksud|\.|\s+ingin)",
        full_text,
    )
    if m_intro:
        cand = m_intro.group(1).strip()
        if len(cand.split()) >= 2 and not any(re.search(p, cand, re.IGNORECASE) for p in bad_pats):
            return re.sub(r"\s+", " ", cand)

    # 2. Uppercase header block from first lines of full_text
    for line in full_text.splitlines()[:60]:
        line_clean = line.strip()
        if (
            line_clean.isupper()
            and 2 <= len(line_clean.split()) <= 4
            and not any(re.search(p, line_clean, re.IGNORECASE) for p in bad_pats)
            and not any(
                w in line_clean
                for w in ["EDUCATION", "SKILLS", "EXPERIENCE", "SUMMARY", "CURRICULUM", "VITAE"]
            )
        ):
            return line_clean.title()

    # 3. Fallback from filename: e.g. '2404_Pijar Sulthan Muhammad_CV...'
    fname_stem = Path(filename).stem
    parts = fname_stem.split("_")
    if len(parts) >= 2 and parts[0].isdigit():
        return parts[1].strip()

    return raw_clean or None


def extract_candidate_profile(content: bytes, filename: str) -> dict[str, Any]:
    portfolio_attachments: list[dict[str, Any]] = []
    boundary: Any = None
    if filename.lower().endswith(".pdf"):
        content = strip_hidden_pdf_spans(content)
        # Smart Document Boundary Isolator (Decision 2: Opsi A - isolate attachments)
        try:
            import pymupdf as fitz

            doc = fitz.open(stream=content, filetype="pdf")
            pages_data = []
            for i in range(len(doc)):
                page = doc[i]
                p_text = page_text_in_reading_order(page)
                if len(p_text.strip()) < 30 and len(page.get_images()) > 0:
                    try:
                        tp = page.get_textpage_ocr(language="eng+ind", dpi=300)
                        ocr_txt = clean_ocr_noise(page_text_in_reading_order(page, tp))
                        if len(ocr_txt.strip()) > len(p_text.strip()):
                            p_text = ocr_txt
                    except Exception:
                        pass
                p_text = clean_ocr_noise(p_text) if p_text else p_text
                pages_data.append({"text": p_text, "image_count": len(page.get_images())})
            boundary = isolate_document_boundaries(pages_data)
            portfolio_attachments = boundary.attachments

            # If there are attachment pages, trim content to only CV core pages for profile extraction
            if len(boundary.cv_core_pages) < len(pages_data) and boundary.cv_core_pages:
                trimmed_doc = fitz.open()
                for pno in boundary.cv_core_pages:
                    trimmed_doc.insert_pdf(doc, from_page=pno - 1, to_page=pno - 1)
                content = trimmed_doc.tobytes()
                trimmed_doc.close()
            doc.close()
        except Exception:
            pass

    service = get_extractor_service()
    raw = service.extract(content, filename).to_dict()

    sec_map: dict[str, list[str]] = {}
    for s in raw.get("sections", []):
        sec_map.setdefault(s["label"], []).append(s.get("text", ""))

    exp_text = "\n".join(sec_map.get("experience", []))
    sk_text = "\n".join(sec_map.get("skills", []))
    ce_text = "\n".join(sec_map.get("certifications", []))
    ed_text = "\n".join(sec_map.get("education", []))
    sum_text = "\n".join(sec_map.get("summary", []))
    prj_text = "\n".join(sec_map.get("projects", []))
    org_text = "\n".join(sec_map.get("organizations", []) + sec_map.get("training", []))
    ach_text = "\n".join(sec_map.get("awards", []) + sec_map.get("achievements", []))

    # Docling Hybrid Fallback for messy/disordered layouts (Decision 3: Opsi A)
    if (raw.get("meta", {}).get("confidence", 1.0) < 0.60 or not exp_text.strip()) and filename.lower().endswith(".pdf"):
        docling_res = parse_with_docling(content, filename)
        if docling_res and docling_res.get("sections"):
            for s in docling_res["sections"]:
                h_lower = s.get("heading", "").lower()
                t_content = s.get("text", "").strip()
                if not t_content:
                    continue
                if any(w in h_lower for w in ["experience", "pengalaman", "pekerjaan", "kerja"]):
                    sec_map.setdefault("experience", []).append(t_content)
                elif any(w in h_lower for w in ["education", "pendidikan", "akademik", "studi"]):
                    sec_map.setdefault("education", []).append(t_content)
                elif any(w in h_lower for w in ["skill", "keahlian", "kemampuan", "tools"]):
                    sec_map.setdefault("skills", []).append(t_content)
            exp_text = "\n".join(sec_map.get("experience", []))
            ed_text = "\n".join(sec_map.get("education", []))
            sk_text = "\n".join(sec_map.get("skills", []))

    full_text = "\n".join(s.get("text", "") for s in raw.get("sections", []))

    # Fallback for skills: harvest lines from additional_info, other, and summary if skills are sparse
    sk_lines = [sk_text] if sk_text else []
    for extra_lbl in ("additional_info", "other", "summary"):
        for text in sec_map.get(extra_lbl, []):
            m_sk = re.search(
                r"(?:skills?|keahlian|kemampuan|technical skills?|hard skills?)\s*:\s*(.+)",
                text,
                re.IGNORECASE | re.DOTALL,
            )
            if m_sk:
                sk_lines.append(m_sk.group(1).strip())
            else:
                for line in text.splitlines():
                    if any(
                        w in line.lower()
                        for w in [
                            "skill",
                            "keahlian",
                            "kemampuan",
                            "tools",
                            "software",
                            "excel",
                            "stata",
                            "spss",
                            "python",
                            "sql",
                            "tableau",
                            "power bi",
                            "looker",
                            "accounting",
                        ]
                    ):
                        sk_lines.append(line)
    if sk_lines:
        sk_text = "\n".join(sk_lines)

    # Harvest any experiences in other that contain dates and professional job keywords
    extra_exp_blocks = []
    for text in sec_map.get("other", []):
        if RANGE_REGEX.search(text) and any(
            w in text.lower()
            for w in [
                "developer",
                "engineer",
                "analyst",
                "manager",
                "intern",
                "magang",
                "specialist",
                "officer",
                "consultant",
                "staff",
                "supervisor",
                "freelance",
                "trainer",
                "volunteer",
            ]
        ):
            extra_exp_blocks.append(text)

    if extra_exp_blocks:
        exp_text = exp_text + "\n" + "\n".join(extra_exp_blocks) if exp_text.strip() else "\n".join(extra_exp_blocks)

    # Fallback for experience: if exp_text is still empty, inspect other and summary
    if not exp_text.strip():
        exp_fallbacks = []
        for extra_lbl in ("other", "summary"):
            for text in sec_map.get(extra_lbl, []):
                if any(
                    w in text.lower() for w in ["magang", "intern", "experience", "kerja", "analyst"]
                ) or RANGE_REGEX.search(text):
                    exp_fallbacks.append(text)
        if exp_fallbacks:
            exp_text = "\n".join(exp_fallbacks)

    # Fallback for education: if ed_text is empty, inspect other and summary
    if not ed_text.strip():
        ed_fallbacks = []
        for extra_lbl in ("other", "summary"):
            for text in sec_map.get(extra_lbl, []):
                if any(
                    w in text.lower()
                    for w in [
                        "universitas",
                        "university",
                        "institut",
                        "bachelor",
                        "master",
                        "sarjana",
                        "s1",
                        "s2",
                        "d3",
                    ]
                ):
                    ed_fallbacks.append(text)
        if ed_fallbacks:
            ed_text = "\n".join(ed_fallbacks)

    # Parse sections
    experiences = parse_experiences(exp_text, full_text)
    quality_warnings = list(raw.get("meta", {}).get("warnings", []))
    # The text as the extractor read it, line by line (sections are re-joined and lose the line structure)
    read_order_text = boundary.cv_core_text if boundary and getattr(boundary, "cv_core_text", None) else full_text
    if not experiences and (
        exp_text.strip() or has_job_like_date_ranges(full_text) or is_fragmented_text(read_order_text)
    ):
        # Nothing was parsed although the CV has an experience section, dates that look like jobs, or text that is
        # scrambled (two-column read order, one word per line): surface it instead of silently scoring 0 months
        quality_warnings.append("EXPERIENCE_NOT_PARSED")
    education = parse_education(ed_text, full_text)
    certifications = parse_certifications(ce_text, ed_text)
    skills = parse_skills(sk_text)

    # Demographics & Identity
    contact = raw.get("contact", {})
    emails = contact.get("emails", [])
    phones = contact.get("phones", [])
    links = contact.get("urls", [])
    if contact.get("linkedin"):
        links.append(contact["linkedin"])

    # Fallback to cover letter for contact details if not found in CV core
    if boundary and getattr(boundary, "cover_letter_text", None):
        cl_text = boundary.cover_letter_text
        if not emails:
            m_cl_emails = EMAIL_PATTERN.findall(cl_text)
            if m_cl_emails:
                emails.extend([e.strip() for e in m_cl_emails if e.strip()])
        if not phones:
            m_cl_phones = PHONE_PATTERN.findall(cl_text)
            if m_cl_phones:
                phones.extend([p.strip() for p in m_cl_phones if p.strip()])

    # Look for demographic lines in full text
    other_personal = {}
    m_gender = re.search(r"jenis\s+kelamin\s*:\s*([^\n]+)", full_text, re.IGNORECASE)
    if m_gender:
        other_personal["gender"] = m_gender.group(1).strip()
    m_rel = re.search(r"agama\s*:\s*([^\n]+)", full_text, re.IGNORECASE)
    if m_rel:
        other_personal["religion"] = m_rel.group(1).strip()
    m_dob = re.search(r"tanggal\s+lahir\s*:\s*([^\n]+)", full_text, re.IGNORECASE)
    if m_dob:
        other_personal["date_of_birth"] = m_dob.group(1).strip()
    m_mar = re.search(r"status(?:\s+pernikahan)?\s*:\s*([^\n]+)", full_text, re.IGNORECASE)
    if m_mar:
        other_personal["marital_status"] = m_mar.group(1).strip()

    cand_name = resolve_candidate_name_consensus(
        raw.get("name"), full_text, filename, email=emails[0] if emails else None
    )
    if not cand_name and boundary and getattr(boundary, "cover_letter_text", None):
        cand_name = sanitize_extracted_name(None, boundary.cover_letter_text, filename)

    identity = {
        "full_name": cand_name,
        "email": emails[0] if emails else None,
        "phone": phones[0] if phones else None,
        "location_raw": contact.get("location"),
        "links": links,
        "other_personal": other_personal,
    }

    projects = []
    if prj_text:
        projects.append(
            {
                "entry_id": "prj_1",
                "title": prj_text.splitlines()[0] if prj_text else "Proyek",
                "text": prj_text,
                "source": find_provenance(full_text, prj_text[:40]),
            }
        )

    organizations = []
    if org_text:
        organizations.append(
            {
                "entry_id": "org_1",
                "title": org_text.splitlines()[0] if org_text else "Organisasi",
                "text": org_text,
                "source": find_provenance(full_text, org_text[:40]),
            }
        )

    achievements = []
    if ach_text:
        for idx, block in enumerate([b.strip() for b in ach_text.split("\n\n") if b.strip()]):
            achievements.append(
                {
                    "entry_id": f"ach_{idx+1}",
                    "title": block.splitlines()[0] if block else "Achievement",
                    "text": block,
                    "source": find_provenance(full_text, block[:40]),
                }
            )

    profile = {
        "document_id": filename,
        "extractor": {
            "name": "cv-extractor",
            "version": "1.0.0",
            "ocr_used": raw.get("meta", {}).get("llm_used", False)
            or any(p.get("source") == "ocr" for p in raw.get("meta", {}).get("pages", [])),
        },
        "language": ["id"],
        "identity": identity,
        "headline": raw.get("headline"),
        "summary": sum_text or raw.get("summary"),
        "skills": skills,
        "experiences": experiences,
        "education": education,
        "certifications": certifications,
        "projects": projects,
        "organizations": organizations,
        "achievements": achievements,
        "portfolio_attachments": portfolio_attachments,
        "cv_core_text": boundary.cv_core_text if boundary and getattr(boundary, "cv_core_text", None) else full_text,
        "quality": {
            "confidence": raw.get("meta", {}).get("confidence", 1.0),
            "warnings": quality_warnings,
        },
    }
    return profile
