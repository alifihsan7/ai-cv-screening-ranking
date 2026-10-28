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
