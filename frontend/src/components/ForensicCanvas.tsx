import React, { useState } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Terminal,
  Cpu,
  FileText,
  AlertCircle,
  Award,
  ChevronRight,
  Eye,
  FileCheck,
} from 'lucide-react'
import type { CandidateDetail, Requirement } from '../types'

export interface ForensicCanvasProps {
  candidate: CandidateDetail | null
  requirements: Requirement[]
  blindMode: boolean
  onDecision: (cv_id: string, decision: 'SHORTLIST' | 'HOLD' | 'TIDAK_LANJUT') => void
  onRevealCandidate?: (cv_id: string) => void
}

const getActionBadgeClass = (action: string) => {
  if (action.includes('Jev') || action.includes('GROUNDED_VERIFIER')) {
    return 'bg-[#E6F4EA] text-[#134E35] border-[#A5D6B6] font-bold'
  }
  if (action.includes('CRITIQUE') || action.includes('REFLECT')) {
    return 'bg-[#FEF6E8] text-[#8A4C05] border-[#F8D8A7] font-semibold'
  }
  if (action.includes('PARSER') || action.includes('DOCLING')) {
    return 'bg-[#EBF1EE] text-[#1B4938] border-[#D5DFD9] font-semibold'
  }
  if (action.includes('RETRIEVAL')) {
    return 'bg-[#EBF6EF] text-[#1B6C47] border-[#BBE5CD] font-semibold'
  }
  if (action.includes('DETERMINISTIC') || action.includes('SCORER')) {
    return 'bg-[#EBF1EE] text-[#13221C] border-[#D5DFD9] font-semibold'
  }
  if (action.includes('FINALIZE')) {
    return 'bg-[#E6F4EA] text-[#134E35] border-[#A5D6B6] font-semibold'
  }
  return 'bg-[#EBF1EE] text-[#40564D] border-[#D5DFD9] font-medium'
}

