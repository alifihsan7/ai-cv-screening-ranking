"""Removes identity and CV text from the plain JSON columns of rows stored before the worker stopped writing them.

Before: `candidate_profiles.profile` held the raw extraction (name, email, phone, links, `cv_core_text`) and
`quality.hidden_text_findings[].sample_text` held text copied from the CV. The encrypted `candidate_identities` table
still holds the identity; nothing is lost from there.

  profile  <- matching_profile   (the redacted view every other reader already uses)
  quality  <- hidden text samples replaced by a fixed marker

Dry run by default: prints how many rows would change. `--apply` writes, in one transaction.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.infrastructure.database import get_connection  # noqa: E402
from src.worker.pii_scrub import scrub_hidden_text_findings  # noqa: E402


async def main(apply: bool) -> None:
    async with get_connection() as conn, conn.cursor() as cur:
        await cur.execute("SELECT id, profile, matching_profile, quality FROM candidate_profiles")
        rows = await cur.fetchall()
        changed = 0
        for r in rows:
            profile = r["profile"] or {}
            quality = dict(r["quality"] or {})
            dirty_profile = "identity" in profile or "cv_core_text" in profile
            findings = quality.get("hidden_text_findings") or []
            scrubbed = scrub_hidden_text_findings(findings)
            dirty_quality = scrubbed != findings
            if not (dirty_profile or dirty_quality):
                continue
            changed += 1
            if apply:
                if dirty_quality:
                    quality["hidden_text_findings"] = scrubbed
                await cur.execute(
                    "UPDATE candidate_profiles SET profile = %s, quality = %s WHERE id = %s",
                    (json.dumps(r["matching_profile"] if dirty_profile else profile), json.dumps(quality), r["id"]),
                )
        if apply:
            await conn.commit()
        print(f"{len(rows)} rows, {changed} {'updated' if apply else 'would change (dry run, pass --apply to write)'}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true")
    asyncio.run(main(ap.parse_args().apply))
