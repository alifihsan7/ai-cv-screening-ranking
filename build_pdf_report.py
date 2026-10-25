import re
from pathlib import Path

raw_typ_path = Path("/tmp/body_raw.typ")
output_typ_path = Path("/home/alifihsan/agentic-cv-screener/docs/research/AI_CV_SCREENER_RESEARCH_REPORT.typ")

content = raw_typ_path.read_text(encoding="utf-8")

# Sanitization per publication-pdf-reports skill:
content = content.replace("angle.l", "chevron.l").replace("angle.r", "chevron.r")
content = content.replace("arrow.r.double.long", "==>")

# Cut off everything before "== 1. ABSTRAK & RINGKASAN EKSEKUTIF"
pos_abstrak = content.find("== 1. ABSTRAK & RINGKASAN EKSEKUTIF")
if pos_abstrak != -1:
    body_content = content[pos_abstrak:]
else:
    body_content = content

# Promote headings:
# === -> ==
# == -> =
# We can do this cleanly line by line
lines = []
for line in body_content.splitlines():
    if line.startswith("==== "):
        lines.append("=== " + line[5:])
    elif line.startswith("=== "):
        lines.append("== " + line[4:])
    elif line.startswith("== "):
        lines.append("= " + line[3:])
    else:
        lines.append(line)

sanitized_body = "\n".join(lines)

typst_preamble = """
#set document(
  title: "Laporan Riset & Rekayasa Sistem: AI CV Screener",
  author: ("Alif Ihsan", "AI7 Solaris")
)

#set page(
  paper: "a4",
  margin: (top: 2.2cm, bottom: 2.2cm, left: 2.0cm, right: 2.0cm),
  header: text(8pt, fill: rgb("#64748b"), font: "Liberation Sans")[
    #grid(
      columns: (1fr, 1fr),
      align(left)[*AI CV Screener* — Spesifikasi Rekayasa & Riset Sistem],
      align(right)[AI7 Solaris Engineering Ecosystem]
    )
    #v(-3pt)
    #line(length: 100%, stroke: 0.4pt + rgb("#e2e8f0"))
  ],
  footer: context text(8pt, fill: rgb("#64748b"), font: "Liberation Sans")[
    #line(length: 100%, stroke: 0.4pt + rgb("#e2e8f0"))
    #v(3pt)
    #grid(
      columns: (1fr, 1fr),
      align(left)[Blueprint Sistem: `v2.0-Production-Agentic` | Mode: Implemented & Roadmap],
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
    #text(font: "Liberation Sans", size: 13pt, weight: "bold", fill: rgb("#0f172a"))[#it.body]
    #v(3pt)
    #line(length: 100%, stroke: 0.8pt + rgb("#cbd5e1"))
  ]
)

#show heading.where(level: 2): it => block(
  above: 15pt, below: 8pt, breakable: false,
  text(font: "Liberation Sans", size: 10.8pt, weight: "bold", fill: rgb("#1e293b"))[#it.body]
)

#show heading.where(level: 3): it => block(
  above: 12pt, below: 6pt, breakable: false,
  text(font: "Liberation Sans", size: 9.8pt, weight: "bold", fill: rgb("#334155"))[#it.body]
)

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
  stroke: 0.5pt + rgb("#cbd5e1"),
  radius: 4pt,
  inset: (x: 8pt, y: 6pt),
  width: 100%,
  breakable: true,
  [
    #set par(leading: 0.30em)
    #set text(font: "DejaVu Sans Mono", size: 6.8pt, fill: rgb("#0f172a"))
    #it
  ]
)

#show raw.where(block: false): set text(font: "DejaVu Sans Mono", size: 8pt, fill: rgb("#0f172a"))

#show table: set table(
  stroke: (x, y) => if y == 0 { (bottom: 1.2pt + rgb("#94a3b8"), top: 0.5pt + rgb("#e2e8f0")) } else { 0.5pt + rgb("#e2e8f0") },
  fill: (col, row) => if row == 0 { rgb("#f1f5f9") } else if calc.even(row) { rgb("#f8fafc") } else { none },
  inset: (x: 8pt, y: 7pt)
)

#let horizontalrule = line(length: 100%, stroke: 0.5pt + rgb("#e2e8f0"))
#let blockquote(body) = quote(body)

// Title Banner & Executive Metadata Card
#v(-5pt)
#text(font: "Liberation Sans", size: 18pt, weight: "bold", fill: rgb("#0f172a"), hyphenate: false)[
  ARSITEKTUR & RISET SISTEM AI CV SCREENER
]
#v(2pt)
#text(font: "Liberation Sans", size: 10.5pt, weight: "medium", fill: rgb("#475569"))[
  Cetak Biru Rekayasa Perangkat Lunak: Implementasi Nyata & Rencana Pengembangan Masa Depan
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
    columns: (1.1fr, 1.3fr),
    row-gutter: 6pt,
    [#text(weight: "bold", fill: rgb("#475569"))[Penyusun:] Alif Ihsan],
    [#text(weight: "bold", fill: rgb("#475569"))[Klasifikasi:] Cetak Biru Rekayasa Perangkat Lunak],
    [#text(weight: "bold", fill: rgb("#475569"))[Afiliasi:] AI7 Solaris Ecosystem],
    [#text(weight: "bold", fill: rgb("#475569"))[Repositori:] `agentic-cv-screener`],
    [#text(weight: "bold", fill: rgb("#475569"))[Status Komponen:] *Eksisting (Aktif)* & *Rencana (Jev / Scaled DB)*],
    [#text(weight: "bold", fill: rgb("#475569"))[Versi:] `v2.0-Production-Agentic`]
  )
]
#v(10pt)

#outline(
  title: [DAFTAR ISI & STRUKTUR LAPORAN],
  indent: 1.5em,
  depth: 2
)
#v(10pt)
#horizontalrule
#v(10pt)
"""

full_typst = typst_preamble + "\n" + sanitized_body

output_typ_path.write_text(full_typst, encoding="utf-8")
print(f"Typst markup written to {output_typ_path} ({len(full_typst)} chars)")
