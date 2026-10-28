from src.domain.retrieval import split_sentences
from src.infrastructure.config import settings


def test_split_sentences():
    text = "Membangun API dengan Python. Mengelola database PostgreSQL! Apakah performa tinggi tercapai? Ya tentu."
    sentences = split_sentences(text)
    assert len(sentences) == 4
    assert sentences[0] == "Membangun API dengan Python."
    assert sentences[1] == "Mengelola database PostgreSQL!"


def test_extract_granular_evidence_quote():
    from src.domain.retrieval import extract_granular_evidence_quote

    text = (
        "ALKAMIL FMIPA UNRI Pekanbaru Koordinator Asistensi. "
        "Melakukan perencanaan program pembinaan mahasiswa islam. "
        "Memiliki keahlian teknikal pada MySQL, Python, dan Node.js untuk backend."
    )
    quote = extract_granular_evidence_quote(text, target_terms=["python", "node.js"], max_chars=100)
    assert "Python" in quote
    assert "ALKAMIL FMIPA UNRI" not in quote
    assert len(quote) <= 100


def test_scoring_mode_configuration_and_defaults():
    assert settings.SCORING_MODE in ("rules", "hybrid", "jev_hybrid")
    assert 0.5 <= settings.SEMANTIC_THRESHOLD <= 0.9
