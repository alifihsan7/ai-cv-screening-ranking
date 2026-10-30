"""Experience layouts seen in real CVs (LinkedIn exports, Canva templates, ATS exports), rebuilt as fictional text.

The shapes come from a manual test with 19 real CVs; none of their content is kept here. Each fixture is the text the
extractor hands to `parse_experiences`.
"""

from __future__ import annotations

import pytest

from src.worker.adapter import parse_experiences


def _parse(text: str) -> list[tuple[str, str, str, str]]:
    return [(e["title"], e["organization"], e["start"]["value"], e["end"]["value"]) for e in parse_experiences(text, text)]


LINKEDIN_EXPORT = """Rensa Studio
Full Stack Web Developer
April 2025 - Present (9 bulan)
Bandung, West Java, Indonesia
Developed a landing page using Laravel with a responsive layout and good
performance.
Implemented an admin dashboard for content and user management.
Pendidikan
Universitas Komputer Contoh
Bachelor's degree, Computer Science · (2022 - 2023)"""

LINKEDIN_EXPORT_TWO_JOBS = """Pengalaman
Tirta Systems
Backend Engineer
Januari 2023 - Maret 2025 (2 tahun 3 bulan)
Jakarta, Indonesia
Built payment APIs in Go and PostgreSQL.
Kopi Digital
Junior Developer
Juni 2021 - Desember 2022 (1 tahun 7 bulan)
Bandung, Indonesia
Maintained the ordering web application.
Pendidikan
Universitas Contoh"""

TITLE_COMMA_COMPANY_THEN_DATES_WITH_CITY = """Backend Developer, PT. Nusa Karya
May 2024 – Apr 2025 | Jakarta
Built REST APIs with FastAPI and PostgreSQL for the billing service.
Reviewed pull requests and wrote integration tests.
Software Engineer, PT. Mitra Data
May 2023 – Apr 2024 | Jakarta
Developed internal tools with Django.
EDUCATION
Universitas Contoh"""

TITLE_PIPE_SUB_THEN_ORG_CITY_MODE_DATES = """EXPERIENCE
Backend Engineer | Tirta Systems
Jakarta | Onsite | June 2024 - May 2025
Designed REST APIs in Python and tuned PostgreSQL queries for the reporting service.
Mentored two junior engineers.
Software Engineer | Kopi Digital
Bandung | Remote | July 2023 - January 2024
Wrote Django services for the checkout flow.
PROJECTS
Inventory API"""

TITLE_THEN_ORG_WITH_COMMA_MONTH_DATES = """Backend Developer
PT. Garuda Niaga - Surabaya, Jawa Timur | | April , 2024 – April , 2025
Membangun REST API dengan Python dan PostgreSQL.
Menurunkan waktu respons API sebesar 40%.
Dewi Contoh
Backend Developer | Python | Go
+62 812 0000 0000 | dewi@example.com | linkedin.com/in/dewi-contoh | Surabaya,
Backend Developer
PT. Cakra Teknologi - Bandung, Jawa Barat | | Januari , 2023 – April , 2024
Mengembangkan layanan pengiriman dengan Java.
PENDIDIKAN
Universitas Contoh"""

DATE_FIRST_WITH_GLYPH_BULLETS = """NOVEMBER 2023 – NOW
FREELANCE WEB DEVELOPER, REMOTE
 Created a dynamic quiz website with Laravel and a PostgreSQL database for a
learning platform.
 Handled the full deployment process on a shared server.
NOVEMBER 2022 – JANUARI 2023
WEB DEVELOPER INTERN, ACME
 Built an inventory page with Vue.js and a REST API client.
AGUSTUS 2021 – FEBRUARI 2022
SOFTWARE DEVELOPER INTERN, KOPI DIGITAL
 Fixed bugs in the ordering application.
EDUCATION
2019 - 2023"""


def test_linkedin_export_company_title_dates_duration_location():
    assert _parse(LINKEDIN_EXPORT) == [("Full Stack Web Developer", "Rensa Studio", "2025-04", "present")]


def test_linkedin_export_with_several_jobs():
    assert _parse(LINKEDIN_EXPORT_TWO_JOBS) == [
        ("Backend Engineer", "Tirta Systems", "2023-01", "2025-03"),
        ("Junior Developer", "Kopi Digital", "2021-06", "2022-12"),
    ]


def test_title_and_company_on_one_line_then_dates_with_a_city():
    assert _parse(TITLE_COMMA_COMPANY_THEN_DATES_WITH_CITY) == [
        ("Backend Developer", "PT. Nusa Karya", "2024-05", "2025-04"),
        ("Software Engineer", "PT. Mitra Data", "2023-05", "2024-04"),
    ]


