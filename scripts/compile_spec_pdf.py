#!/usr/bin/env python3
"""
Compile docs/spec/PRODUCT_ARCHITECTURE_SPECIFICATION.md into a high-standard PDF
using Typst and Pandoc.
"""

import os
import re
import subprocess
import sys

def main():
    repo_dir = "/home/alifihsan/agentic-cv-screener"
    md_path = os.path.join(repo_dir, "docs/spec/PRODUCT_ARCHITECTURE_SPECIFICATION.md")
    raw_typ = "/tmp/spec_raw.typ"
    final_typ = os.path.join(repo_dir, "docs/spec/PRODUCT_ARCHITECTURE_SPECIFICATION.typ")
    out_pdf = os.path.join(repo_dir, "docs/spec/PRODUCT_ARCHITECTURE_SPECIFICATION.pdf")

    # Step 1: Pandoc conversion
    print("Converting Markdown to Typst via Pandoc...")
    cmd = ["pandoc", md_path, "-f", "markdown+smart", "-t", "typst", "-o", raw_typ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("Pandoc failed:", res.stderr)
        sys.exit(1)

    with open(raw_typ, "r", encoding="utf-8") as f:
        body = f.read()

    # Step 2: Clean up Typst math/symbol idiosyncrasies
    body = body.replace("sym.angle.l", "chevron.l").replace("sym.angle.r", "chevron.r")
    body = body.replace("angle.l", "chevron.l").replace("angle.r", "chevron.r")
    body = body.replace("sym.arrow.r.double.long", "==>")
    body = body.replace("sym.arrow.l.double.long", "<==")
    body = body.replace("sym.arrow.l.r.double.long", "<==>")
    body = body.replace("sym.arrow.r.long", "-->")
    body = body.replace("sym.arrow.l.long", "<--")

    # Replace manual TOC markdown with Typst dynamic outline
    pattern_toc = r'= DAFTAR ISI.*?(?== 1\. EXECUTIVE SUMMARY)'
    replacement_toc = '= DAFTAR ISI\n#outline(title: none, indent: 1.5em, depth: 2)\n#v(1em)\n#line(length: 100%, stroke: 0.5pt + rgb("#cbd5e1"))\n#v(1em)\n'
    body = re.sub(pattern_toc, replacement_toc, body, flags=re.DOTALL)

    # Clean up less-than in prose outside code blocks
    lines = body.splitlines(keepends=True)
    in_code = False
    new_lines = []

    for line in lines:
        if line.strip().startswith('```'):
            in_code = not in_code
            new_lines.append(line)
            continue

        if in_code:
            new_lines.append(line)
        else:
            clean_line = line.replace('<=', '$lt.eq$')
            clean_line = clean_line.replace('<=>', '`<=>`')

            def replace_lt(match):
                token = match.group(0)
                if re.match(r'^<[\w\-.:]+>$', token):
                    return token
                return token.replace('<', '$lt$ ')

            clean_line = re.sub(r'<[^>\s]*>?', replace_lt, clean_line)
            new_lines.append(clean_line)

    body = "".join(new_lines)

    # Typst Header Template
    header = """
#set document(
  title: "AI-Assisted CV Screening Platform — Product Architecture Specification & Engineering RFC",
  author: ("Zephyr (Lead Systems Architect)", "Alif Ihsan (AI7 Solaris)")
)

#set page(
  paper: "a4",
  margin: (top: 2.2cm, bottom: 2.2cm, left: 2.2cm, right: 2.2cm),
  header: context [
    #if here().page() > 1 [
      #grid(
        columns: (1fr, auto),
        align(left)[#text(size: 8pt, fill: rgb("#64748b"))[*AI7 Solaris* · AI-Assisted CV Screening Platform]],
        align(right)[#text(size: 8pt, fill: rgb("#64748b"))[SPEC-PROD-2026-CV-01 · Rev 2.0]]
      )
      #line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
    ]
  ],
  footer: context [
    #line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
    #v(2pt)
    #grid(
      columns: (1fr, auto),
      align(left)[#text(size: 8pt, fill: rgb("#94a3b8"))[Product Architecture Specification & Engineering RFC · Production Baseline]],
      align(right)[#text(size: 8pt, fill: rgb("#64748b"), weight: "bold")[Page #here().page()]]
    )
  ]
)

#set text(
  font: "Liberation Sans",
  size: 9.5pt,
  fill: rgb("#0f172a"),
  spacing: 120%,
  lang: "id"
)

#set par(
  justify: true,
  leading: 0.65em,
  first-line-indent: 0pt
)

#show heading: it => [
  #v(1.2em)
  #text(fill: rgb("#0f172a"), weight: "bold")[#it.body]
  #v(0.6em)
]

#show heading.where(level: 1): it => [
  #v(1.6em)
  #text(size: 15pt, fill: rgb("#0f172a"), weight: "bold")[#it.body]
  #v(0.3em)
  #line(length: 100%, stroke: 1.2pt + rgb("#0f172a"))
  #v(0.6em)
]

#show heading.where(level: 2): it => [
  #v(1.3em)
  #text(size: 12pt, fill: rgb("#1e293b"), weight: "bold")[#it.body]
  #v(0.4em)
]

#show heading.where(level: 3): it => [
  #v(1.1em)
  #text(size: 10.5pt, fill: rgb("#334155"), weight: "bold")[#it.body]
  #v(0.3em)
]

#show raw: set text(font: "DejaVu Sans Mono", size: 8pt)
#show raw.where(block: true): it => [
  #block(
    fill: rgb("#f8fafc"),
    stroke: 0.75pt + rgb("#cbd5e1"),
    inset: 8pt,
    radius: 4pt,
    width: 100%,
    it
  )
]

#show table: set text(size: 8.5pt)
#set table(
  stroke: 0.5pt + rgb("#cbd5e1"),
  fill: (col, row) => if row == 0 { rgb("#f1f5f9") } else { none }
)

#let horizontalrule = line(length: 100%, stroke: 0.5pt + rgb("#cbd5e1"))

#let blockquote(body) = [
  #block(
    fill: rgb("#f8fafc"),
    stroke: (left: 3pt + rgb("#2563eb")),
    inset: (left: 10pt, y: 6pt, right: 8pt),
    radius: (right: 3pt),
    width: 100%,
    text(style: "italic", fill: rgb("#334155"), body)
  )
]

// Cover Header Card
#align(center)[
  #block(
    fill: rgb("#0f172a"),
    inset: (x: 20pt, y: 22pt),
    radius: 6pt,
    width: 100%,
    [
      #text(size: 9pt, fill: rgb("#38bdf8"), weight: "bold", tracking: 0.15em)[PRODUCT ARCHITECTURE SPECIFICATION · ENGINEERING RFC & PRD]\\
      #v(6pt)
      #text(size: 18pt, fill: white, weight: "bold")[AI-Assisted CV Screening Platform]\\
      #v(2pt)
      #text(size: 11pt, fill: rgb("#cbd5e1"), weight: "medium")[Deterministic-First Evidence Engine, Anti-Bias Verifier, and Production Systems Blueprint]\\
      #v(12pt)
      #line(length: 60%, stroke: 0.5pt + rgb("#475569"))
      #v(8pt)
      #grid(
        columns: (1fr, 1fr, 1fr),
        align: center,
        [#text(size: 8pt, fill: rgb("#94a3b8"))[Document ID:]\\ #text(size: 8.5pt, fill: white, weight: "bold")[SPEC-PROD-2026-CV-01]],
        [#text(size: 8pt, fill: rgb("#94a3b8"))[Effective Date:]\\ #text(size: 8.5pt, fill: white, weight: "bold")[October 24, 2026]],
        [#text(size: 8pt, fill: rgb("#94a3b8"))[Status:]\\ #text(size: 8.5pt, fill: rgb("#4ade80"), weight: "bold")[ACTIVE / PRODUCTION]]
      )
    ]
  )
]

#v(12pt)
"""

    with open(final_typ, "w", encoding="utf-8") as f:
        f.write(header + "\n" + body)

    print(f"Compiling Typst to PDF: {out_pdf}...")
    try:
        import typst
        typst.compile(final_typ, output=out_pdf)
    except Exception as e:
        print("Typst compile error:", e)
        sys.exit(1)

    print("Typst compilation SUCCESSFUL!")
    print(f"Output saved to: {out_pdf}")

if __name__ == "__main__":
    main()
