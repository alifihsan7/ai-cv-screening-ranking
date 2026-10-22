#!/usr/bin/env python3
"""
Publication-Grade Research PDF Generator for AI-Assisted CV Screening Platform.
Transforms Markdown research memos into typeset PDFs using Pandoc and Typst.
"""
from pathlib import Path
import re
import subprocess
import sys

try:
    import typst
except ImportError:
    print("Error: typst module not found. Run with .venv/bin/python or pip install typst.")
    sys.exit(1)

ROOT_DIR = Path(__file__).resolve().parent.parent
input_md_path = ROOT_DIR / "docs" / "research" / "SYSTEM_ARCHITECTURE_RESEARCH_MEMO.md"
output_typ_path = ROOT_DIR / "docs" / "research" / "SYSTEM_ARCHITECTURE_RESEARCH_MEMO.typ"
output_pdf_path = ROOT_DIR / "docs" / "research" / "AI_Assisted_CV_Screening_Platform_Research_and_Architecture.pdf"

with open(input_md_path, "r", encoding="utf-8") as f:
    raw_content = f.read()

# 1. Clean dispatcher unverified banner
clean_content = re.sub(r"^# UNTRUSTED_AGENT_OUTPUT[\s\S]*?# Body-sha256: [a-f0-9]+\n+", "", raw_content)

# 2. Extract memorandum header
clean_content = re.sub(r"Kepada: .*?\nDari: .*?\nPerihal: .*?\nKlasifikasi: .*?\n", "", clean_content)
clean_content = re.sub(r"^# MEMORANDUM RISET & ARSITEKTUR KONSEPTUAL\n+", "", clean_content)
clean_content = re.sub(r"^---\n+", "", clean_content)

# 3. Fix inline pseudo-bullet asterisks in markdown before pandoc
clean_content = re.sub(r"\n\*\s+(\$c_j\b)", r"\n- \1", clean_content)
clean_content = re.sub(r"\n\*\s+(\$k_j\b)", r"\n- \1", clean_content)
clean_content = re.sub(r"\n\*\s+(\$I_j\b)", r"\n- \1", clean_content)
clean_content = re.sub(r"\n\*\s+(\$w_j\b)", r"\n- \1", clean_content)
clean_content = re.sub(r"\n\*\s+(\$\\mathcal\{P\}_j\b)", r"\n- \1", clean_content)

# Fix long inline code in Phase 4 to be a clean code block
clean_content = clean_content.replace(
    "- Menjalankan evaluasi komparatif formal: `python docs/spec/golden_dataset/evaluate.py --jd01 --jd02 --edge`.",
    "- Menjalankan evaluasi komparatif formal:\n```bash\npython docs/spec/golden_dataset/evaluate.py --jd01 --jd02 --edge\n```"
)
clean_content = clean_content.replace(
    "* Menjalankan evaluasi komparatif formal: `python docs/spec/golden_dataset/evaluate.py --jd01 --jd02 --edge`.",
    "- Menjalankan evaluasi komparatif formal:\n```bash\npython docs/spec/golden_dataset/evaluate.py --jd01 --jd02 --edge\n```"
)

temp_md = ROOT_DIR / "docs" / "research" / ".temp_for_typst.md"
with open(temp_md, "w", encoding="utf-8") as f:
    f.write(clean_content)

# Run pandoc to convert to Typst
cmd = ["pandoc", str(temp_md), "-f", "markdown", "-t", "typst"]
res = subprocess.run(cmd, capture_output=True, text=True, check=True)
body_typst = res.stdout

if temp_md.exists():
    temp_md.unlink()

# Promote headings: '== ' -> '= ', '=== ' -> '== ', '==== ' -> '=== '
lines = []
for line in body_typst.splitlines():
    if line.startswith("== "):
        lines.append("= " + line[3:])
    elif line.startswith("=== "):
        lines.append("== " + line[4:])
    elif line.startswith("==== "):
        lines.append("=== " + line[5:])
    else:
        lines.append(line)
body_typst = "\n".join(lines)

# Fix angle brackets and arrows for Typst
body_typst = body_typst.replace('angle.l', 'chevron.l').replace('angle.r', 'chevron.r')
body_typst = body_typst.replace('arrow.r.double.long', '==>')

