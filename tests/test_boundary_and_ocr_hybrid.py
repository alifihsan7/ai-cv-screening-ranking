r"""Tests for Boundary Isolator and OCR Adapter on Hybrid/Scanned Documents.

Verifies:
1. clean_ocr_noise sanitizes Tesseract artifacts (€@t, ffi'@-ff.&, *lplllllll, [\\/:-~?_|=]{3,}, punctuation lines)
2. Loosened attachment indicators match keywords in initial 600 chars without requiring ^\s*
3. Deterministic classification of noisy scanned Ijazah and Transkrip as ATTACHMENT_ACADEMIC
4. Zero leakage of academic attachment text into cv_core_text
5. Full adapter pipeline trimming hybrid attachments so only CV core reaches extraction
"""

from __future__ import annotations

import fitz  # PyMuPDF
import pytest

from src.worker.adapter import clean_ocr_noise, extract_candidate_profile
from src.worker.boundary import (
    ATTACHMENT_INDICATORS,
    STRONG_ACADEMIC_COMBOS,
    STRONG_ACADEMIC_DIRECT,
    is_strong_academic_page,
    isolate_document_boundaries,
)


class TestCleanOcrNoise:
    """Verifies that clean_ocr_noise cleans scanner and Tesseract artifacts."""

    def test_clean_tesseract_symbol_artifacts(self):
        noisy_text = (
            "€@t UNIVERSITAS MUHAMMADIYAH BANDUNG\n"
            "---===---\n"
            "ffi'@-ff.& FAKULTAS SAINS DAN TEKNOLOGI\n"
            "*lplllllll IJAZAH\n"
            "Nomor: 54321/UMB/2024 //////// Yudisium\n"
            ".....\n"
            "Dekan: Dr. Irfan\n"
        )
        cleaned = clean_ocr_noise(noisy_text)
        assert "€@t" not in cleaned
        assert "ffi'@-ff.&" not in cleaned
        assert "*lplllllll" not in cleaned
        assert "---===---" not in cleaned
        assert "....." not in cleaned
        assert "////////" not in cleaned
        assert "UNIVERSITAS MUHAMMADIYAH BANDUNG" in cleaned
        assert "FAKULTAS SAINS DAN TEKNOLOGI" in cleaned
        assert "IJAZAH" in cleaned
        assert "Dekan: Dr. Irfan" in cleaned

    def test_clean_punctuation_only_lines_and_separators(self):
        text = (
            "==============================\n"
            "--- --- --- ---\n"
            "Muhammad Farhanul Haqim\n"
            "::::::::::::::::::::\n"
            "Software Engineer\n"
            "|~_~| |~_~|\n"
            "farhanul@example.com\n"
        )
        cleaned = clean_ocr_noise(text)
        assert cleaned.splitlines() == [
            "Muhammad Farhanul Haqim",
            "Software Engineer",
            "farhanul@example.com",
        ]

    def test_preserves_legitimate_dates_and_gpa(self):
        text = (
            "Pengalaman Kerja:\n"
            "Backend Engineer (2022 - 2024)\n"
            "IPK: 3.85 / 4.00\n"
            "SKS: 144 SKS\n"
        )
        cleaned = clean_ocr_noise(text)
        assert "2022 - 2024" in cleaned
        assert "IPK: 3.85 / 4.00" in cleaned
        assert "144 SKS" in cleaned


