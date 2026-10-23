import React from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Award,
  Eye,
  FileCheck,
  AlertTriangle,
  ChevronRight,
  MessageSquare,
} from 'lucide-react'
import type { CandidateDetail, Requirement } from '../types'

export interface ForensicCanvasProps {
  candidate: CandidateDetail | null
  requirements: Requirement[]
  blindMode: boolean
  onDecision: (cv_id: string, decision: 'SHORTLIST' | 'HOLD' | 'TIDAK_LANJUT') => void
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
          untuk navigasi cepat, dan{' '}
          <span className="font-mono bg-[#EBF1EE] px-1 py-0.5 rounded text-[#13221C] border border-[#D5DFD9]">
            [D]
          </span>{' '}
          untuk membuka Audit Drawer.
        </p>
      </main>
    )
  }

  const displayName =
    blindMode && !candidate.revealed ? candidate.blind_id : candidate.real_name

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
    <main className="flex-1 bg-[#FCFDFC] flex flex-col h-full overflow-hidden select-none">
      {/* Persistent Canvas Header (Option A) */}
      <header className="px-5 py-3 border-b border-[#D5DFD9] bg-[#FCFDFC] flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-tactile-sm">
        {/* Candidate Identity + Action Button [ 🛡️ Buka Audit Jev (D) ] */}
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

              {/* Tactile Action Button: Buka Audit Jev (D) */}
              <button
                type="button"
                onClick={() => onOpenAuditDrawer?.('trajectory')}
                className="bg-[#E6F4EA] text-[#134E35] border border-[#A5D6B6] hover:bg-[#D5EFE0] transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                title="Buka Slide-Over Audit Telemetri Jev (Shortcut: 'D')"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#134E35]" />
                <span>Buka Audit Jev (D)</span>
              </button>
            </div>
            <p className="text-[11px] text-[#40564D] font-mono truncate mt-0.5">
              {candidate.file_name} •{' '}
              <span className="text-[#13221C] font-semibold">
                {getDecileText(candidate.final_score)}
              </span>
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

      {/* Scrollable Canvas Body (Executive View: 3 Essential Sections Only) */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
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
              <span className="text-[10px] font-mono text-[#40564D]">
                Rekomendasi:{' '}
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
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#EBF6EF] text-[#1B6C47] border border-[#BBE5CD]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1B6C47]" />
                  Semua Terpenuhi ({mustHaveReqs.length}/{mustHaveReqs.length})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FEF6E8] text-[#8A4C05] border border-[#F8D8A7]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#8A4C05]" />
                  {mustHavePartialOrUnproven.length} Syarat Perlu Perhatian ({mustHaveFulfilled.length}/
                  {mustHaveReqs.length})
                </span>
              )}
            </div>

            <span className="text-[11px] font-mono text-[#40564D]">
              Evaluasi Deterministik Jev
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
                    className="p-3 rounded-xl bg-[#EBF6EF]/40 border border-[#BBE5CD] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-[#1B6C47]">
                        {s.requirement_id} • Bobot {s.weight}%
                      </span>
                    </div>
                    <p className="font-semibold text-[#13221C]">{s.description}</p>
                    {s.quote && (
                      <p className="font-mono text-[11px] text-[#134E35] italic truncate">
                        &quot;{s.quote}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catatan Defisit & Flags (jika ada) */}
          {((candidate.flags && candidate.flags.length > 0) ||
            (candidate.explanation.unproven && candidate.explanation.unproven.length > 0)) && (
            <div className="p-3 rounded-xl bg-[#FEF6E8]/70 border border-[#F8D8A7] text-xs space-y-2">
              <div className="flex items-center space-x-1.5 text-[#8A4C05] font-bold">
                <AlertTriangle className="w-4 h-4 text-[#8A4C05] shrink-0" />
                <span>Catatan Defisit & Indikasi Verifikasi:</span>
              </div>
              <div className="space-y-1 text-[#13221C]">
                {candidate.flags &&
                  candidate.flags.map((flag, idx) => (
                    <div key={`flag-${idx}`} className="flex items-center gap-1.5 text-xs text-[#8A4C05]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8A4C05]" />
                      <span>
                        Flag Integritas: <strong>{flag}</strong>
                      </span>
                    </div>
                  ))}
                {candidate.explanation.unproven &&
                  candidate.explanation.unproven.map((u, idx) => (
                    <div
                      key={`unproven-${idx}`}
                      className="flex items-start gap-1.5 text-xs text-[#8A4C05]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8A4C05] mt-1 shrink-0" />
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
            <span className="text-[10px] font-mono text-[#40564D]">
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
                  className="p-3.5 rounded-xl bg-[#FCFDFC] hover:bg-[#F5F8F6] border border-[#D5DFD9] space-y-2 transition-colors shadow-tactile-sm"
                >
                  {/* Kriteria Title Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-mono font-bold text-xs text-[#1B4938] bg-[#EBF1EE] px-2 py-0.5 rounded border border-[#D5DFD9]">
                        {r.requirement_id}
                      </span>
                      <span className="font-semibold text-xs text-[#13221C]">
                        {r.description}
                      </span>
                      {r.importance === 'MUST_HAVE' && (
                        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-[#FEF6E8] text-[#8A4C05] border border-[#F8D8A7]">
                          Wajib
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-mono text-xs tabular-nums text-[#40564D]">
                        Bobot: <strong>{r.weight}%</strong>
                      </span>
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
                    </div>
                  </div>

                  {/* Kutipan Verbatim CV Terpadu di Bawah Kriteria */}
                  {evidenceQuote ? (
                    <div className="mt-1 pl-3 border-l-2 border-[#1B4938] bg-[#F5F8F6] p-2.5 rounded-r-lg flex items-start justify-between gap-3">
                      <p className="font-mono text-[11px] text-[#134E35] leading-relaxed select-text">
                        &ldquo;{evidenceQuote}&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenAuditDrawer?.('grounding', evidenceQuote)}
                        className="shrink-0 text-[10px] font-semibold text-[#1B4938] hover:text-[#134E35] underline cursor-pointer flex items-center gap-1 transition-colors"
                        title="Buka kutipan ini di Audit Drawer CV"
                      >
                        <span>Lihat di CV</span>
                        <ChevronRight className="w-3 h-3 text-[#1B4938]" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 pl-3 border-l-2 border-[#D5DFD9] py-1 text-[11px] text-[#40564D]/60 italic font-mono">
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
            <div className="flex items-center space-x-2 text-[#8A4C05]">
              <MessageSquare className="w-4 h-4 text-[#8A4C05]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#13221C]">
                Panduan Pertanyaan Wawancara Terarah
              </h4>
            </div>
            <span className="text-[10px] font-mono text-[#40564D]">
              Validasi Kualifikasi Kritis
            </span>
          </div>

          <div className="space-y-2.5">
            {candidate.explanation.interview_questions &&
            candidate.explanation.interview_questions.length > 0 ? (
              candidate.explanation.interview_questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#FEF6E8]/40 border border-[#F8D8A7] text-xs space-y-1.5"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] font-bold text-[#8A4C05] bg-[#FEF6E8] px-1.5 py-0.5 rounded border border-[#F8D8A7]">
                      [{q.requirement_id}]
                    </span>
                    <span className="font-semibold text-[#13221C]">{q.focus}</span>
                  </div>
                  <p className="text-[#40564D] text-xs leading-relaxed pl-1">
                    💡 <em>{q.question}</em>
                  </p>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-xl bg-[#F5F8F6] border border-[#D5DFD9] text-xs text-[#40564D] italic">
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
