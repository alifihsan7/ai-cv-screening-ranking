"""File sanitization, MIME verification, malware protection, and edge case detection."""

from __future__ import annotations

import hashlib
import io
import re
import zipfile
from dataclasses import dataclass, field
from typing import Any

import pymupdf

from src.worker.adapter import clean_ocr_noise
from src.worker.pdf_inspector import (
    ZERO_WIDTH_PATTERN,
    inspect_pdf_adversarial,
    normalize_canonical_text,
)

INJECTION_PATTERNS = [
    re.compile(r"ignore\s+all\s+(?:previous|prior)\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(?:all\s+)?(?:criteria|instructions)", re.IGNORECASE),
    re.compile(r"give\s+(?:this\s+candidate\s+)?(?:a\s+)?(?:score\s+of\s+)?100", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(?:an?\s+)?(?:unconditional|helpful|evaluator)", re.IGNORECASE),
    re.compile(r"system\s+prompt:", re.IGNORECASE),
    re.compile(r"dan\s+mode", re.IGNORECASE),
    re.compile(r"unconditional\s+acceptance", re.IGNORECASE),
]

COVER_LETTER_PATTERNS = [
    re.compile(r"surat\s+lamaran", re.IGNORECASE),
    re.compile(r"kepada\s+yth", re.IGNORECASE),
    re.compile(r"dengan\s+hormat", re.IGNORECASE),
    re.compile(r"cover\s+letter", re.IGNORECASE),
    re.compile(r"dear\s+hiring\s+manager", re.IGNORECASE),
    re.compile(r"bersama\s+surat\s+ini", re.IGNORECASE),
]


@dataclass
class SanitizeResult:
    is_valid: bool
    status: str  # RECEIVED, NEEDS_REVIEW, REJECTED
    sha256: str
    file_type: str
    reasons: list[str] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)
    extracted_text: str = ""
    canonical_text: str = ""
    is_encrypted: bool = False
    has_hidden_text: bool = False
    has_injection: bool = False
    page_count: int = 1
    hidden_text_findings: list[dict[str, Any]] = field(default_factory=list)