def test_title_pipe_company_then_city_mode_and_dates():
    assert _parse(TITLE_PIPE_SUB_THEN_ORG_CITY_MODE_DATES) == [
        ("Backend Engineer", "Tirta Systems", "2024-06", "2025-05"),
        ("Software Engineer", "Kopi Digital", "2023-07", "2024-01"),
    ]


def test_title_then_company_line_with_dates_that_have_a_comma_after_the_month():
    assert _parse(TITLE_THEN_ORG_WITH_COMMA_MONTH_DATES) == [
        ("Backend Developer", "PT. Garuda Niaga", "2024-04", "2025-04"),
        ("Backend Developer", "PT. Cakra Teknologi", "2023-01", "2024-04"),
    ]


def test_a_repeated_page_header_between_jobs_is_not_part_of_a_bullet_list():
    header = (
        "Dewi Contoh\nBackend Developer | Python | Go\n"
        "+62 812 0000 0000 | dewi@example.com | linkedin.com/in/dewi-contoh | Surabaya,\n"
    )
    entries = parse_experiences(TITLE_THEN_ORG_WITH_COMMA_MONTH_DATES, header + TITLE_THEN_ORG_WITH_COMMA_MONTH_DATES)
    bullets = [b["text"] for b in entries[0]["bullets"]]
    assert not any("example.com" in b or "linkedin" in b or "Dewi Contoh" in b for b in bullets)
    assert len(bullets) == 2


def test_date_first_layout_with_glyph_bullets_and_wrapped_lines():
    parsed = _parse(DATE_FIRST_WITH_GLYPH_BULLETS)
    assert [(s, e) for _, _, s, e in parsed] == [("2023-11", "present"), ("2022-11", "2023-01"), ("2021-08", "2022-02")]
    titles = [t for t, *_ in parsed]
    assert all(t.isupper() and "DEVELOPER" in t for t in titles), titles


@pytest.mark.parametrize(
    "text",
    [LINKEDIN_EXPORT, TITLE_COMMA_COMPANY_THEN_DATES_WITH_CITY, DATE_FIRST_WITH_GLYPH_BULLETS],
)
def test_no_entry_title_is_a_bullet_or_a_place(text: str):
    for title, *_ in _parse(text):
        assert not title.startswith(("", "•", "-")) and title.lower() not in {"jakarta", "bandung", "remote", "onsite"}


def test_scrambled_text_with_job_like_dates_is_flagged_for_manual_review():
    from src.worker.adapter import has_job_like_date_ranges

    scrambled = "Backend\nJul 2024 - Present\nWORK\nEXPERIENCE\nApr 2017 - Aug 2021\nPython"
    assert has_job_like_date_ranges(scrambled)


def test_a_fresh_graduate_with_only_school_years_is_not_flagged():
    from src.worker.adapter import has_job_like_date_ranges

    assert not has_job_like_date_ranges("S1 Teknik Informatika (2019 - 2023)\nSMK Negeri 1 (2016 - 2019)")
    assert not has_job_like_date_ranges("Pendidikan 2019 - 2023")


COMPANY_DATES_THEN_TITLE = """PT. NUSA KARYA
April 2024 – April 2025
Backend Developer
Developed REST APIs using Python and PostgreSQL for the billing system with good
performance.
Wrote automated tests.
PENGALAMAN KERJA
PT. MITRA DATA September 2023 – Desember 2023
Software Engineer Intern
Fixed bugs in the ordering application.
PENGALAMAN ORGANISASI
Himpunan Contoh"""

COMPANY_CITY_DATES_THEN_TITLE_WITH_INTERN_NOTE = """PT. Nusa Karya - Jakarta
Jul 2024 - Aug 2024
Software Engineer (Intern)
Built an internal tool with FastAPI and PostgreSQL for the operations team.
Wrote unit tests for the reporting module.
PT. Mitra Data - Bandung
Nov 2023 - Jan 2024
Backend Developer (Intern)
Developed a REST API with Django."""


def test_company_then_dates_then_title_with_a_repeated_section_heading():
    parsed = parse_experiences(COMPANY_DATES_THEN_TITLE, COMPANY_DATES_THEN_TITLE)
    assert [(e["title"], e["organization"], e["start"]["value"], e["end"]["value"]) for e in parsed] == [
        ("Backend Developer", "PT. NUSA KARYA", "2024-04", "2025-04"),
        ("Software Engineer Intern", "PT. MITRA DATA", "2023-09", "2023-12"),
    ]
    assert [b["text"] for b in parsed[0]["bullets"]] == [
        "Developed REST APIs using Python and PostgreSQL for the billing system with good",
        "performance.",
        "Wrote automated tests.",
    ]