# Executive Typst template
typst_header = """// AI-Assisted CV Screening Platform — Research & Architecture
#set document(
  title: "AI-Assisted CV Screening Platform — Research & Architecture",
  author: ("Alif Ihsan", "Nexus", "Sage")
)

#set page(
  paper: "us-letter",
  margin: (top: 2.2cm, bottom: 2.2cm, left: 2.2cm, right: 2.2cm),
  header: text(8pt, fill: rgb("#6b7280"), font: "Liberation Sans")[
    #grid(
      columns: (1fr, 1fr),
      align(left)[AI-Assisted CV Screening Platform — Research & Architecture],
      align(right)[AI7 Solaris Constellation]
    )
    #v(-3pt)
    #line(length: 100%, stroke: 0.4pt + rgb("#e5e7eb"))
  ],
  footer: context text(8pt, fill: rgb("#6b7280"), font: "Liberation Sans")[
    #line(length: 100%, stroke: 0.4pt + rgb("#e5e7eb"))
    #v(3pt)
    #grid(
      columns: (1fr, 1fr),
      align(left)[Sovereign Core Architecture Blueprint · v2.0-agentic],
      align(right)[Page #counter(page).display() of #counter(page).final().first()]
    )
  ]
)

#set text(
  font: "Liberation Sans",
  size: 9.5pt,
  fill: rgb("#1f2937"),
  spacing: 120%
)

#set par(
  justify: true,
  leading: 0.65em
)

#let horizontalrule = line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))

// Heading styling with NO HYPHENATION
#show heading: set text(hyphenate: false)

#show heading.where(level: 1): it => block(
  above: 22pt,
  below: 10pt,
  breakable: false,
  [
    #text(font: "DejaVu Serif", size: 13.5pt, weight: "bold", fill: rgb("#111827"))[#it.body]
    #v(3pt)
    #line(length: 100%, stroke: 0.8pt + rgb("#cbd5e1"))
  ]
)

#show heading.where(level: 2): it => block(
  above: 15pt,
  below: 8pt,
  breakable: false,
  text(font: "Liberation Sans", size: 11pt, weight: "bold", fill: rgb("#1e293b"))[#it.body]
)

#show heading.where(level: 3): it => block(
  above: 12pt,
  below: 6pt,
  breakable: false,
  text(font: "Liberation Sans", size: 10pt, weight: "bold", fill: rgb("#334155"))[#it.body]
)

// Blockquote / Callout styling
#show quote: it => block(
  fill: rgb("#f8fafc"),
  stroke: (left: 3.5pt + rgb("#2563eb")),
  radius: (right: 4pt),
  inset: (x: 10pt, y: 8pt),
  outset: 0pt,
  width: 100%,
  breakable: false,
  text(font: "Liberation Sans", size: 9pt, fill: rgb("#1e293b"))[#it.body]
)

// Code block & Raw styling (breakable: true so diagrams don't create blank pages)
#show raw.where(block: true): it => block(
  fill: rgb("#f8fafc"),
  stroke: 0.5pt + rgb("#e2e8f0"),
  radius: 4pt,
  inset: (x: 8pt, y: 6pt),
  width: 100%,
  breakable: true,
  [
    #set par(leading: 0.28em)
    #set text(font: "DejaVu Sans Mono", size: 6.8pt, fill: rgb("#0f172a"))
    #it
  ]
)

// Inline code styling: soft background, clean monospace, natural wrapping
#show raw.where(block: false): set text(font: "DejaVu Sans Mono", size: 8pt, fill: rgb("#0f172a"))

// Table styling
#show table: set table(
  stroke: (x, y) => if y == 0 { (bottom: 1.2pt + rgb("#94a3b8"), top: 0.5pt + rgb("#e2e8f0")) } else { 0.5pt + rgb("#e2e8f0") },
  fill: (col, row) => if row == 0 { rgb("#f8fafc") } else if calc.even(row) { rgb("#fcfcfd") } else { none },
  inset: (x: 8pt, y: 7pt)
)

// Math equations display
#show math.equation.where(block: true): it => block(
  width: 100%,
  align(center)[#it],
  above: 9pt,
  below: 9pt
)

// Title Banner with explicit balanced line break (ZERO hyphens)
#v(-5pt)
#text(font: "DejaVu Serif", size: 21pt, weight: "bold", fill: rgb("#111827"), hyphenate: false)[
  AI-Assisted CV Screening Platform \
  Research & Architecture Specification
]
#v(4pt)
#text(font: "Liberation Sans", size: 10.5pt, fill: rgb("#475569"))[
  Memorandum Riset & Arsitektur Konseptual: Transformasi Pipeline Screening & Ranking Berbasis Agentic ReAct State Machine & Calibrated Micro-Verifier
]
#v(6pt)

#rect(
  width: 100%,
  fill: rgb("#f8fafc"),
  stroke: 0.6pt + rgb("#cbd5e1"),
  radius: 5pt,
  inset: (x: 12pt, y: 9pt)
)[
  #grid(
    columns: (1fr, 1.2fr),
    row-gutter: 7pt,
    [#text(weight: "bold", fill: rgb("#475569"))[Tanggal:] 23 Oktober 2026],
    [#text(weight: "bold", fill: rgb("#475569"))[Klasifikasi:] Sovereign Core Research / RFC Blueprint],
    [#text(weight: "bold", fill: rgb("#475569"))[Penyusun:] Sage (2nd Luminary) & Nexus (1st)],
    [#text(weight: "bold", fill: rgb("#475569"))[Repositori:] `alifihsan7/agentic-cv-screener` (v2.0)]
  )
]

#v(8pt)
"""

full_typst = typst_header + "\n" + body_typst

with open(output_typ_path, "w", encoding="utf-8") as f:
    f.write(full_typst)

print("Compiling Typst document to PDF...")
typst.compile(str(output_typ_path), output=str(output_pdf_path))
print(f"Compiled successfully to: {output_pdf_path}")