def sanitize_file(content: bytes, filename: str) -> SanitizeResult:
    sha256 = hashlib.sha256(content).hexdigest()

    # 1. Check Empty file
    if len(content) == 0:
        return SanitizeResult(
            is_valid=False,
            status="REJECTED",
            sha256=sha256,
            file_type="unknown",
            reasons=["EMPTY_DOCUMENT", "INSUFFICIENT_CONTENT"],
        )

    # 2. Identify MIME / format by magic bytes
    file_type = "unknown"
    if content.startswith(b"%PDF-"):
        file_type = "pdf"
    elif content.startswith(b"PK\x03\x04"):
        file_type = "docx"
    elif content.startswith(b"\xd0\xcf\x11\xe0"):
        file_type = "doc"

    if file_type == "unknown":
        return SanitizeResult(
            is_valid=False,
            status="REJECTED",
            sha256=sha256,
            file_type=file_type,
            reasons=["INVALID_FORMAT"],
        )

    # 3. PDF Inspection
    if file_type == "pdf":
        try:
            doc = pymupdf.open(stream=content, filetype="pdf")
        except Exception:
            return SanitizeResult(
                is_valid=False,
                status="REJECTED",
                sha256=sha256,
                file_type="pdf",
                reasons=["CORRUPTED_FILE"],
            )

        if doc.is_encrypted:
            doc.close()
            return SanitizeResult(
                is_valid=False,
                status="REJECTED",
                sha256=sha256,
                file_type="pdf",
                is_encrypted=True,
                reasons=["ENCRYPTED_FILE"],
            )

        # Deep anti-adversarial PDF inspection
        inspection = inspect_pdf_adversarial(content)
        hidden_text_findings = [f.to_dict() for f in inspection.findings]
        has_hidden_text = inspection.has_hidden_text

        full_text_parts = []
        has_injection = False
        total_images = 0
        flags = []

        pages_data: list[dict[str, Any]] = []
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_text = page.get_text()
            text_str = page_text if isinstance(page_text, str) else str(page_text)
            img_cnt = len(page.get_images())
            total_images += img_cnt

            if len(text_str.strip()) < 30 and img_cnt > 0:
                try:
                    tp = page.get_textpage_ocr(language="eng+ind", dpi=150)
                    ocr_txt = clean_ocr_noise(page.get_text(textpage=tp))
                    if len(ocr_txt.strip()) > len(text_str.strip()):
                        text_str = ocr_txt
                except Exception:
                    pass

            full_text_parts.append(text_str)
            pages_data.append({
                "page_num": page_idx + 1,
                "text": text_str,
                "image_count": img_cnt,
            })

            # Inspect text spans for tiny fonts or white text
            try:
                blocks = page.get_text("dict").get("blocks", [])
                for b in blocks:
                    for line in b.get("lines", []):
                        for span in line.get("spans", []):
                            txt = span.get("text", "").strip()
                            if not txt:
                                continue
                            if span.get("size", 10) < 4.0:
                                has_hidden_text = True
                            color = span.get("color", 0)
                            if color in (16777215, 0xFFFFFF):
                                has_hidden_text = True
                            for pat in INJECTION_PATTERNS:
                                if pat.search(txt):
                                    has_injection = True
            except Exception:
                pass

        page_count = len(doc)
        doc.close()
        full_text = "\n".join(full_text_parts).strip()
        norm_full = normalize_canonical_text(full_text)
        canonical_text = norm_full if len(norm_full) > len(inspection.canonical_text) else (inspection.canonical_text or norm_full)

        # Check injection across full text
        for pat in INJECTION_PATTERNS:
            if pat.search(full_text):
                has_injection = True

        if has_hidden_text:
            flags.append("HIDDEN_TEXT")
        if has_injection:
            flags.append("PROMPT_INJECTION")

        # Check keyword stuffing
        tokens = [t.lower() for t in re.findall(r"\b[a-zA-Z]{3,}\b", full_text)]
        tech_words = ["python", "postgresql", "fastapi", "django", "docker", "kubernetes"]
        for tw in tech_words:
            if tokens.count(tw) >= 3 and len(tokens) < 300:
                flags.append("KEYWORD_STUFFING")
                break

        # Check Insufficient / Empty content or Non-CV document using CVClassifierGate
        from src.worker.boundary import CV_CORE_INDICATORS, isolate_document_boundaries
        from src.worker.classifier import (
            CV_SECTIONS_PATTERNS,
            EMAIL_PATTERN,
            PHONE_PATTERN,
            classify_document_is_cv,
        )

        class_res = classify_document_is_cv(
            full_text,
            page_count=page_count,
            total_images=total_images,
            pages=pages_data,
        )

        boundary_res = None
        if len(pages_data) > 1:
            try:
                boundary_res = isolate_document_boundaries(pages_data)
            except Exception:
                boundary_res = None

        # Guard Hybrid: If classifier marked non-CV, but boundary segmenter isolated CV_CORE pages
        # or there is a page with CV structure / work experience / education after OCR
        if not class_res.is_cv:
            has_core_cv = False
            if boundary_res and boundary_res.cv_core_pages:
                for p in boundary_res.cv_core_pages:
                    if p <= len(pages_data):
                        p_txt = pages_data[p - 1].get("text", "")
                        if (
                            any(ind.search(p_txt) for ind in CV_CORE_INDICATORS)
                            or bool(CV_SECTIONS_PATTERNS[0].search(p_txt))
                            or bool(CV_SECTIONS_PATTERNS[1].search(p_txt))
                            or (len(p_txt.split()) >= 30 and class_res.doc_type == "PURE_PORTFOLIO")
                        ):
                            has_core_cv = True
                            break

            if not has_core_cv:
                for p in pages_data:
                    p_txt = p.get("text", "")
                    p_has_exp = bool(CV_SECTIONS_PATTERNS[0].search(p_txt)) or bool(CV_CORE_INDICATORS[0].search(p_txt))
                    p_has_edu = bool(CV_SECTIONS_PATTERNS[1].search(p_txt)) or bool(CV_CORE_INDICATORS[1].search(p_txt))
                    p_has_contact = bool(EMAIL_PATTERN.search(p_txt) or PHONE_PATTERN.search(p_txt))
                    p_has_core = any(ind.search(p_txt) for ind in CV_CORE_INDICATORS)
                    if p_has_exp or (p_has_edu and p_has_contact) or (p_has_core and (p_has_contact or p_has_exp)):
                        has_core_cv = True
                        break

            if has_core_cv:
                class_res.is_cv = True
                class_res.doc_type = "CV"
                class_res.flags = [f for f in class_res.flags if f != "NOT_A_CV"]
                if "HYBRID_PORTFOLIO_CV" not in class_res.flags:
                    class_res.flags.append("HYBRID_PORTFOLIO_CV")
                if "HYBRID_PORTFOLIO_CV" not in flags:
                    flags.append("HYBRID_PORTFOLIO_CV")

        if not class_res.is_cv:
            if class_res.doc_type == "INSUFFICIENT_CONTENT":
                reasons = ["INSUFFICIENT_CONTENT", "EMPTY_DOCUMENT"]
            else:
                reasons = ["NOT_A_CV", f"NOT_A_CV_{class_res.doc_type}"] + class_res.reasons
            return SanitizeResult(
                is_valid=True,
                status="NEEDS_REVIEW",
                sha256=sha256,
                file_type="pdf",
                reasons=reasons,
                flags=flags + class_res.flags,
                extracted_text=full_text,
                canonical_text=canonical_text,
                has_hidden_text=has_hidden_text,
                has_injection=has_injection,
                hidden_text_findings=hidden_text_findings,
                page_count=page_count,
            )

        san_flags = flags + class_res.flags
        if boundary_res and boundary_res.attachment_pages and "BOUNDARY_ISOLATED" not in san_flags:
            san_flags.append("BOUNDARY_ISOLATED")

        return SanitizeResult(
            is_valid=True,
            status="RECEIVED",
            sha256=sha256,
            file_type="pdf",
            flags=san_flags,
            extracted_text=full_text,
            canonical_text=canonical_text,
            has_hidden_text=has_hidden_text,
            has_injection=has_injection,
            hidden_text_findings=hidden_text_findings,
            page_count=page_count,
        )

    # 4. DOCX Inspection
    if file_type == "docx":
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as z:
                total_uncompressed = sum(info.file_size for info in z.infolist())
                if total_uncompressed > 50 * 1024 * 1024:
                    return SanitizeResult(
                        is_valid=False,
                        status="REJECTED",
                        sha256=sha256,
                        file_type="docx",
                        reasons=["ZIP_BOMB_DETECTED"],
                    )
                xml_content = z.read("word/document.xml").decode("utf-8", errors="ignore")
                text = re.sub(r"<[^>]+>", " ", xml_content)
                text = re.sub(r"\s+", " ", text).strip()
                canonical_text = normalize_canonical_text(text)
                docx_flags: list[str] = []
                docx_findings: list[dict[str, Any]] = []
                has_hidden = False
                if ZERO_WIDTH_PATTERN.search(text):
                    has_hidden = True
                    docx_flags.append("HIDDEN_TEXT")
                    docx_findings.append({
                        "page_number": 1,
                        "finding_type": "ZERO_WIDTH_UNICODE",
                        "detail": "Zero-width unicode detected in DOCX body",
                        "sample_text": "[ZERO_WIDTH_CHARS]",
                    })
                if len(text) < 80:
                    return SanitizeResult(
                        is_valid=True,
                        status="NEEDS_REVIEW",
                        sha256=sha256,
                        file_type="docx",
                        reasons=["INSUFFICIENT_CONTENT", "EMPTY_DOCUMENT"],
                        extracted_text=text,
                        canonical_text=canonical_text,
                        flags=docx_flags,
                        has_hidden_text=has_hidden,
                        hidden_text_findings=docx_findings,
                    )
                return SanitizeResult(
                    is_valid=True,
                    status="RECEIVED",
                    sha256=sha256,
                    file_type="docx",
                    extracted_text=text,
                    canonical_text=canonical_text,
                    flags=docx_flags,
                    has_hidden_text=has_hidden,
                    hidden_text_findings=docx_findings,
                )
        except Exception:
            return SanitizeResult(
                is_valid=False,
                status="REJECTED",
                sha256=sha256,
                file_type="docx",
                reasons=["CORRUPTED_FILE"],
            )

    return SanitizeResult(is_valid=True, status="RECEIVED", sha256=sha256, file_type=file_type)
