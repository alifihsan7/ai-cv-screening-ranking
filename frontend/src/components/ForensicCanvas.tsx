import React from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  CircleDot,
  Award,
  Eye,
  FileCheck,
  AlertTriangle,
  ChevronRight,
  MessageSquare,
} from 'lucide-react'
import type { CandidateDetail, Requirement } from '../types'
import {
  ScreeningTelemetryPanel,
  DualLayerCriterionBadge,
  VerbatimGroundingChip,
} from './ScreeningTelemetryPanel'
import { getScreeningTelemetry, isVerbatimGrounded } from '../utils/telemetry'

export interface ForensicCanvasProps {
  candidate: CandidateDetail | null
  requirements: Requirement[]
  blindMode: boolean
  onDecision: (
    cv_id: string,
    decision: 'SHORTLIST' | 'HOLD' | 'TIDAK_LANJUT' | 'NONE'
  ) => void
  onRevealCandidate?: (cv_id: string) => void
  onOpenAuditDrawer?: (tab?: 'trajectory' | 'grounding', quote?: string) => void
}

export const ForensicCanvas: React.FC<ForensicCanvasProps> = ({
  candidate,
  requirements,
  blindMode,
  onDecision,
  onRevealCandidate,
  onOpenAuditDrawer,
}) => {
  if (!candidate) {
    return (
      <main className="flex-1 bg-[#FCFDFC] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#EBF1EE] border border-[#D5DFD9] flex items-center justify-center text-[#1B4938] mb-4 shadow-tactile">
          <FileCheck className="w-8 h-8 text-[#1B4938]" />
        </div>
        <h3 className="text-base font-bold text-[#13221C] mb-1">
          Pilih Kandidat untuk Membuka Forensic Canvas
        </h3>
        <p className="text-xs text-[#2D4439] max-w-md leading-relaxed">
          Pilih kandidat di panel sebelah kiri untuk melihat evaluasi forensik dan telemetri verifikasi.
        </p>
      </main>
    )
  }

  const displayName =
    blindMode && !candidate.revealed ? candidate.blind_id : candidate.real_name

  const telemetry = getScreeningTelemetry(candidate, requirements)

  const getDecileText = (score: number) => {
    if (score >= 90) return 'Desil 10 · Top 5%'
    if (score >= 85) return 'Desil 9 · Top 10%'
    if (score >= 75) return 'Desil 8 · Top 20%'
    if (score >= 65) return 'Desil 7 · Top 30%'
    if (score >= 50) return 'Desil 5 · Median'
    return 'Desil Bawah · Cek Manual'
  }

  // Must-have requirements status check
  const mustHaveReqs = requirements.filter((r) => r.importance === 'MUST_HAVE')
  const mustHaveFulfilled = mustHaveReqs.filter(
    (r) => candidate.requirement_states[r.requirement_id] === 'STRONG'
  )
  const mustHavePartialOrUnproven = mustHaveReqs.filter(
    (r) => candidate.requirement_states[r.requirement_id] !== 'STRONG'
  )
  const allMustHavesMet = mustHavePartialOrUnproven.length === 0

  return (
    <main className="flex-1 bg-[#FCFDFC] flex flex-col h-full overflow-hidden">
      {/* Persistent Canvas Header */}
      <header className="px-5 py-3 border-b border-[#D5DFD9] bg-[#FCFDFC] flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-tactile-sm">
        {/* Candidate Identity + Action Button [ 🛡️ Buka Audit AI ] */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-[#EBF1EE] border border-[#D5DFD9] flex items-center justify-center font-mono font-bold text-sm text-[#1B4938] shadow-tactile-sm shrink-0">
            #{candidate.rank}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 min-w-0">
              <h2
                className="text-sm font-bold text-[#13221C] truncate tracking-tight"
                title={displayName}
              >
                {displayName}
              </h2>
              {blindMode && !candidate.revealed && onRevealCandidate && (
                <button
                  type="button"
                  onClick={() => onRevealCandidate(candidate.cv_id)}
                  className="h-5 px-1.5 rounded bg-[#F2F5F3] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[10px] font-semibold text-[#1B4938] flex items-center space-x-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1B4938] shrink-0"
                  title="Buka Identitas Kandidat (Audit Log)"
                >
                  <Eye className="w-2.5 h-2.5 shrink-0" />
                  <span>Reveal</span>
                </button>
              )}
              <span
                className={`font-mono text-[10px] px-1.5 py-0.2 rounded border font-bold shrink-0 ${
                  candidate.band === 'A'
                    ? 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD]'
                    : candidate.band === 'B'
                    ? 'bg-[#FEF6E8] text-[#7A3E02] border-[#F8D8A7]'
                    : 'bg-[#FCEBEB] text-[#8C1819] border-[#F6C1C1]'
                }`}
              >
                Band {candidate.band}
              </span>
              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded border font-bold bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD] shadow-tactile-sm shrink-0">
                {telemetry.scoring_mode}
              </span>

              {/* Tactile Action Button: Buka Audit AI */}
              <button
                type="button"
                onClick={() => onOpenAuditDrawer?.('trajectory')}
                className="bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD] hover:bg-[#DEF0E4] transition-all flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer shadow-tactile-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] shrink-0"
                title="Buka Slide-Over Audit Telemetri AI"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#124B2E] shrink-0" />
                <span className="whitespace-nowrap">Buka Audit AI</span>
              </button>
            </div>
            <p
              className="text-[11px] text-[#2D4439] font-mono flex items-center gap-1.5 truncate mt-0.5"
              title={`${candidate.file_name} • ${getDecileText(candidate.final_score)}`}
            >
              <span className="truncate">{candidate.file_name}</span>
              <span className="shrink-0 text-[#8C9B93]">•</span>
              <span className="shrink-0 text-[#13221C] font-semibold whitespace-nowrap">
                {getDecileText(candidate.final_score)}
              </span>
            </p>
          </div>
        </div>

        {/* Right Header Area: Total Score Pill + Segmented Tactile Decision Switch */}
        <div className="flex items-center space-x-4 shrink-0">
          {/* Total Score Pill */}
          <div className="text-right shrink-0">
            <div className="text-[10px] font-mono text-[#2D4439] uppercase tracking-wider font-bold">
              Skor Total
            </div>
            <div className="font-mono tabular-nums font-bold text-lg text-[#1B4938] leading-tight">
              {candidate.final_score.toFixed(1)}{' '}
              <span className="text-xs text-[#2D4439] font-normal">/ 100</span>
            </div>
          </div>

          <div className="h-8 w-px bg-[#D5DFD9] shrink-0" />

          {/* Segmented Tactile Decision Switch */}
          <div className="flex items-center bg-[#F2F5F3] p-1 rounded-xl border border-[#D5DFD9] shadow-tactile-sm shrink-0">
            {/* Belum Diputuskan */}
            <button
              type="button"
              onClick={() => onDecision(candidate.cv_id, 'NONE')}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center space-x-1.5 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4439] shrink-0 ${
                !candidate.decision || candidate.decision === 'NONE'
                  ? 'bg-[#EBF1EE] text-[#13221C] border border-[#D5DFD9] shadow-tactile-sm'
                  : 'text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-transparent'
              }`}
              title="Belum Diputuskan (Status Awal / Reset)"
            >
              <CircleDot className="w-3.5 h-3.5 text-[#2D4439] shrink-0" />
              <span>Belum Diputuskan</span>
            </button>

            <button
              type="button"
              onClick={() => onDecision(candidate.cv_id, 'SHORTLIST')}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center space-x-1.5 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124B2E] shrink-0 ${
                candidate.decision === 'SHORTLIST'
                  ? 'bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD] shadow-tactile-sm'
                  : 'text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-transparent'
              }`}
              title="Disarankan untuk tahap wawancara"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#124B2E] shrink-0" />
              <span>Shortlist</span>
            </button>

            <button
              type="button"
              onClick={() => onDecision(candidate.cv_id, 'HOLD')}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center space-x-1.5 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3E02] shrink-0 ${
                candidate.decision === 'HOLD'
                  ? 'bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7] shadow-tactile-sm'
                  : 'text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-transparent'
              }`}
              title="Simpan sementara di Talent Pool"
            >
              <Clock className="w-3.5 h-3.5 text-[#7A3E02] shrink-0" />
              <span>Hold</span>
            </button>

            <button
              type="button"
              onClick={() => onDecision(candidate.cv_id, 'TIDAK_LANJUT')}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center space-x-1.5 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1819] shrink-0 ${
                candidate.decision === 'TIDAK_LANJUT'
                  ? 'bg-[#FCEBEB] text-[#8C1819] border border-[#F6C1C1] shadow-tactile-sm'
                  : 'text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-transparent'
              }`}
              title="Tidak lanjut ke tahap berikutnya"
            >
              <XCircle className="w-3.5 h-3.5 text-[#8C1819] shrink-0" />
              <span>Tidak Lanjut</span>
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable Canvas Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Screening Telemetry Avionics HUD */}
        <ScreeningTelemetryPanel telemetry={telemetry} />

        {/* 1. RINGKASAN EKSEKUTIF (Executive Summary) */}
        <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 sm:p-5 shadow-tactile space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E9E5] pb-3">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#1B4938]" />
              <h3 className="text-xs font-bold text-[#13221C] uppercase tracking-wider">
                Ringkasan Eksekutif (Executive Summary)
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-[#2D4439]">
                Saran Rekomendasi (Decision-Support):{' '}
                <strong className="text-[#13221C]">
                  {candidate.recommendation.replace('_', ' ')}
                </strong>
              </span>
            </div>
          </div>

          {/* Must-Have Requirements Fulfilment Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#F5F8F6] border border-[#D5DFD9]">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#13221C]">
                Kualifikasi Wajib (Must-Have):
              </span>
              {allMustHavesMet ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#124B2E]" />
                  Semua Terpenuhi ({mustHaveReqs.length}/{mustHaveReqs.length})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#7A3E02]" />
                  {mustHavePartialOrUnproven.length} Syarat Perlu Perhatian ({mustHaveFulfilled.length}/
                  {mustHaveReqs.length})
                </span>
              )}
            </div>

            <span className="text-[11px] font-mono text-[#2D4439] font-medium">
              Evaluasi Forensik AI
            </span>
          </div>

          {/* Top Verified Strengths Grid */}
          {candidate.explanation.strengths && candidate.explanation.strengths.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#13221C] uppercase tracking-wider block">
                Keunggulan Utama Terverifikasi
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {candidate.explanation.strengths.slice(0, 4).map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#EBF6EF]/50 border border-[#BBE5CD] text-xs space-y-1 shadow-tactile-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-[#124B2E]">
                        {s.requirement_id} • Bobot {s.weight}%
                      </span>
                    </div>
                    <p className="font-semibold text-[#13221C]">{s.description}</p>
                    {s.quote && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <VerbatimGroundingChip isGrounded={true} />
                        <p className="font-mono text-[11px] text-[#124B2E] italic truncate">
                          &quot;{s.quote}&quot;
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catatan Defisit & Flags (jika ada) */}
          {((candidate.flags && candidate.flags.length > 0) ||
            (candidate.explanation.unproven && candidate.explanation.unproven.length > 0)) && (
            <div className="p-3 rounded-xl bg-[#FEF6E8] border border-[#F8D8A7] text-xs space-y-2 shadow-tactile-sm">
              <div className="flex items-center space-x-1.5 text-[#7A3E02] font-bold">
                <AlertTriangle className="w-4 h-4 text-[#7A3E02] shrink-0" />
                <span>Catatan Defisit & Indikasi Verifikasi:</span>
              </div>
              <div className="space-y-1 text-[#13221C]">
                {candidate.flags &&
                  candidate.flags.map((flag, idx) => (
                    <div key={`flag-${idx}`} className="flex items-center gap-1.5 text-xs text-[#7A3E02]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7A3E02]" />
                      <span>
                        Flag Integritas: <strong>{flag}</strong>
                      </span>
                    </div>
                  ))}
                {candidate.explanation.unproven &&
                  candidate.explanation.unproven.map((u, idx) => (
                    <div
                      key={`unproven-${idx}`}
                      className="flex items-start gap-1.5 text-xs text-[#7A3E02]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7A3E02] mt-1 shrink-0" />
                      <span>
                        <strong>
                          [{u.requirement_id}] {u.description}
                        </strong>
                        : {u.note}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>

        {/* 2. MATRIKS KUALIFIKASI & BUKTI TERPADU */}
        <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 sm:p-5 shadow-tactile space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E9E5] pb-3">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#1B4938]" />
              <h3 className="text-xs font-bold text-[#13221C] uppercase tracking-wider">
                Matriks Kualifikasi & Bukti Terpadu ({requirements.length} Kriteria)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#2D4439] font-medium">
              Kutipan Verbatim CV Langsung
            </span>
          </div>

          <div className="space-y-3">
            {requirements.map((r) => {
              const state =
                candidate.requirement_states[r.requirement_id] || 'NOT_DEMONSTRATED'
              const evList = candidate.evidence[r.requirement_id] || []
              const evidenceQuote = evList[0]?.quote

              return (
                <div
                  key={r.requirement_id}
                  className="p-3.5 rounded-xl bg-[#FCFDFC] hover:bg-[#F5F8F6] border border-[#D5DFD9] hover:border-[#1B4938]/40 space-y-2 transition-all shadow-tactile-sm"
                >
                  {/* Kriteria Title Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0 flex-wrap">
                      <span className="font-mono font-bold text-xs text-[#1B4938] bg-[#EBF1EE] px-2 py-0.5 rounded border border-[#D5DFD9]">
                        {r.requirement_id}
                      </span>
                      <DualLayerCriterionBadge req={r} />
                      <span className="font-semibold text-xs text-[#13221C]">
                        {r.description}
                      </span>
                      {r.importance === 'MUST_HAVE' && (
                        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7]">
                          Wajib
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-mono text-xs tabular-nums text-[#2D4439]">
                        Bobot: <strong>{r.weight}%</strong>
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          state === 'STRONG'
                            ? 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD]'
                            : state === 'PARTIAL'
                            ? 'bg-[#FEF6E8] text-[#7A3E02] border-[#F8D8A7]'
                            : 'bg-[#FCEBEB] text-[#8C1819] border-[#F6C1C1]'
                        }`}
                      >
                        {state === 'STRONG'
                          ? 'Terbukti'
                          : state === 'PARTIAL'
                          ? 'Sebagian'
                          : 'Tidak Tercantum'}
                      </span>
                    </div>
                  </div>

                  {/* Kutipan Verbatim CV Terpadu di Bawah Kriteria */}
                  {evidenceQuote ? (
                    <div className="mt-1 pl-3 border-l-2 border-[#1B4938] bg-[#F5F8F6] p-2.5 rounded-r-lg space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <VerbatimGroundingChip isGrounded={isVerbatimGrounded(evidenceQuote, candidate.full_text)} />
                        <button
                          type="button"
                          onClick={() => onOpenAuditDrawer?.('grounding', evidenceQuote)}
                          className="shrink-0 text-[10px] font-bold text-[#1B4938] hover:text-[#124B2E] underline cursor-pointer flex items-center gap-1 transition-colors"
                          title="Buka kutipan ini di Audit Drawer CV"
                        >
                          <span>Lihat di CV</span>
                          <ChevronRight className="w-3 h-3 text-[#1B4938]" />
                        </button>
                      </div>
                      <p className="font-mono text-[11px] text-[#124B2E] leading-relaxed select-text">
                        &ldquo;{evidenceQuote}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1 pl-3 border-l-2 border-[#D5DFD9] py-1 text-[11px] text-[#2D4439]/70 italic font-mono">
                      Tidak ditemukan kutipan eksplisit dalam berkas CV untuk kriteria ini.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* 3. PANDUAN PERTANYAAN WAWANCARA TERARAH */}
        <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 sm:p-5 shadow-tactile space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E9E5] pb-2">
            <div className="flex items-center space-x-2 text-[#7A3E02]">
              <MessageSquare className="w-4 h-4 text-[#7A3E02]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#13221C]">
                Panduan Pertanyaan Wawancara Terarah
              </h4>
            </div>
            <span className="text-[10px] font-mono text-[#2D4439] font-medium">
              Validasi Kualifikasi Kritis
            </span>
          </div>

          <div className="space-y-2.5">
            {candidate.explanation.interview_questions &&
            candidate.explanation.interview_questions.length > 0 ? (
              candidate.explanation.interview_questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#FEF6E8]/50 border border-[#F8D8A7] text-xs space-y-1.5 shadow-tactile-sm"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] font-bold text-[#7A3E02] bg-[#FEF6E8] px-1.5 py-0.5 rounded border border-[#F8D8A7]">
                      [{q.requirement_id}]
                    </span>
                    <span className="font-bold text-[#13221C]">{q.focus}</span>
                  </div>
                  <p className="text-[#2D4439] text-xs leading-relaxed pl-1 font-medium">
                    💡 <em>{q.question}</em>
                  </p>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-xl bg-[#F5F8F6] border border-[#D5DFD9] text-xs text-[#2D4439] italic">
                Kandidat memenuhi seluruh kualifikasi utama. Tidak ada pertanyaan defisit kritis yang
                direkomendasikan.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
