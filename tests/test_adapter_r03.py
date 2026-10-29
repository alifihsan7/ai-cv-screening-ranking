from src.worker.adapter import parse_experiences


def test_parse_experiences_without_separator():
    text = """Data Analyst
Jan 2022 – Present
- Membuat dashboard"""

    exps = parse_experiences(text, text)
    assert len(exps) == 1
    assert exps[0]["title"] == "Data Analyst"
    assert exps[0]["start"]["value"] == "2022-01"
    assert exps[0]["end"]["value"] == "present"


def test_parse_experiences_stops_at_section_boundary():
    text = """ALKAMIL FMIPA UNRI
Koordinator Asistensi
Februari 2021 - Desember 2021
- Melakukan perencanaan program pembinaan mahasiswa islam
PRESTASI DAN PENGHARGAAN
- Juara 1 Lomba Esai Ilmiah Nasional
KEMAMPUAN TEKNIKAL
- MySQL, Python, RStudio"""

    exps = parse_experiences(text, text)
    assert len(exps) == 1
    assert "Koordinator Asistensi" in exps[0]["title"]
    bullet_texts = [b["text"] for b in exps[0]["bullets"]]
    assert len(bullet_texts) == 1
    assert "Melakukan perencanaan program pembinaan mahasiswa islam" in bullet_texts[0]
    # Invariant: non-experience sections must NOT bleed into experience bullets
    for b in bullet_texts:
        assert "PRESTASI" not in b
        assert "KEMAMPUAN TEKNIKAL" not in b
        assert "Python" not in b


def test_parse_experiences_inline_header_with_di_and_city():
    text = """Backend Developer di PT Cakra Teknologi, Surabaya (Februari 2019 – Desember 2023)
• Mengelola basis data PostgreSQL.
Freelance Backend Developer di Proyek lepas, Remote (Januari 2022 – Desember 2022)
• Membuat API untuk toko online."""

    exps = parse_experiences(text, text)
    assert [(e["title"], e["organization"]) for e in exps] == [
        ("Backend Developer", "PT Cakra Teknologi"),
        ("Freelance Backend Developer", "Proyek lepas"),
    ]


def test_parse_experiences_date_first_with_multiple_jobs():
    text = """Feb 2021 – Present
Tech Lead, Backend
Orbit Commerce, Jakarta
• Led a team of 5 backend engineers.
• Containerized services with Docker.
Jun 2018 – Jan 2021
Backend Engineer
Pasar Digital, Jakarta
• Built REST APIs in Python."""

    exps = parse_experiences(text, text)
    assert [(e["title"], e["organization"]) for e in exps] == [
        ("Tech Lead, Backend", "Orbit Commerce"),
        ("Backend Engineer", "Pasar Digital"),
    ]
    assert [b["text"] for b in exps[0]["bullets"]] == [
        "Led a team of 5 backend engineers.",
        "Containerized services with Docker.",
    ]
    assert [b["text"] for b in exps[1]["bullets"]] == ["Built REST APIs in Python."]
