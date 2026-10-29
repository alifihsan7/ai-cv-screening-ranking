import React, { useState, useEffect, useMemo } from 'react'
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
  Terminal,
  FileText,
  Copy,
  Check,
  Eye,
  Search,
  Sparkles,
} from 'lucide-react'
import type { CandidateDetail, Requirement } from '../types'
import {
  ScreeningTelemetryPanel,
  DualLayerCriterionBadge,
  VerbatimGroundingChip,
} from './ScreeningTelemetryPanel'
import { getScreeningTelemetry, isVerbatimGrounded } from '../utils/telemetry'

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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
  if (action.includes('Jev') || action.includes('GROUNDED_VERIFIER') || action.includes('AI')) {
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
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [highlightedReqId, setHighlightedReqId] = useState<string | null>(null)

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

  const handleJumpToGrounding = (quote: string, reqId?: string) => {
    setHighlightedQuote(quote)
    if (reqId) {
      setSelectedReqId(reqId)
    } else {
      const match = requirements.find((r) =>
        (candidate?.evidence?.[r.requirement_id] || []).some((e) => e.quote === quote)
      )
      if (match) setSelectedReqId(match.requirement_id)
    }
    setGroundingSearchTerm('')
    setActiveTab('grounding')
  }

  const activeRequirement = useMemo(() => {
    if (selectedReqId) {
      const found = requirements.find((r) => r.requirement_id === selectedReqId)
      if (found) return found
    }
    if (highlightedQuote && candidate?.evidence) {
      const found = requirements.find((r) => {
        const evList = candidate.evidence?.[r.requirement_id] || []
        return evList.some((e) => e.quote === highlightedQuote)
      })
      if (found) return found
    }
    return null
  }, [selectedReqId, highlightedQuote, requirements, candidate?.evidence])

  const defaultCvText =
    candidate?.full_text ||
    (candidate
      ? `${candidate.real_name.toUpperCase()}
Berkas: ${candidate.file_name}
Status Verifikasi: ${candidate.quality_status || 'VERIFIED'}

RINGKASAN BUKTI KUALIFIKASI:
${Object.entries(candidate.evidence || {})
  .flatMap(([reqId, items]) => items.map((i) => `• [${reqId}] ${i.quote}`))
  .join('\n') || 'Tidak ada kutipan bukti yang tercatat.'}

PENDIDIKAN & LATAR BELAKANG:
• Terverifikasi dalam kategori ${candidate.band} dengan skor total ${candidate.final_score.toFixed(1)}.`
      : '')

  const { highlightedContent, isMatchFound, matchCount } = useMemo(() => {
    if (!defaultCvText) {
      return { highlightedContent: null, isMatchFound: false, matchCount: 0 }
    }

    let pattern = ''
    let isTarget = false

    // Priority 1: highlightedQuote (with whitespace-tolerant regex)
    if (highlightedQuote && highlightedQuote.trim().length >= 3) {
      const words = highlightedQuote.trim().split(/\s+/).filter(Boolean)
      if (words.length > 0) {
        const fullPattern = words.map((w) => escapeRegex(w)).join('\\s+')
        try {
          if (new RegExp(fullPattern, 'i').test(defaultCvText)) {
            pattern = fullPattern
            isTarget = true
          } else if (words.length >= 4) {
            const subPattern = words.slice(0, 5).map((w) => escapeRegex(w)).join('\\s+')
            if (new RegExp(subPattern, 'i').test(defaultCvText)) {
              pattern = subPattern
              isTarget = true
            }
          }
        } catch {
          // ignore invalid pattern
        }
      }
    }

    // Priority 2: user search term in input bar
    if (!pattern && groundingSearchTerm && groundingSearchTerm.trim().length >= 2) {
      try {
        const cleanTerm = escapeRegex(groundingSearchTerm.trim())
        if (new RegExp(cleanTerm, 'i').test(defaultCvText)) {
          pattern = cleanTerm
          isTarget = false
        }
      } catch {
        // ignore invalid pattern
      }
    }

    if (!pattern) {
      return {
        highlightedContent: <span>{defaultCvText}</span>,
        isMatchFound: false,
        matchCount: 0,
      }
    }

    try {
      const regex = new RegExp(`(${pattern})`, 'gi')
      const testRegex = new RegExp(`^${pattern}$`, 'i')
      const parts = defaultCvText.split(regex)
      let count = 0

      const nodes = parts.map((part, index) => {
        if (testRegex.test(part)) {
          count++
          const isFirst = count === 1
          return (
            <mark
              key={index}
              id={isFirst ? 'active-cv-highlight' : undefined}
              className={`font-semibold px-1 py-0.5 rounded shadow-sm transition-all duration-300 ${
                isTarget
                  ? 'bg-[#FEF08A] text-[#713F12] border border-[#FDE047] ring-2 ring-[#F59E0B]/40'
                  : 'bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC]'
              }`}
            >
              {part}
            </mark>
          )
        }
        return <span key={index}>{part}</span>
      })

      return {
        highlightedContent: <>{nodes}</>,
        isMatchFound: count > 0,
        matchCount: count,
      }
    } catch {
      return {
        highlightedContent: <span>{defaultCvText}</span>,
        isMatchFound: false,
        matchCount: 0,
      }
    }
  }, [defaultCvText, highlightedQuote, groundingSearchTerm])

  useEffect(() => {
    if (activeTab === 'grounding' && isMatchFound) {
      const timer = setTimeout(() => {
        const el = document.getElementById('active-cv-highlight')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [activeTab, isMatchFound, highlightedQuote, groundingSearchTerm])

  // Guard: all hooks have been declared unconditionally above. Return null if no candidate.
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

  // Nice-to-have / preference requirements check
  const niceToHaveReqs = requirements.filter((r) => r.importance !== 'MUST_HAVE')
  const niceToHaveFulfilled = niceToHaveReqs.filter(
    (r) => candidate.requirement_states[r.requirement_id] === 'STRONG'
  )

  const telemetry = getScreeningTelemetry(candidate, requirements)

  const handleCopyCvText = () => {
    navigator.clipboard.writeText(defaultCvText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleScrollToCriterion = (reqId: string) => {
    setActiveTab('evaluation')
    setHighlightedReqId(reqId)
    setExpandedQuotes((prev) => ({ ...prev, [reqId]: true }))
    setTimeout(() => {
      const el = document.getElementById(`criterion-${reqId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
    setTimeout(() => {
      setHighlightedReqId((prev) => (prev === reqId ? null : prev))
    }, 4000)
  }

  const renderCriterionCard = (r: Requirement) => {
    const state = candidate.requirement_states[r.requirement_id] || 'NOT_DEMONSTRATED'
    const evList = candidate.evidence[r.requirement_id] || []
    const evidenceQuote = evList[0]?.quote
    const isExpanded = !!expandedQuotes[r.requirement_id]
    const isHighlighted = highlightedReqId === r.requirement_id
    const isMustHave = r.importance === 'MUST_HAVE'

    return (
      <div
        key={r.requirement_id}
        id={`criterion-${r.requirement_id}`}
        className={`p-3 rounded-xl transition-all duration-300 shadow-tactile-sm space-y-2 ${
          isHighlighted
            ? 'ring-2 ring-[#7A3E02] bg-[#FEF6E8] scale-[1.01] border-[#F8D8A7]'
            : 'bg-[#FCFDFC] hover:bg-[#F5F8F6] border border-[#D5DFD9] hover:border-[#1B4938]/40'
        }`}
      >
        {/* Header Row Kriteria */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0 flex-wrap">
            <span className="font-mono font-bold text-xs text-[#1B4938] bg-[#EBF1EE] px-2 py-0.5 rounded border border-[#D5DFD9]">
              {r.requirement_id}
            </span>
            <DualLayerCriterionBadge req={r} />
            <span className="font-semibold text-xs text-[#13221C]">
              {r.description}
            </span>
            {isMustHave ? (
              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7]">
                Wajib Mutlak
              </span>
            ) : (
              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD]">
                Nilai Tambah
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
            <div className="flex items-center justify-between gap-2 flex-wrap">
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
                <VerbatimGroundingChip isGrounded={isVerbatimGrounded(evidenceQuote, candidate.full_text)} />
                {!isExpanded && (
                  <span className="text-[#2D4439]/60 font-mono text-[10px] truncate max-w-[220px]">
                    — &ldquo;{evidenceQuote.slice(0, 40)}...&rdquo;
                  </span>
                )}
              </button>

              {isExpanded && (
                <button
                  type="button"
                  onClick={() => handleJumpToGrounding(evidenceQuote, r.requirement_id)}
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
              <div className="mt-2.5 p-3 rounded-xl bg-[#FEFCE8] border border-[#FEF08A] shadow-tactile-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <VerbatimGroundingChip isGrounded={isVerbatimGrounded(evidenceQuote, candidate.full_text)} />
                    <span className="font-mono text-[9px] text-[#713F12]">
                      {evList[0]?.char_start !== undefined && evList[0]?.char_end !== undefined
                        ? `Karakter ${evList[0].char_start}–${evList[0].char_end}`
                        : 'Kutipan Bukti Terverifikasi'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleJumpToGrounding(evidenceQuote, r.requirement_id)}
                    className="px-2.5 py-1 rounded-lg bg-[#1B4938] hover:bg-[#153A2D] text-white text-[10px] font-bold flex items-center gap-1 shadow-tactile-sm cursor-pointer transition-all active:scale-95"
                    title="Lihat teks ini disorot di dokumen CV asli"
                  >
                    <span>Sorot di Teks CV</span>
                    <ChevronRight className="w-3 h-3 text-white" />
                  </button>
                </div>
                <div className="bg-white/90 p-2.5 rounded-lg border border-[#FDE047] shadow-inner">
                  <p className="font-mono text-xs text-[#713F12] leading-relaxed select-text font-medium">
                    &ldquo;{evidenceQuote}&rdquo;
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-1 text-[10px] text-[#2D4439]/70 italic font-mono flex items-center gap-2">
            <span>Tidak ditemukan kutipan eksplisit dalam berkas CV untuk kriteria ini.</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Semi-transparent Backdrop for Mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 transition-opacity duration-200 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-over Inspector Panel (Mobile) / Persistent Master-Detail Embedded Panel (Desktop lg:) */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:w-[680px] z-50 bg-[#FCFDFC] border-l border-[#D5DFD9] shadow-tactile-lg flex flex-col min-h-0 overflow-hidden transform transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen
            ? 'translate-x-0 opacity-100 lg:static lg:inset-auto lg:h-full lg:flex-1 lg:max-w-none lg:z-auto lg:rounded-2xl lg:border lg:border-[#D5DFD9] lg:shadow-tactile-sm'
            : 'translate-x-full pointer-events-none opacity-0'
        }`}
        aria-label="Panel Inspeksi Kandidat"
        role="dialog"
        aria-modal="true"
      >
        {/* Header: Candidate Identity & Segmented Decision Bar */}
        <header className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-[#D5DFD9] bg-[#FCFDFC] flex flex-col gap-2.5 shrink-0 shadow-tactile-sm">
          {/* Top Row: Candidate Identity (Left) + Skor Fit & Close Button (Right) */}
          <div className="flex items-center justify-between gap-3 min-w-0">
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
                    className={`font-mono text-[9px] px-1.5 py-0.2 rounded border shrink-0 ${
                      candidate.band === 'A'
                        ? 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD]'
                        : candidate.band === 'B'
                        ? 'bg-[#FEF6E8] text-[#7A3E02] border-[#F8D8A7]'
                        : 'bg-[#FCEBEB] text-[#8C1819] border-[#F6C1C1]'
                    }`}
                  >
                    Band {candidate.band}
                  </span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded border shrink-0 font-bold bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD] shadow-tactile-sm">
                    {telemetry.scoring_mode}
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

            {/* Skor Fit & Close Button */}
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
          </div>

          {/* Bottom Row: Segmented Decision Switch Bar */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#EBF1EE]">
            <span className="text-[11px] font-mono font-semibold text-[#13221C] shrink-0 hidden sm:inline">
              Keputusan:
            </span>

            {/* Segmented Decision Switch */}
            <div className="grid grid-cols-4 w-full sm:w-auto sm:flex sm:items-center bg-[#F2F5F3] p-0.5 rounded-xl border border-[#D5DFD9] shadow-tactile-sm shrink-0">
              {/* Belum Ada */}
              <button
                type="button"
                onClick={() => onDecision(candidate.cv_id, 'NONE')}
                className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center space-x-1 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D4439] shrink-0 ${
                  !candidate.decision || candidate.decision === 'NONE'
                    ? 'bg-[#EBF1EE] text-[#13221C] border border-[#D5DFD9] shadow-tactile-sm'
                    : 'text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-transparent'
                }`}
                title="Belum Ada"
              >
                <CircleDot className="w-3.5 h-3.5 text-[#2D4439] shrink-0" />
                <span>Belum Ada</span>
              </button>

              {/* Shortlist */}
              <button
                type="button"
                onClick={() => onDecision(candidate.cv_id, 'SHORTLIST')}
                className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center space-x-1 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124B2E] shrink-0 ${
                  candidate.decision === 'SHORTLIST'
                    ? 'bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD] shadow-tactile-sm'
                    : 'text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-transparent'
                }`}
                title="Shortlist"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#124B2E] shrink-0" />
                <span>Shortlist</span>
              </button>

              {/* Hold */}
              <button
                type="button"
                onClick={() => onDecision(candidate.cv_id, 'HOLD')}
                className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center space-x-1 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A3E02] shrink-0 ${
                  candidate.decision === 'HOLD'
                    ? 'bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7] shadow-tactile-sm'
                    : 'text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-transparent'
                }`}
                title="Hold / Talent Pool"
              >
                <Clock className="w-3.5 h-3.5 text-[#7A3E02] shrink-0" />
                <span>Hold</span>
              </button>

              {/* Tolak */}
              <button
                type="button"
                onClick={() => onDecision(candidate.cv_id, 'TIDAK_LANJUT')}
                className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center space-x-1 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1819] shrink-0 ${
                  candidate.decision === 'TIDAK_LANJUT'
                    ? 'bg-[#FCEBEB] text-[#8C1819] border border-[#F6C1C1] shadow-tactile-sm'
                    : 'text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-transparent'
                }`}
                title="Tolak"
              >
                <XCircle className="w-3.5 h-3.5 text-[#8C1819] shrink-0" />
                <span>Tolak</span>
              </button>
            </div>
          </div>
        </header>

        {/* Integrated Tab Bar: Evaluasi · Jejak Penalaran · Kutipan CV */}
        <div className="px-3 sm:px-5 py-2 bg-[#F7FAF8] border-b border-[#D5DFD9] flex items-center justify-between gap-2.5 shrink-0 min-w-0">
          {/* Tab Controls (Equal 3-column Grid) */}
          <div className="flex-1 min-w-0">
            <div className="w-full grid grid-cols-3 bg-[#EBF1EE] p-0.5 rounded-xl border border-[#D5DFD9] gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('evaluation')}
                className={`h-7 px-1.5 sm:px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all duration-150 cursor-pointer whitespace-nowrap min-w-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] ${
                  activeTab === 'evaluation'
                    ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
                    : 'text-[#2D4439] hover:text-[#13221C] hover:bg-black/[0.03] border border-transparent'
                }`}
                title="Evaluasi Forensik Kandidat"
              >
                <Award className="w-3.5 h-3.5 text-[#1B4938] shrink-0" />
                <span className="whitespace-nowrap">Evaluasi</span>
                <span className="font-mono tabular-nums text-[10px] bg-[#E2E9E5] text-[#1B4938] font-bold px-1.5 py-0.2 rounded shrink-0">
                  {requirements.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('trajectory')}
                className={`h-7 px-1.5 sm:px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all duration-150 cursor-pointer whitespace-nowrap min-w-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] ${
                  activeTab === 'trajectory'
                    ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
                    : 'text-[#2D4439] hover:text-[#13221C] hover:bg-black/[0.03] border border-transparent'
                }`}
                title="Jejak Penalaran AI"
              >
                <Terminal className="w-3.5 h-3.5 text-[#1B4938] shrink-0" />
                <span className="whitespace-nowrap">Jejak Penalaran</span>
                {candidate.reasoning_trajectory && candidate.reasoning_trajectory.length > 0 && (
                  <span className="font-mono tabular-nums text-[10px] bg-[#E2E9E5] text-[#124B2E] font-bold px-1.5 py-0.2 rounded shrink-0">
                    {candidate.reasoning_trajectory.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('grounding')}
                className={`h-7 px-1.5 sm:px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all duration-150 cursor-pointer whitespace-nowrap min-w-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] ${
                  activeTab === 'grounding'
                    ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
                    : 'text-[#2D4439] hover:text-[#13221C] hover:bg-black/[0.03] border border-transparent'
                }`}
                title="Kutipan Berkas CV Asli (Grounding)"
              >
                <FileText className="w-3.5 h-3.5 text-[#1B4938] shrink-0" />
                <span className="whitespace-nowrap">Kutipan CV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Inspector Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-0">
          {/* TAB 1: EVALUASI FORENSIK (Progressive Disclosure) */}
          {activeTab === 'evaluation' && (
            <div className="space-y-4">
              {/* Screening Telemetry Avionics HUD */}
              <ScreeningTelemetryPanel telemetry={telemetry} />

              {/* Highlight Banner: Syarat Wajib yang Belum Terpenuhi / Perlu Cek */}
              {mustHavePartialOrUnproven.length > 0 && (
                <section className="bg-[#FEF6E8] border-2 border-[#F8D8A7] rounded-2xl p-4 shadow-tactile space-y-3 animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F8D8A7]/70 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-[#7A3E02] shrink-0" />
                      <h3 className="text-xs font-bold text-[#7A3E02] uppercase tracking-wider">
                        Syarat Wajib yang Belum Terpenuhi / Perlu Cek ({mustHavePartialOrUnproven.length} Kriteria)
                      </h3>
                    </div>
                    <span className="font-mono text-[10px] font-bold bg-[#7A3E02] text-[#FCFDFC] px-2 py-0.5 rounded-full">
                      Perlu Evaluasi Manual
                    </span>
                  </div>

                  <p className="text-xs text-[#7A3E02] leading-relaxed">
                    Kandidat ini belum membuktikan secara penuh kualifikasi wajib mutlak berikut. Klik <strong>Lihat Kriteria Ini</strong> untuk memeriksa bukti dan catatan analisis pada kriteria terkait:
                  </p>

                  <div className="space-y-2">
                    {mustHavePartialOrUnproven.map((r) => {
                      const state = candidate.requirement_states[r.requirement_id] || 'NOT_DEMONSTRATED'
                      const isPartial = state === 'PARTIAL'
                      const evList = candidate.evidence[r.requirement_id] || []
                      const firstQuote = evList[0]?.quote
                      const unprovenItem = candidate.explanation.unproven?.find((u) => u.requirement_id === r.requirement_id)

                      return (
                        <div
                          key={`deficit-${r.requirement_id}`}
                          className="p-3 bg-[#FCFDFC] border border-[#F8D8A7] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-tactile-sm"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-xs bg-[#FEF6E8] text-[#7A3E02] px-2 py-0.5 rounded border border-[#F8D8A7]">
                                {r.requirement_id}
                              </span>
                              <span className="font-semibold text-xs text-[#13221C]">
                                {r.description}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  isPartial
                                    ? 'bg-[#FEF6E8] text-[#7A3E02] border-[#F8D8A7]'
                                    : 'bg-[#FCEBEB] text-[#8C1819] border-[#F6C1C1]'
                                }`}
                              >
                                {isPartial ? 'Sebagian (PARTIAL)' : 'Tidak Tercantum'}
                              </span>
                              <span className="font-mono text-[11px] text-[#2D4439]/80">
                                Bobot: {r.weight}%
                              </span>
                            </div>

                            {firstQuote ? (
                              <p className="font-mono text-[10px] text-[#7A3E02] italic line-clamp-1">
                                &ldquo;{firstQuote}&rdquo;
                              </p>
                            ) : unprovenItem?.note ? (
                              <p className="text-[10px] text-[#7A3E02] italic line-clamp-1">
                                Catatan AI: {unprovenItem.note}
                              </p>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleScrollToCriterion(r.requirement_id)}
                            className="h-7 px-3 bg-[#FEF6E8] hover:bg-[#FBEED7] text-[#7A3E02] hover:text-[#5C2E01] border border-[#F8D8A7] rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 shrink-0 shadow-tactile-sm"
                            title={`Lihat kriteria ${r.requirement_id} di matriks evaluasi`}
                          >
                            <Eye className="w-3.5 h-3.5 text-[#7A3E02]" />
                            <span>Lihat Kriteria Ini</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Ringkasan Eksekutif */}
              <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 shadow-tactile space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E9E5] pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-[#1B4938]" />
                    <h3 className="text-xs font-bold text-[#13221C] uppercase tracking-wider">
                      Ringkasan Eksekutif
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#2D4439]">
                    Saran Rekomendasi (Decision-Support):{' '}
                    <strong className="text-[#13221C]">
                      {candidate.recommendation.replace('_', ' ')}
                    </strong>
                  </span>
                </div>

                {/* BLOK 1: Kualifikasi Wajib (Must-Have) */}
                <div className="space-y-2.5 bg-[#F5F8F6] p-3.5 rounded-xl border border-[#D5DFD9]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold bg-[#1B4938] text-[#FCFDFC] px-2 py-0.5 rounded">
                        Blok 1
                      </span>
                      <h4 className="text-xs font-bold text-[#13221C] uppercase tracking-wider">
                        Kualifikasi Wajib (Must-Have)
                      </h4>
                    </div>
                    {allMustHavesMet ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#124B2E]" />
                        Semua Terpenuhi ({mustHaveReqs.length}/{mustHaveReqs.length})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7]">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#7A3E02]" />
                        {mustHavePartialOrUnproven.length} Perlu Dicek ({mustHaveFulfilled.length}/{mustHaveReqs.length})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#2D4439]">
                    Prasyarat mutlak lowongan. Seluruh syarat wajib harus terbukti secara verbatim dalam berkas CV kandidat.
                  </p>

                  <div className="space-y-2 pt-1">
                    {mustHaveReqs.length === 0 ? (
                      <p className="text-xs text-[#2D4439]/70 italic">Tidak ada syarat wajib yang ditentukan.</p>
                    ) : (
                      mustHaveReqs.map((r) => {
                        const state = candidate.requirement_states[r.requirement_id] || 'NOT_DEMONSTRATED'
                        const isStrong = state === 'STRONG'
                        const isPartial = state === 'PARTIAL'
                        const evList = candidate.evidence[r.requirement_id] || []
                        const quote = evList[0]?.quote
                        const unprovenItem = candidate.explanation.unproven?.find((u) => u.requirement_id === r.requirement_id)

                        return (
                          <div
                            key={`exec-must-${r.requirement_id}`}
                            className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all shadow-tactile-sm ${
                              isStrong
                                ? 'bg-[#EBF6EF]/50 border-[#BBE5CD]'
                                : isPartial
                                ? 'bg-[#FEF6E8]/60 border-[#F8D8A7]'
                                : 'bg-[#FCEBEB]/50 border-[#F6C1C1]'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <div className="flex items-center space-x-2 min-w-0">
                                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  isStrong
                                    ? 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD]'
                                    : isPartial
                                    ? 'bg-[#FEF6E8] text-[#7A3E02] border-[#F8D8A7]'
                                    : 'bg-[#FCEBEB] text-[#8C1819] border-[#F6C1C1]'
                                }`}>
                                  {r.requirement_id}
                                </span>
                                <span className="font-semibold text-[#13221C] text-[11px] truncate">
                                  {r.description}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <span className="font-mono text-[10px] text-[#2D4439]">
                                  Bobot {r.weight}%
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.2 rounded border ${
                                  isStrong
                                    ? 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD]'
                                    : isPartial
                                    ? 'bg-[#FEF6E8] text-[#7A3E02] border-[#F8D8A7]'
                                    : 'bg-[#FCEBEB] text-[#8C1819] border-[#F6C1C1]'
                                }`}>
                                  {isStrong ? 'Terbukti' : isPartial ? 'Perlu Dicek (Sebagian)' : 'Perlu Dicek (Tidak Ada)'}
                                </span>
                              </div>
                            </div>

                            {/* Kutipan Bukti Langsung */}
                            {quote ? (
                              <div className="flex items-start gap-1.5 pt-1">
                                <VerbatimGroundingChip isGrounded={isVerbatimGrounded(quote, candidate.full_text)} />
                                <p className="font-mono text-[10px] text-[#124B2E] italic break-words flex-1 min-w-0" title={quote}>
                                  &ldquo;{quote}&rdquo;
                                </p>
                              </div>
                            ) : unprovenItem?.note ? (
                              <p className="text-[10px] text-[#7A3E02] italic pt-0.5">
                                Catatan AI: {unprovenItem.note}
                              </p>
                            ) : (
                              <p className="text-[10px] text-[#8C1819] italic pt-0.5">
                                Belum ada bukti verbatim yang terverifikasi dalam teks CV.
                              </p>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* BLOK 2: Kualifikasi Nilai Tambah / Diutamakan (Nice-to-Have) */}
                <div className="space-y-2.5 bg-[#F5F8F6] p-3.5 rounded-xl border border-[#D5DFD9]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold bg-[#2D4439] text-[#FCFDFC] px-2 py-0.5 rounded">
                        Blok 2
                      </span>
                      <h4 className="text-xs font-bold text-[#13221C] uppercase tracking-wider">
                        Kualifikasi Nilai Tambah / Diutamakan (Nice-to-Have)
                      </h4>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD]">
                      <Sparkles className="w-3.5 h-3.5 text-[#124B2E]" />
                      {niceToHaveFulfilled.length} dari {niceToHaveReqs.length} Terbukti sebagai Poin Pembeda
                    </span>
                  </div>
                  <p className="text-[11px] text-[#2D4439]">
                    Kualifikasi diutamakan yang dipenuhi kandidat untuk memberikan nilai tambah kompetitif dibanding kandidat lain.
                  </p>

                  <div className="space-y-2 pt-1">
                    {niceToHaveFulfilled.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {niceToHaveFulfilled.map((r) => {
                          const evList = candidate.evidence[r.requirement_id] || []
                          const quote = evList[0]?.quote
                          return (
                            <div
                              key={`exec-nice-${r.requirement_id}`}
                              className="p-2.5 rounded-xl bg-[#EBF6EF]/50 border border-[#BBE5CD] text-xs space-y-1.5 shadow-tactile-sm"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-bold text-[#124B2E]">
                                  {r.requirement_id} • Bobot {r.weight}%
                                </span>
                                <span className="text-[9px] font-bold bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD] px-1.5 py-0.2 rounded">
                                  Poin Plus
                                </span>
                              </div>
                              <p className="font-semibold text-[#13221C] text-[11px]">{r.description}</p>
                              {quote && (
                                <div className="flex items-start gap-1.5 pt-0.5">
                                  <VerbatimGroundingChip isGrounded={isVerbatimGrounded(quote, candidate.full_text)} />
                                  <p className="font-mono text-[10px] text-[#124B2E] italic break-words flex-1 min-w-0" title={quote}>
                                    &ldquo;{quote}&rdquo;
                                  </p>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#FCFDFC] border border-[#D5DFD9] text-xs text-[#2D4439] italic text-center">
                        Belum ada kualifikasi nilai tambah / diutamakan yang terbukti pada kandidat ini.
                      </div>
                    )}
                  </div>
                </div>

                {/* Catatan Integritas / Flags */}
                {candidate.flags && candidate.flags.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#FEF6E8] border border-[#F8D8A7] text-xs space-y-1.5 shadow-tactile-sm">
                    <div className="flex items-center space-x-1.5 text-[#7A3E02] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#7A3E02] shrink-0" />
                      <span>Catatan Integritas Dokumen:</span>
                    </div>
                    <div className="space-y-1 text-[#7A3E02]">
                      {candidate.flags.map((flag, idx) => (
                        <div key={`flag-${idx}`} className="flex items-center gap-1.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7A3E02]" />
                          <span>Flag: <strong>{flag}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Matriks Kriteria & Bukti dengan Progressive Disclosure */}
              <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 shadow-tactile space-y-4">
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

                {/* Sub-Blok 1: Kualifikasi Wajib (Must-Have) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] font-bold bg-[#7A3E02] text-[#FCFDFC] px-2 py-0.5 rounded">
                        Kualifikasi Wajib (Must-Have)
                      </span>
                      <span className="text-xs font-bold text-[#13221C]">
                        {mustHaveReqs.length} Kriteria Prasyarat
                      </span>
                    </div>
                    {allMustHavesMet ? (
                      <span className="text-[10px] font-bold text-[#124B2E]">
                        ✓ Semua Terpenuhi
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#7A3E02]">
                        ⚠ {mustHavePartialOrUnproven.length} Perlu Dicek
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {mustHaveReqs.map(renderCriterionCard)}
                  </div>
                </div>

                {/* Sub-Blok 2: Kualifikasi Nilai Tambah / Diutamakan (Nice-to-Have) */}
                {niceToHaveReqs.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-[#E2E9E5]">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold bg-[#1B4938] text-[#FCFDFC] px-2 py-0.5 rounded">
                          Nilai Tambah / Diutamakan
                        </span>
                        <span className="text-xs font-bold text-[#13221C]">
                          {niceToHaveReqs.length} Kriteria Pembeda
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[#124B2E]">
                        {niceToHaveFulfilled.length}/{niceToHaveReqs.length} Terbukti
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {niceToHaveReqs.map(renderCriterionCard)}
                    </div>
                  </div>
                )}
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
              {/* Screening Telemetry Avionics HUD */}
              <ScreeningTelemetryPanel telemetry={telemetry} />

              <div className="bg-[#F5F8F6] p-3 rounded-xl border border-[#D5DFD9] text-xs text-[#2D4439] flex items-center justify-between">
                <span>
                  Jejak penalaran AI & verifikasi bukti kualifikasi langkah demi langkah
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
                    Kandidat ini dievaluasi langsung menggunakan verifikasi forensik bukti deterministik AI.
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
                          <div className="text-xs text-[#2D4439] pl-2 border-l-2 border-[#BBE5CD] py-1 font-mono space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <strong className="text-[#124B2E]">Observation: </strong>
                              <VerbatimGroundingChip isGrounded={true} />
                            </div>
                            <p className="leading-relaxed">{step.observation}</p>
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
              {/* Quick Jump Requirement Pills */}
              {requirements.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-[#FCFDFC] border border-[#D5DFD9]">
                  <span className="text-[10px] font-mono text-[#2D4439] uppercase font-bold shrink-0 flex items-center gap-1 mr-1">
                    <Sparkles className="w-3 h-3 text-[#1B4938]" />
                    Pilih Kriteria:
                  </span>
                  {requirements.map((r) => {
                    const evList = candidate.evidence?.[r.requirement_id] || []
                    const firstQuote = evList[0]?.quote || ''
                    const hasEvidence = evList.length > 0 && !!firstQuote
                    const isSelected = activeRequirement?.requirement_id === r.requirement_id
                    return (
                      <button
                        key={r.requirement_id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedReqId(null)
                            setHighlightedQuote(null)
                          } else {
                            setSelectedReqId(r.requirement_id)
                            setHighlightedQuote(firstQuote || null)
                            setGroundingSearchTerm('')
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#1B4938] text-white shadow-tactile-sm ring-2 ring-[#1B4938]/30'
                            : hasEvidence
                            ? 'bg-[#F0F4F2] text-[#13221C] hover:bg-[#E2EBE5] border border-[#D5DFD9]'
                            : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6] border border-[#E5E7EB]'
                        }`}
                        title={`${r.requirement_id}: ${r.description}`}
                      >
                        <span>{r.requirement_id}</span>
                        {hasEvidence && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-emerald-300' : 'bg-[#1B4938]'
                            }`}
                          />
                        )}
                      </button>
                    )
                  })}
                  {activeRequirement && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReqId(null)
                        setHighlightedQuote(null)
                      }}
                      className="ml-auto text-[10px] font-mono text-[#7A3E02] bg-[#FEF6E8] hover:bg-[#FEEFD8] px-2 py-0.5 rounded border border-[#F8D8A7] cursor-pointer"
                    >
                      Reset Pilihan
                    </button>
                  )}
                </div>
              )}

              {/* Detail Kriteria Terpilih (Muncul Persis di Bawahnya) */}
              {activeRequirement && (
                <div className="p-3.5 rounded-2xl bg-[#FCFDFC] border-2 border-[#1B4938]/40 shadow-tactile space-y-2.5 transition-all animate-in fade-in duration-200">
                  {/* Header: ID, Badge Evaluasi, Bobot, Status Pemenuhan */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E9E5] pb-2">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-white bg-[#1B4938] px-2 py-0.5 rounded shadow-tactile-sm">
                        {activeRequirement.requirement_id}
                      </span>
                      <DualLayerCriterionBadge req={activeRequirement} />
                      {activeRequirement.importance === 'MUST_HAVE' && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7]">
                          Wajib (Must-Have)
                        </span>
                      )}
                      <span className="font-mono text-xs tabular-nums text-[#2D4439]">
                        Bobot: <strong>{activeRequirement.weight}%</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {(() => {
                        const state =
                          candidate.requirement_states[activeRequirement.requirement_id] ||
                          'NOT_DEMONSTRATED'
                        return (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                              state === 'STRONG'
                                ? 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD]'
                                : state === 'PARTIAL'
                                ? 'bg-[#FEF6E8] text-[#7A3E02] border-[#F8D8A7]'
                                : 'bg-[#FCEBEB] text-[#8C1819] border-[#F6C1C1]'
                            }`}
                          >
                            {state === 'STRONG'
                              ? 'Terbukti (Strong Match)'
                              : state === 'PARTIAL'
                              ? 'Terbukti Sebagian (Partial)'
                              : 'Tidak Tercantum dalam Berkas'}
                          </span>
                        )
                      })()}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReqId(null)
                          setHighlightedQuote(null)
                        }}
                        className="p-1 rounded-lg hover:bg-black/5 text-[#2D4439] cursor-pointer"
                        title="Tutup Detail Kriteria"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Deskripsi Lengkap Kriteria */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#2D4439] font-bold">
                      Kriteria Lowongan:
                    </div>
                    <p className="text-xs font-semibold text-[#13221C] leading-snug">
                      {activeRequirement.description}
                    </p>
                  </div>

                  {/* Kutipan Bukti yang Disorot */}
                  {highlightedQuote ? (
                    <div className="p-3 rounded-xl bg-[#FEF6E8] border border-[#F8D8A7] flex items-center justify-between gap-3 text-xs shadow-tactile-sm">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-[#7A3E02] uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#7A3E02]" />
                            Kutipan Bukti Terverifikasi:
                          </span>
                          <VerbatimGroundingChip
                            isGrounded={isVerbatimGrounded(highlightedQuote, candidate.full_text)}
                          />
                          {isMatchFound ? (
                            <span className="font-mono text-[9px] text-[#124B2E] bg-[#EBF6EF] px-1.5 py-0.5 rounded border border-[#BBE5CD] font-bold">
                              Ditemukan dalam Berkas ({matchCount} lokasi) ✓
                            </span>
                          ) : (
                            <span className="font-mono text-[9px] text-[#1E3A5F] bg-[#F0F4F8] px-1.5 py-0.5 rounded border border-[#CBD5E1] font-bold">
                              Semantic Match (Makna Kontekstual)
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-[#713F12] select-text leading-relaxed bg-white/70 p-2 rounded-lg border border-[#F8D8A7]">
                          &ldquo;{highlightedQuote}&rdquo;
                        </p>
                      </div>

                      {isMatchFound && (
                        <div className="shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById('active-cv-highlight')
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#1B4938] hover:bg-[#153A2D] text-white text-[10px] font-bold cursor-pointer shadow-tactile-sm flex items-center gap-1 transition-all active:scale-95"
                          >
                            <span>Scroll ke Sorotan</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-[#F0F4F2] border border-[#D5DFD9] text-xs text-[#2D4439] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#8C1819]" />
                      <span className="font-mono text-[11px]">
                        Tidak ada kutipan bukti spesifik yang terverifikasi untuk kriteria ini pada berkas CV.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Target Highlight Banner (jika ada highlightedQuote tapi tidak ada activeRequirement) */}
              {!activeRequirement && highlightedQuote && (
                <div className="p-3 rounded-xl bg-[#FEF6E8] border border-[#F8D8A7] flex items-center justify-between gap-3 text-xs shadow-tactile-sm">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-[#7A3E02] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#7A3E02]" />
                        Menyorot Bukti Kutipan:
                      </span>
                      {isMatchFound ? (
                        <span className="font-mono text-[9px] text-[#124B2E] bg-[#EBF6EF] px-1.5 py-0.5 rounded border border-[#BBE5CD] font-bold">
                          Ditemukan dalam Berkas ({matchCount} lokasi) ✓
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] text-[#1E3A5F] bg-[#F0F4F8] px-1.5 py-0.5 rounded border border-[#CBD5E1] font-bold">
                          Semantic Match (Makna Kontekstual)
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-[#713F12] select-text break-words line-clamp-2" title={highlightedQuote}>
                      &ldquo;{highlightedQuote}&rdquo;
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isMatchFound && (
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('active-cv-highlight')
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }}
                        className="px-2 py-1 rounded-lg bg-[#FCFDFC] hover:bg-[#F3ECE0] border border-[#D5DFD9] text-[10px] font-bold text-[#7A3E02] cursor-pointer shadow-tactile-sm"
                      >
                        Scroll ke Sorotan
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightedQuote(null)
                        setGroundingSearchTerm('')
                      }}
                      className="p-1 rounded-lg hover:bg-black/5 text-[#7A3E02] cursor-pointer"
                      title="Reset Sorotan"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

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
                  {(highlightedQuote || groundingSearchTerm) && (
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
                  {highlightedContent}
                </pre>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
