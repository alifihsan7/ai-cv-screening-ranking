#!/usr/bin/env python3
"""
Compile docs/spec/PROPOSAL_ARSITEKTUR_SISTEM_JEV.md into a publication-grade PDF
using Pandoc and Typst, strictly adhering to the publication-pdf-reports skill.
"""

import os
import re
import subprocess
import sys

def main():
    repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    md_path = os.path.join(repo_dir, "docs/spec/PROPOSAL_ARSITEKTUR_SISTEM_JEV.md")
    raw_typ = "/tmp/proposal_raw.typ"
    final_typ = os.path.join(repo_dir, "docs/spec/PROPOSAL_ARSITEKTUR_SISTEM_JEV.typ")
    out_pdf = os.path.join(repo_dir, "docs/spec/PROPOSAL_ARSITEKTUR_SISTEM_JEV.pdf")

    # Step 1: Pandoc conversion
    print("Converting Markdown to Typst via Pandoc...")
    cmd = ["pandoc", md_path, "-f", "markdown+smart", "-t", "typst", "-o", raw_typ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("Pandoc failed:", res.stderr)
        sys.exit(1)

    with open(raw_typ, "r", encoding="utf-8") as f:
        body = f.read()

    # Step 3: Handle Pandoc symbols and clean Typst body
    # Pandoc macros
    body = body.replace("#horizontalrule", "#line(length: 100%, stroke: 0.5pt + rgb(\"#e2e8f0\"))")
    
    # Pandoc math symbols
    body = body.replace("sym.angle.l", "chevron.l").replace("sym.angle.r", "chevron.r")
    body = body.replace("angle.l", "chevron.l").replace("angle.r", "chevron.r")
    body = body.replace("sym.arrow.r.double.long", "==>")
    body = body.replace("sym.arrow.l.double.long", "<==")
    body = body.replace("sym.arrow.l.r.double.long", "<==>")
    body = body.replace("sym.arrow.r.long", "-->")
    body = body.replace("sym.arrow.l.long", "<--")

    # Step 4: Typst Document Template
    preamble = """#set document(
  title: "Proposal Arsitektur Sistem AI CV Screening & Ranking Berbasis Bukti",
  author: ("Alif Ihsan", "AI7 Solaris")
)

#set page(
  paper: "a4",
  margin: (top: 2.2cm, bottom: 2.2cm, left: 2.2cm, right: 2.2cm),
  header: text(8pt, fill: rgb("#64748b"), font: "Liberation Sans")[
    #grid(
      columns: (1fr, 1fr),
      align(left)[*Proposal Arsitektur Sistem* — AI CV Screening & Ranking],
      align(right)[AI7 Solaris • TypeSafe Jev System One]
    )
    #v(-3pt)
    #line(length: 100%, stroke: 0.4pt + rgb("#e2e8f0"))
  ],
  footer: context text(8pt, fill: rgb("#64748b"), font: "Liberation Sans")[
    #line(length: 100%, stroke: 0.4pt + rgb("#e2e8f0"))
    #v(3pt)
    #grid(
      columns: (1fr, 1fr),
      align(left)[Blueprint Sistem: `v2.0-Production-Proposal` | Klasifikasi: Engineering Proposal],
      align(right)[Halaman #counter(page).display() dari #counter(page).final().first()]
    )
  ]
)

#set text(
  font: "Liberation Sans",
  size: 9.5pt,
  fill: rgb("#1e293b"),
  spacing: 120%
)

#set par(justify: true, leading: 0.65em)

#show heading: set text(hyphenate: false)

#show heading.where(level: 1): it => block(
  above: 22pt, below: 10pt, breakable: false,
  [
    #text(font: "DejaVu Serif", size: 13.5pt, weight: "bold", fill: rgb("#0f172a"))[#it.body]
    #v(3pt)
    #line(length: 100%, stroke: 0.8pt + rgb("#cbd5e1"))
  ]
)

#show heading.where(level: 2): it => block(
  above: 15pt, below: 8pt, breakable: false,
  text(font: "Liberation Sans", size: 11pt, weight: "bold", fill: rgb("#1e293b"))[#it.body]
)

#show heading.where(level: 3): it => block(
  above: 12pt, below: 6pt, breakable: false,
  text(font: "Liberation Sans", size: 10pt, weight: "bold", fill: rgb("#334155"))[#it.body]
)

#let horizontalrule = line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
#let blockquote(body) = quote(body)

#show quote: it => block(
  fill: rgb("#f8fafc"),
  stroke: (left: 3.5pt + rgb("#2563eb")),
  radius: (right: 4pt),
  inset: (x: 10pt, y: 8pt),
  width: 100%,
  breakable: false,
  text(font: "Liberation Sans", size: 9pt, fill: rgb("#1e293b"))[#it.body]
)

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

#show raw.where(block: false): set text(font: "DejaVu Sans Mono", size: 8pt, fill: rgb("#0f172a"))

#show table: set table(
  stroke: (x, y) => if y == 0 { (bottom: 1.2pt + rgb("#94a3b8"), top: 0.5pt + rgb("#e2e8f0")) } else { 0.5pt + rgb("#e2e8f0") },
  fill: (col, row) => if row == 0 { rgb("#f8fafc") } else if calc.even(row) { rgb("#fcfcfd") } else { none },
  inset: (x: 8pt, y: 7pt)
)

// Document Title & Metadata Card
#v(-5pt)
#text(font: "DejaVu Serif", size: 20pt, weight: "bold", fill: rgb("#0f172a"), hyphenate: false)[
  Proposal Arsitektur & Rekayasa Sistem \\
  AI CV Screening & Ranking Berbasis Bukti
]
#v(4pt)
#text(font: "Liberation Sans", size: 10.5pt, fill: rgb("#475569"))[
  Evaluasi Semantik Terstruktur TypeSafe Jev System One & Perankingan Deterministik
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
    [#text(weight: "bold", fill: rgb("#475569"))[Penyusun:] Alif Ihsan (AI7 Solaris)],
    [#text(weight: "bold", fill: rgb("#475569"))[Klasifikasi:] Engineering Proposal / Technical Blueprint],
    [#text(weight: "bold", fill: rgb("#475569"))[Status:] Siap Dipresentasikan (Bimbingan)],
    [#text(weight: "bold", fill: rgb("#475569"))[Repositori:] `https://github.com/alifihsan7/ai-cv-screening-ranking.git`]
  )
]
#v(10pt)

#outline(title: [Daftar Isi], indent: 1.5em, depth: 2)
#v(1em)
#line(length: 100%, stroke: 0.5pt + rgb("#cbd5e1"))
#v(1.5em)
"""

    with open(final_typ, "w", encoding="utf-8") as f:
        f.write(preamble + body)

    print(f"Typst source generated at: {final_typ}")

    # Step 5: Compile with Typst
    print("Compiling Typst to PDF...")
    try:
        import typst
        typst.compile(final_typ, output=out_pdf)
        print(f"PDF successfully compiled to: {out_pdf}")
    except Exception as e:
        print("Typst Python compilation error, falling back to CLI:", e)
        cmd_typst = ["typst", "compile", final_typ, out_pdf]
        res_t = subprocess.run(cmd_typst, capture_output=True, text=True)
        if res_t.returncode != 0:
            print("Typst CLI failed:", res_t.stderr)
            sys.exit(1)
        print(f"PDF successfully compiled via CLI to: {out_pdf}")

if __name__ == "__main__":
    main()
