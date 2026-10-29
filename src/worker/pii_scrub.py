"""What the worker may store outside the encrypted identity table (aturan emas #4).

`candidate_profiles.profile` used to hold the raw extraction, including the candidate's name, email, phone, links and
the unredacted CV text, and `quality.hidden_text_findings` kept text samples copied from the CV (often the contact
line). Both sat in plain JSON next to the encrypted `candidate_identities`, which made the encryption pointless.
"""

from __future__ import annotations

from typing import Any

# Samples that are fixed markers written by the inspector, never CV text.
_MARKER_PREFIX, _MARKER_SUFFIX = "[", "]"
REDACTED_SAMPLE = "[SAMPLE_REDACTED]"


def scrub_hidden_text_findings(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Copies of the findings without any text taken from the CV (type, page and position are kept)."""
    out: list[dict[str, Any]] = []
    for finding in findings:
        sample = str(finding.get("sample_text", ""))
        is_marker = sample.startswith(_MARKER_PREFIX) and sample.endswith(_MARKER_SUFFIX)
        out.append({**finding, "sample_text": sample if is_marker else REDACTED_SAMPLE})
    return out