def test_company_and_city_then_dates_then_title():
    assert _parse(COMPANY_CITY_DATES_THEN_TITLE_WITH_INTERN_NOTE) == [
        ("Software Engineer (Intern)", "PT. Nusa Karya", "2024-07", "2024-08"),
        ("Backend Developer (Intern)", "PT. Mitra Data", "2023-11", "2024-01"),
    ]


def test_one_word_per_line_text_is_fragmented_and_normal_text_is_not():
    from src.worker.adapter import is_fragmented_text

    scattered = "\n".join(["Backend", "Developer", "PT", "Contoh", "2023", "Python", "Go", "Docker"] * 8)
    assert is_fragmented_text(scattered)
    normal = "\n".join(["Built REST APIs with Python and PostgreSQL for billing."] * 30 + ["Python", "Docker"] * 5)
    assert not is_fragmented_text(normal)
    assert not is_fragmented_text("Python\nGo\nDocker")  # too short to judge


COMPANY_CITY_DATES_THEN_TITLE = """PT. NUSA KARYA
Bandung,
Mei 2023 - Sekarang
Koordinator Program Kesehatan
Menjalankan program kesehatan dan melaporkan hasilnya kepada pimpinan setiap bulan.
PT. MITRA DATA
Jakarta,
Jan 2024 - Jun 2024
Backend Developer
Membangun REST API dengan Python."""


def test_company_city_dates_pattern_takes_a_title_without_a_role_word():
    text = """PT. NUSA KARYA
Bandung,
Mei 2023 - Sekarang
Pendamping Program Anak
Mendampingi anak-anak dalam kegiatan belajar setiap pekan di sekolah mitra."""
    assert _parse(text) == [("Pendamping Program Anak", "PT. NUSA KARYA", "2023-05", "present")]


def test_company_then_city_then_dates_then_title():
    assert _parse(COMPANY_CITY_DATES_THEN_TITLE) == [
        ("Koordinator Program Kesehatan", "PT. NUSA KARYA", "2023-05", "present"),
        ("Backend Developer", "PT. MITRA DATA", "2024-01", "2024-06"),
    ]


def test_title_above_company_is_kept_when_a_project_subtitle_with_a_role_word_follows_the_dates():
    text = """Backend Engineer
PT. Nusa Karya | Bandung
Maret 2020 - Mei 2023
Support backend BPJS Kesehatan
Membangun layanan integrasi dengan Java dan PostgreSQL untuk klaim peserta.
Tech Lead
PT. Mitra Data | Jakarta
Agustus 2018 - Januari 2020
Support backend Telkom
Memimpin tim kecil untuk integrasi pembayaran."""
    assert _parse(text) == [
        ("Backend Engineer", "PT. Nusa Karya", "2020-03", "2023-05"),
        ("Tech Lead", "PT. Mitra Data", "2018-08", "2020-01"),
    ]


CIVIL_JOB_WITH_FILLED_CIRCLE_BULLETS = """Asisten Engineer and Drafter
PT. Supraharmonia Consultant
Mei 2019 - Mei 2024
● Melakukan perhitungan struktur gedung dengan SAP2000 dan ETABS.
● Menyusun gambar kerja dan shop drawing proyek gedung bertingkat.
■ Mengawasi pelaksanaan pekerjaan pondasi di lapangan.
Staff Teknik
PT. Puji Harta Konstruksi
Oktober 2018 - Juli 2019
◆ Membuat laporan progres mingguan proyek jalan."""


@pytest.mark.parametrize("glyph", ["●", "■", "◆", "➤", "✓"])
def test_solid_bullet_glyphs_are_bullets_not_organization_names(glyph: str):
    text = CIVIL_JOB_WITH_FILLED_CIRCLE_BULLETS.replace("●", glyph).replace("■", glyph).replace("◆", glyph)
    parsed = parse_experiences(text, text)
    assert [(e["title"], e["organization"]) for e in parsed] == [
        ("Asisten Engineer and Drafter", "PT. Supraharmonia Consultant"),
        ("Staff Teknik", "PT. Puji Harta Konstruksi"),
    ]
    assert [len(e["bullets"]) for e in parsed] == [3, 1]
    assert all(not b["text"].startswith(glyph) for e in parsed for b in e["bullets"])