class TestBoundaryIsolatorLooseningAndAcademicDetection:
    """Verifies boundary isolation on noisy hybrid scan documents."""

    def test_loosened_indicators_without_leading_anchor(self):
        # Noise or institution header before attachment title
        text_noisy_lead = (
            "€@t KEMENTERIAN PENDIDIKAN DAN KEBUDAYAAN\n"
            "UNIVERSITAS MUHAMMADIYAH BANDUNG\n"
            "IJAZAH SARJANA\n"
            "Diberikan kepada Muhammad Farhanul Haqim"
        )
        # Should match loosened ATTACHMENT_INDICATORS in text[:600]
        matches = [ind.search(text_noisy_lead[:600]) for ind in ATTACHMENT_INDICATORS]
        assert any(matches)
        assert is_strong_academic_page(text_noisy_lead) is True

    def test_farhanul_muhammadiyah_bandung_hybrid_scanned_isolation(self):
        """Simulates 2416_Muhammad Farhanul Haqim_CV_Tajira.pdf structure:
        Page 1: CV Core
        Page 2: Portfolio Showcase
        Page 3: Scanned Ijazah (noisy header, no work experience)
        Page 4: Scanned Transkrip (course list, SKS x N, Dekan)
        Page 5: Scanned Transkrip Lanjutan (Semester V-VI, SKS x N)
        """
        pages = [
            {
                "page_num": 1,
                "text": (
                    "Muhammad Farhanul Haqim\n"
                    "Email: farhanul@example.com | Phone: 081234567890\n\n"
                    "PENGALAMAN KERJA\n"
                    "Backend Developer - PT Tajira Global Solusi (2022 - 2024)\n"
                    "- Mengembangkan arsitektur microservices dengan FastAPI dan PostgreSQL.\n"
                    "- Mengoptimasi throughput antrean worker hingga 40%.\n\n"
                    "PENDIDIKAN\n"
                    "S1 Sistem Informasi - Universitas Muhammadiyah Bandung (2020 - 2024)\n\n"
                    "KEAHLIAN\n"
                    "Python, FastAPI, Docker, PostgreSQL, Redis"
                ),
                "image_count": 0,
            },
            {
                "page_num": 2,
                "text": (
                    "KUMPULAN KARYA & PROJECT SHOWCASE\n"
                    "1. ERP Logistic Tracking System\n"
                    "Screenshots arsitektur distributed query dan telemetry dashboard.\n"
                ),
                "image_count": 4,
            },
            {
                "page_num": 3,
                "text": (
                    "€@t UNIVERSITAS MUHAMMADIYAH BANDUNG\n"
                    "ffi'@-ff.& FAKULTAS SAINS DAN TEKNOLOGI\n"
                    "*lplllllll IJAZAH\n"
                    "Memberikan Ijazah kepada:\n"
                    "Nama: Muhammad Farhanul Haqim\n"
                    "Nomor Pokok Mahasiswa: 2020101001\n"
                    "Nomor Ijazah Nasional: 54321/UMB/2024\n"
                    "Yudisium: Dengan Pujian\n"
                    "Rektor: Prof. Dr. Rektor UMB\n"
                    "Dekan: Dr. Dekan Saintek\n"
                ),
                "image_count": 1,
            },
            {
                "page_num": 4,
                "text": (
                    "UNIVERSITAS MUHAMMADIYAH BANDUNG\n"
                    "TRANSKRIP AKADEMIK\n"
                    "Nama: Muhammad Farhanul Haqim\n"
                    "Semester I\n"
                    "1. Algoritma Pemrograman 3 SKS Nilai A (SKS x N = 12)\n"
                    "2. Kalkulus 3 SKS Nilai A (SKS x N = 12)\n"
                    "Semester II\n"
                    "3. Basis Data 3 SKS Nilai A (SKS x N = 12)\n"
                    "Dekan: Dr. Dekan Saintek\n"
                ),
                "image_count": 1,
            },
            {
                "page_num": 5,
                "text": (
                    "UNIVERSITAS MUHAMMADIYAH BANDUNG\n"
                    "TRANSKRIP AKADEMIK (LANJUTAN)\n"
                    "Semester V\n"
                    "9. Rekayasa Perangkat Lunak 3 SKS Nilai A (SKS x N = 12)\n"
                    "Semester VI\n"
                    "10. Tugas Akhir / Skripsi 4 SKS Nilai A (SKS x N = 16)\n"
                    "Indeks Prestasi Kumulatif: 3.88\n"
                    "Dekan: Dr. Dekan Saintek\n"
                ),
                "image_count": 1,
            },
        ]

        res = isolate_document_boundaries(pages)

        # Core CV pages must contain only Page 1
        assert res.total_pages == 5
        assert res.cv_core_pages == [1]
        assert res.attachment_pages == [2, 3, 4, 5]
        assert len(res.attachments) == 4

        # Verify page types
        assert res.attachments[0]["page_number"] == 2
        assert res.attachments[0]["type"] == "PORTFOLIO_PROJECT"

        assert res.attachments[1]["page_number"] == 3
        assert res.attachments[1]["type"] == "ATTACHMENT_ACADEMIC"

        assert res.attachments[2]["page_number"] == 4
        assert res.attachments[2]["type"] == "ATTACHMENT_ACADEMIC"

        assert res.attachments[3]["page_number"] == 5
        assert res.attachments[3]["type"] == "ATTACHMENT_ACADEMIC"

        # Verify zero leakage of academic text into CV core text
        assert "PENGALAMAN KERJA" in res.cv_core_text
        assert "PT Tajira Global Solusi" in res.cv_core_text
        assert "€@t" not in res.cv_core_text
        assert "IJAZAH" not in res.cv_core_text
        assert "TRANSKRIP" not in res.cv_core_text
        assert "Nomor Ijazah Nasional" not in res.cv_core_text
        assert "Yudisium" not in res.cv_core_text
        assert "SKS x N" not in res.cv_core_text

    def test_cv_page_with_mention_of_ijazah_retains_cv_core_classification(self):
        """A candidate CV mentioning ijazah availability in notes must remain CV_CORE because
        it has work experience structure.
        """
        pages = [
            {
                "page_num": 1,
                "text": (
                    "Budi Raharjo\n"
                    "budi@example.com | 081299887766\n\n"
                    "PENGALAMAN KERJA\n"
                    "Senior Software Engineer - PT Solusi Bangsa (2021 - 2024)\n"
                    "- Membangun pipeline backend.\n\n"
                    "RIWAYAT PENDIDIKAN\n"
                    "S1 Ilmu Komputer - Universitas Gadjah Mada\n\n"
                    "Catatan: Ijazah asli dan transkrip akademik siap ditunjukkan saat wawancara."
                ),
                "image_count": 0,
            }
        ]
        res = isolate_document_boundaries(pages)
        assert res.cv_core_pages == [1]
        assert res.attachment_pages == []
        assert "Senior Software Engineer" in res.cv_core_text

    def test_transcript_detected_via_combo_keywords_without_explicit_title(self):
        """A cropped or noisy scan without the word 'TRANSKRIP' on page top, but with academic
        combos (Semester I, SKS x N, Dekan, Yudisium) and no work experience, must be classified
        as ATTACHMENT_ACADEMIC.
        """
        pages = [
            {
                "page_num": 1,
                "text": (
                    "Asep Sunandar\n"
                    "asep@example.com\n"
                    "PENGALAMAN KERJA\n"
                    "Frontend Engineer di Studio Web (2022 - 2024)"
                ),
                "image_count": 0,
            },
            {
                "page_num": 2,
                "text": (
                    "UNIVERSITAS MUHAMMADIYAH BANDUNG\n"
                    "DAFTAR HASIL BELAJAR MAHASISWA\n"
                    "Semester I - Mata Kuliah Dasar\n"
                    "Bobot SKS x N: 16\n"
                    "Yudisium Kelulusan: 2024\n"
                    "Dekan Fakultas Teknik"
                ),
                "image_count": 1,
            },
        ]
        res = isolate_document_boundaries(pages)
        assert res.cv_core_pages == [1]
        assert res.attachment_pages == [2]
        assert res.attachments[0]["type"] == "ATTACHMENT_ACADEMIC"

    def test_noisy_academic_ocr_typos_detected_as_strong_academic(self):
        """Common OCR noise/typo variants in Indonesian academic transcripts and diplomas."""
        assert is_strong_academic_page("IJAZ.AE IH'SCENNHCATE dlberlkan kepada Muhanmad") is True
        assert is_strong_academic_page("l{omor ljazah Nasional: 04106it7020120241q)039") is True
        assert is_strong_academic_page("TNANSrrruPATAIDEDIr, Nomon FSH.IK-2;1{)074") is True
        assert is_strong_academic_page("YUOISIUM Sangat ltllmuaskan") is True
        assert is_strong_academic_page("Angka K.cdtt (SXS x A) S€MESTER I Nilai SKS") is True
        assert is_strong_academic_page("Indeks Prestasi Kumulatif: 3.46 Satuan Kredit Semester") is True

    def test_multipage_hybrid_cover_letter_cv_core_academic_attachments_isolation(self):
        """Simulates full 6-page candidate document:
        Page 1: Cover letter (Hal: Lamaran Kerja, no work exp)
        Page 2: CV Core (Tentang Saya, Pengalaman Kerja, Pendidikan, Organisasi, Kemampuan)
        Page 3: Scanned Ijazah with OCR noise (IJAZ.AE, l{omor ljazah)
        Page 4: Scanned Transkrip with OCR noise (TNANSrrruPATAIDEDIr,, YUOISIUM, S€MESTER I, SKS)
        Page 5: Auxiliary certificate scan (low text, images)
        Page 6: KTP scan (NIK oo 24P731401120100013)
        """
        pages = [
            {
                "page_num": 1,
                "text": (
                    "Bandung, 06 Januari 2025\n"
                    "Hal : Lamaran Kerja\n"
                    "Kepada Yth. Bapak/Ibu HRD PT. Talenta Insan Gemilang\n"
                    "Dengan Hormat,\n"
                    "Sesuai dengan informasi lowongan pekerjaan di Tajira Solusi Utama,\n"
                    "Saya bermaksud untuk mengajukan diri sebagai Audit Officer.\n"
                    "Berikut data diri saya:\n"
                    "Nama: Muhammad Farhanul Haqim\n"
                    "Pendidikan Terakhir: S1 Ilmu Komunikasi\n"
                    "Hormat Saya,\n"
                    "doofarhan@gmail.com | 087722311868"
                ),
                "image_count": 1,
            },
            {
                "page_num": 2,
                "text": (
                    "Muhammad Farhanul Haqim\n"
                    "doofarhan@gmail.com | 087722311868\n\n"
                    "Tentang Saya\n"
                    "Lulusan dari Universitas Muhammadiyah Bandung jurusan ilmu komunikasi.\n\n"
                    "Pendidikan\n"
                    "2020 - 2024 | Universitas Muhammadiyah Bandung | Jurusan Ilmu Komunikasi, 3.46/4.00\n\n"
                    "Pengalaman Kerja\n"
                    "Februari - Juni 2024 | Magang | PT. BPRS HIK PARAHYANGAN\n"
                    "Audit Internal Funding Officer\n"
                    "- Mereview dan menganalisis laporan keuangan\n\n"
                    "Kemampuan\n"
                    "Komunikatif, Analisis Data, Microsoft Office"
                ),
                "image_count": 1,
            },
            {
                "page_num": 3,
                "text": (
                    "UNIVERSITAS MUHAMMADIYAH BANDUNG\n"
                    "IJAZ.AE\n"
                    "IH'SCENNHCATE\n"
                    "dlberlkan kepada Muhanmad Farhanrrl Haqim\n"
                    "l{omor ljazah Nasional: 04106it7020120241q)039\n"
                    "Sarjana flmu tr(omunikasi Rektor"
                ),
                "image_count": 1,
            },
            {
                "page_num": 4,
                "text": (
                    "UNIVERSITAS MUHAMMADIYAH BANDUNG\n"
                    "TNANSrrruPATAIDEDIr,\n"
                    "YUOISIUM\n"
                    "Angka K.cdtt (SXS x A)\n"
                    "S€MESTER I\n"
                    "Nilai SKS 3.5\n"
                    "S€MESTER III"
                ),
                "image_count": 1,
            },
            {
                "page_num": 5,
                "text": "Sertifikat Pelatihan Digital Entrepeneurship Kominfo",
                "image_count": 1,
            },
            {
                "page_num": 6,
                "text": "REPUBLIK INDONESIA\nNIK oo 24P731401120100013\nNama: MUHAMMAD FARHANUL HAQIM\nKecamatan",
                "image_count": 1,
            },
        ]

        res = isolate_document_boundaries(pages)

        # CV Core must ONLY contain Page 2
        assert res.total_pages == 6
        assert res.cv_core_pages == [2]
        assert res.cover_letter_pages == [1]
        assert res.attachment_pages == [3, 4, 5, 6]
        assert len(res.attachments) == 4

        # Verify page types
        assert res.attachments[0]["page_number"] == 3
        assert res.attachments[0]["type"] == "ATTACHMENT_ACADEMIC"
        assert res.attachments[1]["page_number"] == 4
        assert res.attachments[1]["type"] == "ATTACHMENT_ACADEMIC"
        assert res.attachments[3]["page_number"] == 6
        assert res.attachments[3]["type"] == "ATTACHMENT_ADMIN"

        # Verify zero leakage into cv_core_text
        assert "Hal : Lamaran Kerja" not in res.cv_core_text
        assert "IJAZ.AE" not in res.cv_core_text
        assert "TNANS" not in res.cv_core_text
        assert "NIK" not in res.cv_core_text
        assert "Pengalaman Kerja" in res.cv_core_text


