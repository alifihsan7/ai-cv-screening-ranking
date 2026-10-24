import React, { useState, useEffect } from 'react'
import {
  X,
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  CircleDot,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ShieldCheck,
  Terminal,
  FileText,
  Copy,
  Check,
  Eye,
  Search,
} from 'lucide-react'
import type { CandidateDetail, Requirement } from '../types'

export interface CandidateInspectorProps {
  isOpen: boolean
  onClose: () => void
  candidate: CandidateDetail | null
  requirements: Requirement[]
  blindMode: boolean
  onDecision: (
    cv_id: string,
    decision: 'SHORTLIST' | 'HOLD' | 'TIDAK_LANJUT' | 'NONE'
  ) => void
  onRevealCandidate?: (cv_id: string) => void
  initialTab?: 'evaluation' | 'trajectory' | 'grounding'
}

const getActionBadgeClass = (action: string) => {
  if (action.includes('Jev') || action.includes('GROUNDED_VERIFIER')) {
    return 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD] font-bold'
  }
  if (action.includes('CRITIQUE') || action.includes('REFLECT')) {
    return 'bg-[#FEF6E8] text-[#7A3E02] border-[#F8D8A7] font-bold'
  }
  if (action.includes('PARSER') || action.includes('DOCLING')) {
    return 'bg-[#EBF1EE] text-[#1B4938] border-[#D5DFD9] font-bold'
  }
  if (action.includes('RETRIEVAL')) {
    return 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD] font-bold'
  }
  if (action.includes('DETERMINISTIC') || action.includes('SCORER')) {
    return 'bg-[#EBF1EE] text-[#13221C] border-[#D5DFD9] font-bold'
  }
  if (action.includes('FINALIZE')) {
    return 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD] font-bold'
  }
  return 'bg-[#EBF1EE] text-[#2D4439] border-[#D5DFD9] font-medium'
}

