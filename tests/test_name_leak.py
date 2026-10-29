"""The candidate's real name must not survive redaction or reach the verifier, whatever the layout.

Failure modes covered: a "FOTO" box read as the name (two-column PDFs), names that only appear in an OCR-broken
email or a profile URL (scans), and a name guessed from the file name.
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path

import pytest

from src.domain.evidence_chunks import build_candidate_chunks, without_contact_header
from src.domain.pii import EMAIL_REGEX
from src.worker.anchor import find_name_line_by_email, is_blacklisted_as_name, resolve_candidate_name_consensus
from src.worker.redaction import email_name_tokens, redact_text

TWO_COLUMN_TEXT = (
    "FOTO\nContact\n+62 812-0000-1104\nkevin.halim@example.com\nJakarta\nlinkedin.com/in/kevin-halim-fiktif\n"
    "Education\nS1 Teknik Elektro\nLanguages\nIndonesian, English\nKEVIN HALIM\nLead Backend Engineer\nSummary\n"
    "Engineer who led a backend team."
)


# ------------------------------------------------------------------ detection
def test_photo_placeholders_are_not_names():
    for word in ("FOTO", "Photo", "Pas Foto"):
        assert is_blacklisted_as_name(word)


def test_the_email_anchors_the_name_line_wherever_the_layout_puts_it():
    assert find_name_line_by_email(TWO_COLUMN_TEXT, "kevin.halim@example.com") == "Kevin Halim"


def test_a_name_line_needs_two_email_tokens():
    assert find_name_line_by_email(TWO_COLUMN_TEXT, "kevin@example.com") is None
    assert find_name_line_by_email(TWO_COLUMN_TEXT, None) is None


def test_the_consensus_replaces_a_photo_box_read_as_the_name():
    resolved = resolve_candidate_name_consensus(
        extracted_name="FOTO",
        full_text=TWO_COLUMN_TEXT,
        filename="S4_lead_backend_two_column.pdf",
        email="kevin.halim@example.com",
    )
    assert resolved == "Kevin Halim"


def test_a_name_that_agrees_with_the_email_is_kept():
    resolved = resolve_candidate_name_consensus(
        extracted_name="Kevin Halim Santoso",
        full_text="Kevin Halim Santoso\nBackend developer",
        filename="cv.pdf",
        email="kevin.halim@example.com",
    )
    assert resolved == "Kevin Halim Santoso"


# ------------------------------------------------------------------- redaction
def test_email_regex_tolerates_the_gap_ocr_leaves_after_the_at_sign():
    text = "Malang - 0812 - putri.maharani@ example.com: linkedin.com/in/putri"
    assert EMAIL_REGEX.search(text).group(0) == "putri.maharani@ example.com"


def test_email_regex_does_not_join_an_at_sign_to_the_next_line():
    assert EMAIL_REGEX.search("kontak: nama@\nexample.com") is None


def test_name_tokens_from_the_email_are_redacted_even_when_the_detected_name_is_wrong():
    out = redact_text(TWO_COLUMN_TEXT, name="FOTO", emails=["kevin.halim@example.com"])

    assert "kevin" not in out.lower()
    assert "halim" not in out.lower()
    assert "Lead Backend Engineer" in out


def test_generic_words_in_an_email_are_not_treated_as_names():
    assert email_name_tokens(["info@company.com", "hrd.recruitment@company.com", "backend.developer@x.com"]) == []
    assert email_name_tokens(["kevin.halim99@example.com"]) == ["kevin", "halim"]


# ---------------------------------------------------------------- evidence pool
def test_the_contact_header_is_dropped_from_a_raw_block():
    block = "[NAMA] [NAMA] Backend Developer Semarang · [TELEPON] · [EMAIL] · [TAUTAN] Ringkasan Backend developer di bidang kesehatan."

    assert without_contact_header(block) == "Ringkasan Backend developer di bidang kesehatan."
    assert without_contact_header("Membangun REST API untuk modul penagihan.") == "Membangun REST API untuk modul penagihan."


def test_a_block_that_is_only_a_header_never_becomes_evidence():
    chunks = build_candidate_chunks({}, "Arief Nugraha Head of Platform Jakarta [TELEPON] [EMAIL]")

    assert chunks == []


# ------------------------------------------------------------ whole pipeline
GOLDEN = Path("docs/spec/golden_dataset")
LEAKED_BEFORE = [
    ("S4_lead_backend_two_column.pdf", "Kevin Halim"),
    ("M1_nodejs_backend_two_column.pdf", "Andre Wijaya"),
    ("M5_php_fullstack_two_column_id.pdf", "Dewi Kartika Sari"),
    ("I3_graphic_designer_two_column_en.pdf", "Maya Lestari"),
    ("M3_fresh_graduate_scan_id.pdf", "Putri Ayu Maharani"),
    ("I5_nurse_scan_id.pdf", "Lina Marlina"),
]


@pytest.mark.skipif(
    not (GOLDEN / "cvs/core").exists() or shutil.which("tesseract") is None,
    reason="golden CVs or tesseract (for the scans) not available locally",
)
@pytest.mark.parametrize(("filename", "real_name"), LEAKED_BEFORE)
def test_no_part_of_the_real_name_reaches_the_redacted_text_or_the_evidence_pool(filename, real_name):
    from src.domain.agent import normalize_profile_dict
    from src.worker.adapter import extract_candidate_profile
    from src.worker.redaction import extract_identity_and_redact
    from src.worker.sanitizer import sanitize_file

    content = (GOLDEN / "cvs/core" / filename).read_bytes()
    profile = extract_candidate_profile(content, filename)
    identity, matching, _ = extract_identity_and_redact(profile)
    text = redact_text(
        sanitize_file(content, filename).extracted_text,
        identity["full_name"],
        [identity["email"]] if identity.get("email") else [],
        [identity["phone"]] if identity.get("phone") else [],
        links=identity.get("links") or [],
    )
    pool = build_candidate_chunks(normalize_profile_dict(matching), text)

    for token in (t for t in re.findall(r"\w+", real_name) if len(t) > 2):
        assert token.lower() not in text.lower(), f"{token} left in the redacted text of {filename}"
        assert not any(token.lower() in c["text"].lower() for c in pool), f"{token} in the evidence pool of {filename}"