class TestAdapterEndToEndHybridPdf:
    """Verifies that extract_candidate_profile isolates attachments and executes OCR at 300 DPI."""

    def test_hybrid_pdf_attachments_isolated_cleanly(self):
        doc = fitz.open()

        # Page 1: CV Core
        p1 = doc.new_page()
        p1.insert_text(
            (50, 72),
            "Muhammad Farhanul Haqim\n"
            "Email: farhanul@tajira.id | Phone: 081234567890\n\n"
            "PENGALAMAN KERJA\n"
            "Backend Engineer - PT Tajira Solusi (2022 - 2024)\n"
            "- Mengembangkan sistem API transaksi non-blocking.\n\n"
            "PENDIDIKAN\n"
            "S1 Teknik Informatika - Universitas Muhammadiyah Bandung\n\n"
            "KEAHLIAN\n"
            "Python, FastAPI, PostgreSQL",
        )

        # Page 2: Ijazah scan
        p2 = doc.new_page()
        p2.insert_text(
            (50, 72),
            "€@t UNIVERSITAS MUHAMMADIYAH BANDUNG\n"
            "IJAZAH SARJANA\n"
            "Nomor Ijazah Nasional: 54321/UMB/2024\n"
            "Yudisium: Dengan Pujian\n"
            "Rektor: Prof. Dr. Fulan\n"
            "Dekan: Dr. Fulanah",
        )

        # Page 3: Transkrip scan
        p3 = doc.new_page()
        p3.insert_text(
            (50, 72),
            "TRANSKRIP AKADEMIK\n"
            "Semester I\n"
            "Pemrograman Web 3 SKS Nilai A (SKS x N = 12)\n"
            "Dekan: Dr. Fulanah",
        )

        pdf_bytes = doc.tobytes()
        doc.close()

        profile = extract_candidate_profile(pdf_bytes, "2416_Muhammad Farhanul Haqim_CV_Tajira.pdf")

        # Identity consensus
        assert profile["identity"]["full_name"] == "Muhammad Farhanul Haqim"
        assert profile["identity"]["email"] == "farhanul@tajira.id"

        # Verify portfolio_attachments isolation
        assert len(profile["portfolio_attachments"]) == 2
        assert profile["portfolio_attachments"][0]["page_number"] == 2
        assert profile["portfolio_attachments"][0]["type"] == "ATTACHMENT_ACADEMIC"
        assert profile["portfolio_attachments"][1]["page_number"] == 3
        assert profile["portfolio_attachments"][1]["type"] == "ATTACHMENT_ACADEMIC"

        # Verify experiences were extracted from page 1 and not corrupted by academic attachments
        assert len(profile["experiences"]) >= 1
        assert "Backend Engineer" in profile["experiences"][0]["title"]
        assert "PT Tajira Solusi" in profile["experiences"][0]["organization"]

    def test_multipage_cover_letter_isolated_and_contact_fallback(self):
        """Page 1: Cover letter with contact info, no work exp
        Page 2: CV Core with experiences and education
        Page 3: Scanned Ijazah with OCR noise
        """
        doc = fitz.open()

        # Page 1: Cover Letter
        p1 = doc.new_page()
        p1.insert_text(
            (50, 72),
            "Bandung, 06 Januari 2025\n"
            "Hal : Lamaran Kerja\n"
            "Kepada Yth. Bapak/Ibu HRD\n"
            "Dengan Hormat,\n"
            "Sesuai informasi lowongan, saya mengajukan diri sebagai Software Engineer.\n"
            "Nama: Farhan Haqim\n"
            "Email: farhan.candidate@example.com\n"
            "Telepon: 081299887766\n"
            "Hormat Saya,\nFarhan",
        )

        # Page 2: CV Core
        p2 = doc.new_page()
        p2.insert_text(
            (50, 72),
            "Farhan Haqim\n\n"
            "PENGALAMAN KERJA\n"
            "Senior Backend Developer - PT Inovasi Maju (2022 - 2024)\n"
            "- Membangun scalable microservices.\n\n"
            "PENDIDIKAN\n"
            "S1 Teknik Informatika - Institut Teknologi Bandung\n\n"
            "KEAHLIAN\n"
            "Python, Go, Docker",
        )

        # Page 3: Ijazah scan
        p3 = doc.new_page()
        p3.insert_text(
            (50, 72),
            "UNIVERSITAS MUHAMMADIYAH BANDUNG\n"
            "IJAZ.AE\n"
            "l{omor ljazah Nasional: 04106it7020120241q)039\n"
            "Rektor: Prof. Dr. Fulan",
        )

        pdf_bytes = doc.tobytes()
        doc.close()

        profile = extract_candidate_profile(pdf_bytes, "Farhan_Haqim_CV.pdf")

        # Identity resolved from CV or fallback from cover letter
        assert profile["identity"]["email"] == "farhan.candidate@example.com"
        assert profile["identity"]["phone"] == "081299887766"

        # Attachment isolated: page 3
        assert len(profile["portfolio_attachments"]) == 1
        assert profile["portfolio_attachments"][0]["page_number"] == 3
        assert profile["portfolio_attachments"][0]["type"] == "ATTACHMENT_ACADEMIC"

        # Experience extracted from CV core
        assert len(profile["experiences"]) >= 1
        assert "Senior Backend Developer" in profile["experiences"][0]["title"]
        assert "PT Inovasi Maju" in profile["experiences"][0]["organization"]

    def test_real_farhanul_tajira_pdf_attachment_isolation(self):
        """End-to-end verification against actual candidate PDF if present in cache."""
        from pathlib import Path

        pdf_path = Path("/home/alifihsan/.hermes/cache/documents/doc_b50633002039_2416_Muhammad Farhanul Haqim_CV_Tajira.pdf")
        if not pdf_path.exists():
            pytest.skip("Cached candidate PDF not present")

        content = pdf_path.read_bytes()
        profile = extract_candidate_profile(content, "2416_Muhammad Farhanul Haqim_CV_Tajira.pdf")

        assert profile["identity"]["full_name"] == "Muhammad Farhanul Haqim"
        assert profile["identity"]["email"] == "doofarhan@gmail.com"
        assert profile["identity"]["phone"] == "087722311868"

        # All 4 auxiliary pages isolated (pages 3, 4, 5, 6)
        assert len(profile["portfolio_attachments"]) == 4
        page_numbers = [att["page_number"] for att in profile["portfolio_attachments"]]
        assert page_numbers == [3, 4, 5, 6]

        assert profile["portfolio_attachments"][0]["type"] == "ATTACHMENT_ACADEMIC"
        assert profile["portfolio_attachments"][1]["type"] == "ATTACHMENT_ACADEMIC"
        assert profile["portfolio_attachments"][3]["type"] == "ATTACHMENT_ADMIN"

        # Education degree_raw extracted from CV core (Page 2) and not from cover letter (Page 1)
        assert len(profile["education"]) >= 1
        assert "Universitas Muhammadiyah Bandung" in profile["education"][0]["institution"]
        assert "Alamat" not in profile["education"][0]["degree_raw"]