export const CandidateInspector: React.FC<CandidateInspectorProps> = ({
  isOpen,
  onClose,
  candidate,
  requirements,
  blindMode,
  onDecision,
  onRevealCandidate,
  initialTab = 'evaluation',
}) => {
  const [activeTab, setActiveTab] = useState<'evaluation' | 'trajectory' | 'grounding'>(initialTab)
  const [expandedQuotes, setExpandedQuotes] = useState<Record<string, boolean>>({})
  const [groundingSearchTerm, setGroundingSearchTerm] = useState('')
  const [highlightedQuote, setHighlightedQuote] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [prevInitialTab, setPrevInitialTab] = useState(initialTab)

  // Adjust active tab state synchronously when initialTab prop updates
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab)
    setActiveTab(initialTab)
  }

  // Power keyboard ESC listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!candidate) return null

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

  const toggleQuote = (reqId: string) => {
    setExpandedQuotes((prev) => ({
      ...prev,
      [reqId]: !prev[reqId],
    }))
  }

  const toggleAllQuotes = () => {
    const allExpanded = requirements.every((r) => expandedQuotes[r.requirement_id])
    if (allExpanded) {
      setExpandedQuotes({})
    } else {
      const allTrue: Record<string, boolean> = {}
      requirements.forEach((r) => {
        allTrue[r.requirement_id] = true
      })
      setExpandedQuotes(allTrue)
    }
  }

  const handleJumpToGrounding = (quote: string) => {
    setHighlightedQuote(quote)
    setGroundingSearchTerm(quote.slice(0, 30))
    setActiveTab('grounding')
  }

  const isJevVerified =
    candidate.verifier_provider === 'JEV_TYPESAFE' ||
    (candidate.reasoning_trajectory && candidate.reasoning_trajectory.length > 0)

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

  const handleCopyCvText = () => {
    navigator.clipboard.writeText(defaultCvText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Semi-transparent Backdrop for Focus */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-over Inspector Panel (Focused 600px / max-w-2xl width) */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:w-[600px] max-w-full sm:max-w-2xl z-50 bg-[#FCFDFC] border-l border-[#D5DFD9] shadow-tactile-lg flex flex-col transform transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        aria-label="Panel Inspeksi Kandidat"
        role="dialog"
        aria-modal="true"
      >
        {/* Header: Candidate Identity & Segmented Decision Bar */}
        <header className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-[#D5DFD9] bg-[#FCFDFC] flex items-center justify-between gap-2.5 sm:gap-3 shrink-0 shadow-tactile-sm">
          {/* Identity */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#EBF1EE] border border-[#D5DFD9] flex items-center justify-center font-mono font-bold text-xs sm:text-sm text-[#1B4938] shadow-tactile-sm shrink-0">
              #{candidate.rank}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
                <h2
                  className="text-xs sm:text-sm font-bold text-[#13221C] truncate tracking-tight"
                  title={displayName}
                >
                  {displayName}
                </h2>
                {blindMode && !candidate.revealed && onRevealCandidate && (
                  <button
                    type="button"
                    onClick={() => onRevealCandidate(candidate.cv_id)}
                    className="h-5 px-1.5 rounded bg-[#F2F5F3] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[10px] font-semibold text-[#1B4938] flex items-center space-x-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1B4938] shrink-0"
                    title="Buka Identitas Asli Kandidat"
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

          {/* Right Header Area: Total Score + Decision Switch + Close Button */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
            {/* Skor Total */}
            <div className="text-right pr-1 sm:pr-1.5 shrink-0">
              <div className="text-[9px] font-mono text-[#2D4439] uppercase tracking-wider font-bold">
                Skor Fit
              </div>
              <div className="font-mono tabular-nums font-bold text-sm sm:text-base text-[#1B4938] leading-tight">
                {candidate.final_score.toFixed(1)}{' '}
                <span className="text-[10px] text-[#2D4439] font-normal">/ 100</span>
              </div>
            </div>

            <div className="h-7 w-px bg-[#D5DFD9] shrink-0" />

            {/* Segmented Decision Switch */}
            <div className="flex items-center bg-[#F2F5F3] p-0.5 rounded-xl border border-[#D5DFD9] shadow-tactile-sm shrink-0">
              {/* Belum Diputuskan */}
              <button
                type="button"
                onClick={() => onDecision(candidate.cv_id, 'NONE')}
                className={`h-7 px-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center space-x-1 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4439] shrink-0 ${
                  !candidate.decision || candidate.decision === 'NONE'
                    ? 'bg-[#EBF1EE] text-[#13221C] border border-[#D5DFD9] shadow-tactile-sm'
                    : 'text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-transparent'
                }`}
                title="Belum Diputuskan (Status Awal / Reset)"
              >
                <CircleDot className="w-3.5 h-3.5 text-[#2D4439] shrink-0" />
                <span className="hidden sm:inline">Belum Diputuskan</span>
              </button>

              {/* Shortlist */}
              <button
                type="button"
                onClick={() => onDecision(candidate.cv_id, 'SHORTLIST')}
                className={`h-7 px-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center space-x-1 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124B2E] shrink-0 ${
                  candidate.decision === 'SHORTLIST'
                    ? 'bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD] shadow-tactile-sm'
                    : 'text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-transparent'
                }`}
                title="Shortlist"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#124B2E] shrink-0" />
                <span className="hidden sm:inline">Shortlist</span>
              </button>

              {/* Hold */}
              <button
                type="button"
                onClick={() => onDecision(candidate.cv_id, 'HOLD')}
                className={`h-7 px-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center space-x-1 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3E02] shrink-0 ${
                  candidate.decision === 'HOLD'
                    ? 'bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7] shadow-tactile-sm'
                    : 'text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-transparent'
                }`}
                title="Hold / Talent Pool"
              >
                <Clock className="w-3.5 h-3.5 text-[#7A3E02] shrink-0" />
                <span className="hidden sm:inline">Hold</span>
              </button>

              {/* Tolak */}
              <button
                type="button"
                onClick={() => onDecision(candidate.cv_id, 'TIDAK_LANJUT')}
                className={`h-7 px-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center space-x-1 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1819] shrink-0 ${
                  candidate.decision === 'TIDAK_LANJUT'
                    ? 'bg-[#FCEBEB] text-[#8C1819] border border-[#F6C1C1] shadow-tactile-sm'
                    : 'text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-transparent'
                }`}
                title="Tidak Lanjut"
              >
                <XCircle className="w-3.5 h-3.5 text-[#8C1819] shrink-0" />
                <span className="hidden sm:inline">Tolak</span>
              </button>
            </div>

            {/* Close [X] Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] transition-all duration-150 cursor-pointer border border-transparent hover:border-[#D5DFD9] flex items-center justify-center text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] shrink-0"
              title="Tutup Panel Inspeksi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Integrated Tab Bar: Evaluasi Forensik · ReAct Trajectory · Kutipan CV */}
        <div className="px-4 sm:px-5 py-2 bg-[#F7FAF8] border-b border-[#D5DFD9] flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
          <div className="flex items-center space-x-1 bg-[#EBF1EE] p-0.5 rounded-xl border border-[#D5DFD9] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('evaluation')}
              className={`h-7 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'evaluation'
                  ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
                  : 'text-[#2D4439] hover:text-[#13221C] border border-transparent'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-[#1B4938] shrink-0" />
              <span className="whitespace-nowrap">Evaluasi Forensik</span>
              <span className="font-mono tabular-nums text-[10px] bg-[#EBF1EE] text-[#1B4938] font-bold px-1 rounded shrink-0">
                {requirements.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('trajectory')}
              className={`h-7 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'trajectory'
                  ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
                  : 'text-[#2D4439] hover:text-[#13221C] border border-transparent'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-[#1B4938] shrink-0" />
              <span className="whitespace-nowrap">ReAct Telemetry</span>
              {candidate.reasoning_trajectory && candidate.reasoning_trajectory.length > 0 && (
                <span className="font-mono tabular-nums text-[10px] bg-[#EBF1EE] text-[#124B2E] font-bold px-1 rounded shrink-0">
                  {candidate.reasoning_trajectory.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('grounding')}
              className={`h-7 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'grounding'
                  ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
                  : 'text-[#2D4439] hover:text-[#13221C] border border-transparent'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#1B4938] shrink-0" />
              <span className="whitespace-nowrap">Kutipan CV (Grounding)</span>
            </button>
          </div>

          {isJevVerified && (
            <div className="flex items-center space-x-1.5 text-[10px] font-mono text-[#2D4439] shrink-0">
              <span className="inline-flex items-center gap-1 font-bold text-[#124B2E] bg-[#EBF6EF] px-1.5 py-0.5 rounded border border-[#BBE5CD] whitespace-nowrap">
                <ShieldCheck className="w-3 h-3 text-[#124B2E] shrink-0" />
                <span>Jev Verified</span>
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Inspector Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: EVALUASI FORENSIK (Progressive Disclosure) */}
          {activeTab === 'evaluation' && (
            <div className="space-y-4">
              {/* Ringkasan Eksekutif */}
              <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 shadow-tactile space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E9E5] pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-[#1B4938]" />
                    <h3 className="text-xs font-bold text-[#13221C] uppercase tracking-wider">
                      Ringkasan Eksekutif
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#2D4439]">
                    Saran Rekomendasi:{' '}
                    <strong className="text-[#13221C]">
                      {candidate.recommendation.replace('_', ' ')}
                    </strong>
                  </span>
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
                  <span className="text-[10px] font-mono text-[#2D4439]">
                    Evaluasi Tipe-Aman Jev
                  </span>
                </div>

                {/* Top Strengths Grid */}
                {candidate.explanation.strengths && candidate.explanation.strengths.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-[#13221C] uppercase tracking-wider block">
                      Keunggulan Utama Terverifikasi
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {candidate.explanation.strengths.slice(0, 4).map((s, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-[#EBF6EF]/50 border border-[#BBE5CD] text-xs space-y-1 shadow-tactile-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-[#124B2E]">
                              {s.requirement_id} • Bobot {s.weight}%
                            </span>
                          </div>
                          <p className="font-semibold text-[#13221C] text-[11px]">{s.description}</p>
                          {s.quote && (
                            <p className="font-mono text-[10px] text-[#124B2E] italic truncate">
                              &quot;{s.quote}&quot;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Catatan Defisit / Flags */}
                {((candidate.flags && candidate.flags.length > 0) ||
                  (candidate.explanation.unproven && candidate.explanation.unproven.length > 0)) && (
                  <div className="p-3 rounded-xl bg-[#FEF6E8] border border-[#F8D8A7] text-xs space-y-2 shadow-tactile-sm">
                    <div className="flex items-center space-x-1.5 text-[#7A3E02] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#7A3E02] shrink-0" />
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

              {/* Matriks Kriteria & Bukti dengan Progressive Disclosure */}
              <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 shadow-tactile space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2E9E5] pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-[#1B4938]" />
                    <h3 className="text-xs font-bold text-[#13221C] uppercase tracking-wider">
                      Matriks Kualifikasi & Bukti ({requirements.length} Kriteria)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={toggleAllQuotes}
                    className="text-[11px] font-mono text-[#1B4938] hover:text-[#124B2E] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {requirements.every((r) => expandedQuotes[r.requirement_id]) ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        <span>Tutup Semua Bukti</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        <span>Buka Semua Bukti</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2.5">
                  {requirements.map((r) => {
                    const state =
                      candidate.requirement_states[r.requirement_id] || 'NOT_DEMONSTRATED'
                    const evList = candidate.evidence[r.requirement_id] || []
                    const evidenceQuote = evList[0]?.quote
                    const isExpanded = !!expandedQuotes[r.requirement_id]

                    return (
                      <div
                        key={r.requirement_id}
                        className="p-3 rounded-xl bg-[#FCFDFC] hover:bg-[#F5F8F6] border border-[#D5DFD9] hover:border-[#1B4938]/40 space-y-2 transition-all shadow-tactile-sm"
                      >
                        {/* Header Row Kriteria */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="font-mono font-bold text-xs text-[#1B4938] bg-[#EBF1EE] px-2 py-0.5 rounded border border-[#D5DFD9]">
                              {r.requirement_id}
                            </span>
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

                        {/* Progressive Disclosure: Expandable Kutipan Bukti CV */}
                        {evidenceQuote ? (
                          <div className="pt-1 border-t border-[#E2E9E5]/60">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => toggleQuote(r.requirement_id)}
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1B4938] hover:text-[#124B2E] cursor-pointer transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-[#1B4938]" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-[#1B4938]" />
                                )}
                                <span>{isExpanded ? 'Sembunyikan Kutipan CV' : 'Lihat Bukti Kutipan CV'}</span>
                                {!isExpanded && (
                                  <span className="text-[#2D4439]/60 font-mono text-[10px] truncate max-w-[280px]">
                                    — &ldquo;{evidenceQuote.slice(0, 45)}...&rdquo;
                                  </span>
                                )}
                              </button>

                              {isExpanded && (
                                <button
                                  type="button"
                                  onClick={() => handleJumpToGrounding(evidenceQuote)}
                                  className="text-[10px] font-bold text-[#1B4938] hover:underline cursor-pointer flex items-center gap-1"
                                  title="Lihat konteks penuh di berkas CV asli"
                                >
                                  <span>Buka di Berkas CV</span>
                                  <ChevronRight className="w-3 h-3 text-[#1B4938]" />
                                </button>
                              )}
                            </div>

                            {/* Expanded Kutipan Verbatim */}
                            {isExpanded && (
                              <div className="mt-2 pl-3 border-l-2 border-[#1B4938] bg-[#F5F8F6] p-2.5 rounded-r-lg">
                                <p className="font-mono text-[11px] text-[#124B2E] leading-relaxed select-text">
                                  &ldquo;{evidenceQuote}&rdquo;
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="pt-1 text-[10px] text-[#2D4439]/70 italic font-mono">
                            Tidak ditemukan kutipan eksplisit dalam berkas CV untuk kriteria ini.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Panduan Pertanyaan Wawancara Terarah */}
              <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 shadow-tactile space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#E2E9E5] pb-2">
                  <div className="flex items-center space-x-2 text-[#7A3E02]">
                    <MessageSquare className="w-4 h-4 text-[#7A3E02]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#13221C]">
                      Panduan Pertanyaan Wawancara Terarah
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-[#2D4439]">
                    Validasi Kualifikasi Kritis
                  </span>
                </div>

                <div className="space-y-2">
                  {candidate.explanation.interview_questions &&
                  candidate.explanation.interview_questions.length > 0 ? (
                    candidate.explanation.interview_questions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#FEF6E8]/50 border border-[#F8D8A7] text-xs space-y-1 shadow-tactile-sm"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] font-bold text-[#7A3E02] bg-[#FEF6E8] px-1.5 py-0.5 rounded border border-[#F8D8A7]">
                            [{q.requirement_id}]
                          </span>
                          <span className="font-bold text-[#13221C]">{q.focus}</span>
                        </div>
                        <p className="text-[#2D4439] text-[11px] leading-relaxed pl-1 font-medium">
                          💡 <em>{q.question}</em>
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-2.5 rounded-xl bg-[#F5F8F6] border border-[#D5DFD9] text-xs text-[#2D4439] italic">
                      Kandidat memenuhi seluruh kualifikasi utama. Tidak ada pertanyaan defisit kritis yang
                      direkomendasikan.
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: REACT REASONING TRAJECTORY RAIL */}
          {activeTab === 'trajectory' && (
            <div className="space-y-4">
              <div className="bg-[#F5F8F6] p-3 rounded-xl border border-[#D5DFD9] text-xs text-[#2D4439] flex items-center justify-between">
                <span>
                  Jejak penalaran agen otonom & verifikasi tipe-aman Jev langkah demi langkah
                  secara deterministik.
                </span>
                <span className="font-mono font-bold text-[10px] text-[#124B2E] bg-[#EBF6EF] px-2 py-0.5 rounded border border-[#BBE5CD]">
                  AUDIT LOG IMMUTABLE
                </span>
              </div>

              {!candidate.reasoning_trajectory || candidate.reasoning_trajectory.length === 0 ? (
                <div className="bg-[#F5F8F6] border border-dashed border-[#D5DFD9] p-8 rounded-xl text-center space-y-2">
                  <div className="w-9 h-9 mx-auto rounded-lg bg-[#EBF1EE] border border-[#D5DFD9] flex items-center justify-center text-[#2D4439] font-mono text-xs font-bold">
                    ∅
                  </div>
                  <p className="font-bold text-[#13221C] text-xs">
                    Belum Ada Rekaman ReAct Trajectory
                  </p>
                  <p className="text-[#2D4439] text-[11px] max-w-md mx-auto leading-relaxed">
                    Kandidat ini dievaluasi langsung menggunakan verifier tipe-aman deterministik Jev.
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-[#D5DFD9] ml-4 pl-6 space-y-5 pt-2 pb-2">
                  {candidate.reasoning_trajectory.map((step) => (
                    <div
                      key={step.step_number}
                      className="relative bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl p-3.5 space-y-2.5 hover:border-[#1B4938]/40 transition-colors shadow-tactile-sm"
                    >
                      {/* Step Node Marker */}
                      <div className="absolute -left-[35px] top-3.5 w-7 h-7 rounded-full bg-[#FCFDFC] border-2 border-[#1B4938] text-[#1B4938] font-mono text-[11px] font-bold flex items-center justify-center shadow-tactile-sm">
                        {String(step.step_number).padStart(2, '0')}
                      </div>

                      {/* Step Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] border ${getActionBadgeClass(
                              step.action
                            )}`}
                          >
                            {step.action}
                          </span>
                          <span className="font-mono text-[10px] text-[#2D4439] tabular-nums">
                            {step.timestamp_utc}
                          </span>
                        </div>
                      </div>

                      {/* Thought */}
                      <div className="text-xs text-[#13221C] bg-[#F5F8F6] p-2.5 rounded-lg border border-[#E2E9E5] space-y-1">
                        <span className="font-mono text-[10px] font-bold uppercase text-[#2D4439] block">
                          💭 Reasoning / Thought:
                        </span>
                        <p className="leading-relaxed">{step.thought}</p>
                      </div>

                      {/* Action Input & Observation */}
                      <div className="space-y-1.5 text-xs">
                        {step.action_input && Object.keys(step.action_input).length > 0 && (
                          <div className="font-mono text-[11px] bg-[#EBF1EE] p-2 rounded-lg border border-[#D5DFD9] text-[#13221C] overflow-x-auto">
                            <span className="text-[#2D4439] font-bold">Input: </span>
                            {JSON.stringify(step.action_input, null, 2)}
                          </div>
                        )}

                        {step.observation && (
                          <div className="text-xs text-[#2D4439] pl-2 border-l-2 border-[#BBE5CD] py-0.5 font-mono">
                            <strong className="text-[#124B2E]">Observation: </strong>
                            {step.observation}
                          </div>
                        )}

                        {step.state_mutation && (
                          <div className="text-[11px] text-[#7A3E02] bg-[#FEF6E8] px-2 py-1 rounded border border-[#F8D8A7] font-mono">
                            ⚡ <strong>State Mutation: </strong>
                            {step.state_mutation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: KUTIPAN CV ASLI (Grounding View) */}
          {activeTab === 'grounding' && (
            <div className="space-y-3">
              {/* Grounding Controls Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#F5F8F6] border border-[#D5DFD9]">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#2D4439] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari kata kunci dalam teks CV..."
                      value={groundingSearchTerm}
                      onChange={(e) => setGroundingSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1 bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg text-xs text-[#13221C] focus:outline-none focus:border-[#1B4938] w-64 shadow-tactile-sm"
                    />
                  </div>
                  {highlightedQuote && (
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightedQuote(null)
                        setGroundingSearchTerm('')
                      }}
                      className="text-[10px] font-mono text-[#7A3E02] bg-[#FEF6E8] px-2 py-1 rounded border border-[#F8D8A7] cursor-pointer"
                    >
                      Reset Sorotan
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCopyCvText}
                  className="px-2.5 py-1 rounded-lg bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-xs font-semibold text-[#13221C] flex items-center space-x-1.5 cursor-pointer shadow-tactile-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#124B2E]" />
                      <span className="text-[#124B2E]">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#2D4439]" />
                      <span>Salin Berkas CV</span>
                    </>
                  )}
                </button>
              </div>

              {/* Berkas CV Monospace Box */}
              <div className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 shadow-tactile overflow-x-auto max-h-[580px]">
                <pre className="font-mono text-xs text-[#13221C] leading-relaxed whitespace-pre-wrap select-text">
                  {defaultCvText}
                </pre>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
