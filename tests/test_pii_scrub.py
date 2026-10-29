from src.worker.pii_scrub import REDACTED_SAMPLE, scrub_hidden_text_findings


def test_scrub_hides_text_copied_from_the_cv_but_keeps_inspector_markers():
    findings = [
        {"finding_type": "LOW_CONTRAST_WHITE", "page_number": 1, "bbox": [1, 2, 3, 4], "sample_text": "person@example.com"},
        {"finding_type": "ZERO_WIDTH_UNICODE", "page_number": 1, "bbox": None, "sample_text": "[ZERO_WIDTH_BYTES]"},
    ]
    scrubbed = scrub_hidden_text_findings(findings)
    assert scrubbed[0]["sample_text"] == REDACTED_SAMPLE
    assert scrubbed[1]["sample_text"] == "[ZERO_WIDTH_BYTES]"
    assert scrubbed[0]["finding_type"] == "LOW_CONTRAST_WHITE" and scrubbed[0]["bbox"] == [1, 2, 3, 4]
    assert findings[0]["sample_text"] == "person@example.com"  # input untouched