export const ForensicCanvas: React.FC<ForensicCanvasProps> = ({
  candidate,
  requirements,
  blindMode,
  onDecision,
  onRevealCandidate,
}) => {
  const [activeTab, setActiveTab] = useState<'trajectory' | 'grounding'>('trajectory')
  const [highlightedQuote, setHighlightedQuote] = useState<string | null>(null)

  if (!candidate) {
    return (
      <main className="flex-1 bg-[#FCFDFC] flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-[#EBF1EE] border border-[#D5DFD9] flex items-center justify-center text-[#1B4938] mb-4 shadow-tactile">
          <FileCheck className="w-8 h-8 text-[#1B4938]" />
        </div>
        <h3 className="text-base font-bold text-[#13221C] mb-1">
          Pilih Kandidat untuk Membuka Forensic Canvas
        </h3>
        <p className="text-xs text-[#40564D] max-w-md leading-relaxed">
          Gunakan panel di sebelah kiri untuk memilih kandidat, atau gunakan shortcut keyboard{' '}
          <span className="font-mono bg-[#EBF1EE] px-1 py-0.5 rounded text-[#13221C] border border-[#D5DFD9]">
            [J]
          </span>{' '}
          dan{' '}
          <span className="font-mono bg-[#EBF1EE] px-1 py-0.5 rounded text-[#13221C] border border-[#D5DFD9]">
            [K]
          </span>{' '}
          untuk navigasi cepat.
        </p>
      </main>
    )
  }

  const displayName = blindMode && !candidate.revealed ? candidate.blind_id : candidate.real_name
  const isJevVerified =
    candidate.verifier_provider === 'JEV_TYPESAFE' ||
    (candidate.reasoning_trajectory && candidate.reasoning_trajectory.length > 0)

  // Decile calculation
  const getDecileText = (score: number) => {
    if (score >= 90) return 'Desil 10 · Top 5%'
    if (score >= 85) return 'Desil 9 · Top 10%'
    if (score >= 75) return 'Desil 8 · Top 20%'
    if (score >= 65) return 'Desil 7 · Top 30%'
    if (score >= 50) return 'Desil 5 · Median'
    return 'Desil Bawah · Cek Manual'
  }

  const defaultCvText =
    candidate.full_text ||
    `${candidate.real_name.toUpperCase()}
Berkas: ${candidate.file_name}
Status Verifikasi: ${candidate.quality_status || 'VERIFIED'}

RINGKASAN BUKTI KUALIFIKASI:
${Object.entries(candidate.evidence || {})
  .flatMap(([reqId, items]) => items.map((i) => `• [${reqId}] ${i.quote}`))
  .join('\n') || 'Tidak ada kutipan bukti yang tercatat.'}

PENDIDIKAN & LATAR BELAKANG:
• Terverifikasi dalam kategori ${candidate.band} dengan skor total ${candidate.final_score.toFixed(1)}.`

  return (
    <main className="flex-1 bg-[#FCFDFC] flex flex-col h-full overflow-hidden select-none">
      {/* Persistent Canvas Header */}
      <header className="px-5 py-3 border-b border-[#D5DFD9] bg-[#FCFDFC] flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-tactile-sm">
        {/* Candidate Identity */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#EBF1EE] border border-[#D5DFD9] flex items-center justify-center font-mono font-bold text-sm text-[#1B4938] shadow-tactile-sm shrink-0">
            #{candidate.rank}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-[#13221C] truncate tracking-tight">
                {displayName}
              </h2>
              {blindMode && !candidate.revealed && onRevealCandidate && (
                <button
                  type="button"
                  onClick={() => onRevealCandidate(candidate.cv_id)}
                  className="h-5 px-1.5 rounded bg-[#F2F5F3] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[10px] font-semibold text-[#1B4938] flex items-center space-x-1 cursor-pointer"
                  title="Buka Identitas Kandidat (Audit Log)"
                >
                  <Eye className="w-2.5 h-2.5" />
                  <span>Reveal</span>
                </button>
              )}
              <span
                className={`font-mono text-[10px] px-1.5 py-0.2 rounded border font-semibold ${
                  candidate.band === 'A'
                    ? 'bg-[#EBF6EF] text-[#1B4938] border-[#BBE5CD]'
                    : candidate.band === 'B'
                    ? 'bg-[#FEF6E8] text-[#8A4C05] border-[#F8D8A7]'
                    : 'bg-[#FCEBEB] text-[#9E2A2B] border-[#F6C1C1]'
                }`}
              >
                Band {candidate.band}
              </span>
              {isJevVerified && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border font-semibold bg-[#E6F4EA] text-[#134E35] border-[#A5D6B6] flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-[#134E35]" />
                  <span>Jev Verified</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#40564D] font-mono truncate mt-0.5">
              {candidate.file_name} •{' '}
              <span className="text-[#13221C] font-semibold">{getDecileText(candidate.final_score)}</span>
            </p>
          </div>
        </div>

        {/* Right Header Area: Total Score Pill + Segmented Tactile Decision Switch */}
        <div className="flex items-center space-x-4">
          {/* Total Score Pill */}
          <div className="text-right">
            <div className="text-[10px] font-mono text-[#40564D] uppercase tracking-wider font-semibold">
              Skor Total
            </div>
            <div className="font-mono tabular-nums font-bold text-lg text-[#1B4938] leading-tight">
              {candidate.final_score.toFixed(1)}{' '}
              <span className="text-xs text-[#40564D] font-normal">/ 100</span>
            </div>
          </div>

          <div className="h-8 w-px bg-[#D5DFD9]" />

          {/* Segmented Tactile Decision Switch */}
          <div className="flex items-center bg-[#F2F5F3] p-1 rounded-xl border border-[#D5DFD9] shadow-tactile-sm">
            <button
              type="button"
              onClick={() => onDecision(candidate.cv_id, 'SHORTLIST')}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                candidate.decision === 'SHORTLIST'
                  ? 'bg-[#EBF6EF] text-[#1B6C47] border border-[#BBE5CD] shadow-tactile-sm'
                  : 'text-[#40564D] hover:text-[#13221C] hover:bg-[#EBF1EE]'
              }`}
              title="Disarankan untuk tahap wawancara (Shortcut: 'S')"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1B6C47]" />
              <span>Shortlist</span>
            </button>

            <button
              type="button"
              onClick={() => onDecision(candidate.cv_id, 'HOLD')}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                candidate.decision === 'HOLD'
                  ? 'bg-[#FEF6E8] text-[#8A4C05] border border-[#F8D8A7] shadow-tactile-sm'
                  : 'text-[#40564D] hover:text-[#13221C] hover:bg-[#EBF1EE]'
              }`}
              title="Simpan sementara di Talent Pool (Shortcut: 'H')"
            >
              <Clock className="w-3.5 h-3.5 text-[#8A4C05]" />
              <span>Hold</span>
            </button>

            <button
              type="button"
              onClick={() => onDecision(candidate.cv_id, 'TIDAK_LANJUT')}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                candidate.decision === 'TIDAK_LANJUT'
                  ? 'bg-[#FCEBEB] text-[#9E2A2B] border border-[#F6C1C1] shadow-tactile-sm'
                  : 'text-[#40564D] hover:text-[#13221C] hover:bg-[#EBF1EE]'
              }`}
              title="Tidak lanjut ke tahap berikutnya (Shortcut: 'X')"
            >
              <XCircle className="w-3.5 h-3.5 text-[#9E2A2B]" />
              <span>Tidak Lanjut</span>
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable Canvas Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Category Breakdown & Radar Metrics Strip */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(candidate.category_breakdown || {}).map(([cat, score]) => (
            <div
              key={cat}
              className="bg-[#F5F8F6] border border-[#D5DFD9] rounded-xl p-3 shadow-tactile-sm"
            >
              <span className="block text-[10px] font-mono text-[#40564D] font-bold uppercase tracking-wider truncate">
                {cat.replace('_', ' ')}
              </span>
              <div className="font-mono tabular-nums font-bold text-base text-[#13221C] mt-0.5">
                {typeof score === 'number' ? score.toFixed(1) : score}
              </div>
            </div>
          ))}
        </section>

        {/* Breakdown Evaluasi per Kriteria */}
        <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 shadow-tactile space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E9E5] pb-2">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#1B4938]" />
              <h3 className="text-xs font-bold text-[#13221C] uppercase tracking-wider">
                Verifikasi Pemenuhan Kriteria ({requirements.length} Syarat)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#40564D]">
              Tipe-Aman Deterministik
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EBF1EE] text-[#40564D] font-semibold uppercase tracking-wider border-b border-[#D5DFD9]">
                <tr>
                  <th className="py-2 px-3 w-14 font-mono">ID</th>
                  <th className="py-2 px-3">Kriteria</th>
                  <th className="py-2 px-3 w-16 text-center font-mono">Bobot</th>
                  <th className="py-2 px-3 w-32 text-center">Status Bukti</th>
                  <th className="py-2 px-3">Bukti Verbatim CV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E9E5]">
                {requirements.map((r) => {
                  const state = candidate.requirement_states[r.requirement_id] || 'NOT_DEMONSTRATED'
                  const evList = candidate.evidence[r.requirement_id] || []
                  const evidenceQuote = evList[0]?.quote

                  return (
                    <tr
                      key={r.requirement_id}
                      className="hover:bg-[#EBF1EE]/50 transition-colors"
                    >
                      <td className="py-2 px-3 font-mono font-bold text-[#1B4938]">
                        {r.requirement_id}
                      </td>
                      <td className="py-2 px-3 font-medium text-[#13221C]">
                        {r.description}
                      </td>
                      <td className="py-2 px-3 text-center font-mono tabular-nums text-[#40564D]">
                        {r.weight}%
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            state === 'STRONG'
                              ? 'bg-[#EBF6EF] text-[#1B6C47] border border-[#BBE5CD]'
                              : state === 'PARTIAL'
                              ? 'bg-[#FEF6E8] text-[#8A4C05] border border-[#F8D8A7]'
                              : 'bg-[#FCEBEB] text-[#9E2A2B] border border-[#F6C1C1]'
                          }`}
                        >
                          {state === 'STRONG'
                            ? 'Terbukti'
                            : state === 'PARTIAL'
                            ? 'Sebagian'
                            : 'Tidak Tercantum'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-[#40564D]">
                        {evidenceQuote ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('grounding')
                              setHighlightedQuote(evidenceQuote)
                            }}
                            className="text-left hover:text-[#1B4938] hover:underline cursor-pointer flex items-center space-x-1"
                            title="Klik untuk membuka di Grounding View"
                          >
                            <span className="truncate max-w-[260px]">&quot;{evidenceQuote}&quot;</span>
                            <ChevronRight className="w-3 h-3 text-[#1B4938] shrink-0" />
                          </button>
                        ) : (
                          <span className="text-[#40564D]/50 italic">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Strengths & Verification Concerns + Interview Questions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kelebihan Terbukti */}
          <div className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 shadow-tactile space-y-3">
            <div className="flex items-center space-x-2 text-[#1B6C47] border-b border-[#E2E9E5] pb-2">
              <CheckCircle2 className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#13221C]">
                Kelebihan Terbukti (Verified Strengths)
              </h4>
            </div>
            <div className="space-y-2">
              {candidate.explanation.strengths && candidate.explanation.strengths.length > 0 ? (
                candidate.explanation.strengths.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#EBF6EF]/50 border border-[#BBE5CD] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-[#1B6C47]">
                        {s.requirement_id} • Bobot {s.weight}%
                      </span>
                    </div>
                    <p className="font-semibold text-[#13221C]">{s.description}</p>
                    {s.quote && (
                      <p className="font-mono text-[11px] text-[#134E35] italic">
                        &quot;{s.quote}&quot;
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#40564D] italic">
                  Belum ada bukti keunggulan signifikan yang terverifikasi kuat.
                </p>
              )}
            </div>
          </div>

          {/* Area Butuh Verifikasi & Pertanyaan Wawancara */}
          <div className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 shadow-tactile space-y-3">
            <div className="flex items-center space-x-2 text-[#8A4C05] border-b border-[#E2E9E5] pb-2">
              <AlertCircle className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#13221C]">
                Area Butuh Verifikasi & Pertanyaan Wawancara
              </h4>
            </div>
            <div className="space-y-2">
              {candidate.explanation.interview_questions &&
              candidate.explanation.interview_questions.length > 0 ? (
                candidate.explanation.interview_questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#FEF6E8]/50 border border-[#F8D8A7] text-xs space-y-1"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-[10px] font-bold text-[#8A4C05]">
                        [{q.requirement_id}]
                      </span>
                      <span className="font-semibold text-[#13221C]">{q.focus}</span>
                    </div>
                    <p className="text-[#40564D] text-xs leading-relaxed">
                      💡 <em>{q.question}</em>
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#40564D] italic">
                  Kandidat memenuhi semua kualifikasi utama. Tidak ada defisit teridentifikasi.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Dual Tab Section: ReAct Trajectory Rail OR Kutipan CV Asli (Grounding View) */}
        <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-5 shadow-tactile space-y-4">
          {/* Tab Switcher */}
          <div className="flex items-center justify-between border-b border-[#D5DFD9] pb-3">
            <div className="flex items-center space-x-2 bg-[#EBF1EE] p-1 rounded-xl border border-[#D5DFD9]">
              <button
                type="button"
                onClick={() => setActiveTab('trajectory')}
                className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  activeTab === 'trajectory'
                    ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
                    : 'text-[#40564D] hover:text-[#13221C]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-[#1B4938]" />
                <span>Forensic ReAct Trajectory Rail</span>
                {candidate.reasoning_trajectory && candidate.reasoning_trajectory.length > 0 && (
                  <span className="font-mono tabular-nums text-[10px] bg-[#EBF1EE] text-[#134E35] font-bold px-1 rounded">
                    {candidate.reasoning_trajectory.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('grounding')}
                className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  activeTab === 'grounding'
                    ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
                    : 'text-[#40564D] hover:text-[#13221C]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>Kutipan CV Asli (Grounding View)</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E6F4EA] text-[#134E35] font-mono text-xs border border-[#A5D6B6] shadow-tactile-sm font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-[#134E35]" />
                <span>Verifier: <strong>{candidate.verifier_provider || 'JEV_TYPESAFE'}</strong></span>
              </span>
            </div>
          </div>

          {/* Tab 1: Forensic ReAct Trajectory Rail */}
          {activeTab === 'trajectory' && (
            <div className="space-y-4">
              <p className="text-xs text-[#40564D]">
                Audit jejak penalaran agen otonom & verifikasi tipe-aman Jev langkah demi langkah
                secara deterministik.
              </p>

              {!candidate.reasoning_trajectory || candidate.reasoning_trajectory.length === 0 ? (
                <div className="bg-[#F5F8F6] border border-dashed border-[#D5DFD9] p-8 rounded-xl text-center space-y-2">
                  <div className="w-9 h-9 mx-auto rounded-lg bg-[#EBF1EE] border border-[#D5DFD9] flex items-center justify-center text-[#40564D] font-mono text-xs font-bold">
                    ∅
                  </div>
                  <p className="font-semibold text-[#13221C] text-xs">
                    Belum Ada Rekaman ReAct Trajectory
                  </p>
                  <p className="text-[#40564D] text-[11px] max-w-md mx-auto leading-relaxed">
                    Kandidat ini belum memiliki jejak eksekusi reasoning bertahap. Verifier Jev
                    mengevaluasi profil menggunakan aturan tipe-aman deterministik.
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-[#D5DFD9] ml-4 pl-6 space-y-6 pt-2 pb-2">
                  {candidate.reasoning_trajectory.map((step) => (
                    <div
                      key={step.step_number}
                      className="relative bg-[#F5F8F6] border border-[#D5DFD9] rounded-xl p-4 space-y-3 hover:border-[#1B4938]/40 transition-colors shadow-tactile-sm"
                    >
                      {/* Vertical Rail Step Node Marker (Tactile Nordic Pine Node) */}
                      <div className="absolute -left-[35px] top-4 w-7 h-7 rounded-full bg-[#FCFDFC] border-2 border-[#1B4938] text-[#1B4938] font-mono text-[11px] font-bold flex items-center justify-center shadow-tactile-sm">
                        {String(step.step_number).padStart(2, '0')}
                      </div>

                      {/* Step Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-bold bg-[#EBF1EE] text-[#13221C] px-2.5 py-0.5 rounded-md border border-[#D5DFD9] shadow-tactile-sm">
                            Step {String(step.step_number).padStart(2, '0')}
                          </span>
                          <span
                            className={`font-mono text-[10px] px-2 py-0.5 rounded border shadow-tactile-sm tracking-tight ${getActionBadgeClass(
                              step.action
                            )}`}
                          >
                            {step.action}
                          </span>
                        </div>
                        {step.timestamp_utc && (
                          <span className="font-mono text-[10px] text-[#40564D] tabular-nums flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#40564D]/60" />
                            {step.timestamp_utc.replace('T', ' ').replace('Z', ' UTC')}
                          </span>
                        )}
                      </div>

                      {/* Thought Context */}
                      <div className="bg-[#FCFDFC] p-3 rounded-lg border border-[#D5DFD9] space-y-1 shadow-tactile-sm">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#1B4938] uppercase tracking-wider">
                          <Cpu className="w-3 h-3 text-[#1B4938]" />
                          <span>Thought Context</span>
                        </div>
                        <p className="text-[#13221C] text-xs leading-relaxed font-normal">
                          {step.thought}
                        </p>
                      </div>

                      {/* Action Input (if present) */}
                      {step.action_input && Object.keys(step.action_input).length > 0 && (
                        <div className="bg-[#EBF1EE] p-3 rounded-lg border border-[#D5DFD9] font-mono text-xs text-[#13221C] overflow-x-auto space-y-1">
                          <span className="text-[#40564D] block text-[10px] font-bold uppercase tracking-wider">
                            // Action Input
                          </span>
                          <pre className="whitespace-pre-wrap leading-tight text-[#13221C] font-mono text-[11px]">
                            {JSON.stringify(step.action_input, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Observation (Verbatim Evidence Box in Soft Mint Sage) */}
                      <div className="bg-[#E6F4EA] text-[#134E35] border border-[#A5D6B6] p-3 rounded-lg space-y-1.5 font-mono text-xs shadow-tactile-sm">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#134E35] uppercase tracking-wider">
                          <Terminal className="w-3 h-3 text-[#134E35]" />
                          <span>Observation (Verbatim CV Grounding)</span>
                        </div>
                        <p className="font-mono text-xs text-[#134E35] leading-relaxed whitespace-pre-wrap">
                          {step.observation}
                        </p>
                      </div>

                      {/* State Mutation */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#D5DFD9] text-[10px]">
                        <span className="font-semibold text-[#40564D] uppercase tracking-wider text-[10px]">
                          State Mutation:
                        </span>
                        <span className="font-mono font-medium text-[#1B6C47] bg-[#EBF6EF] px-2.5 py-0.5 rounded-md border border-[#BBE5CD] text-xs shadow-tactile-sm">
                          {step.state_mutation}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Kutipan CV Asli (Grounding View) */}
          {activeTab === 'grounding' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-[#F5F8F6] p-2.5 rounded-xl border border-[#D5DFD9] text-xs">
                <span className="font-mono text-[#40564D]">
                  Berkas Asli: <strong>{candidate.file_name}</strong>
                </span>
                {highlightedQuote && (
                  <div className="flex items-center space-x-2">
                    <span className="bg-[#E6F4EA] text-[#134E35] border border-[#A5D6B6] px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                      Menyorot Kutipan Kriteria
                    </span>
                    <button
                      type="button"
                      onClick={() => setHighlightedQuote(null)}
                      className="text-[#40564D] hover:text-[#13221C] text-[10px] underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#F2F5F3] text-[#13221C] rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto border border-[#D5DFD9] shadow-inner">
                {defaultCvText}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
