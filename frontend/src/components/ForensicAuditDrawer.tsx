import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  ShieldCheck,
  Terminal,
  FileText,
  Cpu,
  Clock,
  Search,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react'
import type { CandidateDetail, Requirement } from '../types'
import {
  ScreeningTelemetryPanel,
  DualLayerCriterionBadge,
  VerbatimGroundingChip,
} from './ScreeningTelemetryPanel'
import { getScreeningTelemetry } from '../utils/telemetry'

export interface ForensicAuditDrawerProps {
  isOpen: boolean
  onClose: () => void
  candidate: CandidateDetail | null
  requirements?: Requirement[]
  initialTab?: 'trajectory' | 'grounding'
  highlightedQuote?: string | null
  blindMode?: boolean
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

export const ForensicAuditDrawer: React.FC<ForensicAuditDrawerProps> = ({
  isOpen,
  onClose,
  candidate,
  requirements = [],
  initialTab = 'trajectory',
  highlightedQuote = null,
  blindMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'trajectory' | 'grounding'>(initialTab)
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab)
  const [searchTerm, setSearchTerm] = useState('')
  const [copied, setCopied] = useState(false)
  const [localQuote, setLocalQuote] = useState<string | null>(highlightedQuote)
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null)

  useEffect(() => {
    setLocalQuote(highlightedQuote)
  }, [highlightedQuote])

  // Sync activeTab when initialTab prop updates upon opening
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

  const telemetry = getScreeningTelemetry(candidate, requirements)

  const displayName =
    blindMode && !candidate.revealed ? candidate.blind_id : candidate.real_name
  const isAiVerified =
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

  const effectiveQuote = localQuote || highlightedQuote

  const activeRequirement = useMemo(() => {
    if (selectedReqId) {
      const found = requirements.find((r) => r.requirement_id === selectedReqId)
      if (found) return found
    }
    if (effectiveQuote && candidate?.evidence) {
      const found = requirements.find((r) => {
        const evList = candidate.evidence?.[r.requirement_id] || []
        return evList.some((e) => e.quote === effectiveQuote)
      })
      if (found) return found
    }
    return null
  }, [selectedReqId, effectiveQuote, requirements, candidate?.evidence])

  const { highlightedContent, isMatchFound, matchCount } = useMemo(() => {
    if (!defaultCvText) {
      return { highlightedContent: null, isMatchFound: false, matchCount: 0 }
    }

    let pattern = ''
    let isTarget = false

    if (effectiveQuote && effectiveQuote.trim().length >= 3) {
      const words = effectiveQuote.trim().split(/\s+/).filter(Boolean)
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
          // ignore
        }
      }
    }

    if (!pattern && searchTerm && searchTerm.trim().length >= 2) {
      try {
        const cleanTerm = escapeRegex(searchTerm.trim())
        if (new RegExp(cleanTerm, 'i').test(defaultCvText)) {
          pattern = cleanTerm
          isTarget = false
        }
      } catch {
        // ignore
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
              id={isFirst ? 'forensic-cv-highlight' : undefined}
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
  }, [defaultCvText, effectiveQuote, searchTerm])

  useEffect(() => {
    if (activeTab === 'grounding' && isMatchFound) {
      const timer = setTimeout(() => {
        const el = document.getElementById('forensic-cv-highlight')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [activeTab, isMatchFound, effectiveQuote, searchTerm])

  const handleCopyCvText = () => {
    navigator.clipboard.writeText(defaultCvText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Backdrop gelap transparan pudar */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40 transition-opacity duration-150"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-Over Drawer Container */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:w-[680px] lg:w-[780px] xl:w-[860px] z-50 bg-[#FCFDFC] border-l border-[#D5DFD9] shadow-2xl flex flex-col transform transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        aria-label="Forensic Audit Drawer"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Drawer */}
        <header className="px-5 py-3.5 border-b border-[#D5DFD9] bg-[#FCFDFC] flex items-center justify-between shrink-0 shadow-tactile-sm">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#EBF1EE] border border-[#D5DFD9] flex items-center justify-center font-mono font-bold text-xs text-[#1B4938] shrink-0">
              #{candidate.rank}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-[#13221C] truncate tracking-tight">
                  {displayName}
                </h3>
                {isAiVerified && (
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border font-bold bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD] flex items-center space-x-1 shrink-0">
                    <ShieldCheck className="w-3 h-3 text-[#124B2E]" />
                    <span>AI Verified</span>
                  </span>
                )}
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded border font-bold bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD] shadow-tactile-sm shrink-0">
                  {telemetry.scoring_mode}
                </span>
              </div>
              <p className="text-[11px] text-[#2D4439] font-mono truncate mt-0.5">
                Audit Telemetri AI • {candidate.file_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] transition-all duration-150 cursor-pointer border border-transparent hover:border-[#D5DFD9] flex items-center justify-center text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938]"
            title="Tutup Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Tab Navigation Switcher */}
        <div className="px-5 py-2.5 bg-[#F7FAF8] border-b border-[#D5DFD9] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-1 bg-[#EBF1EE] p-0.5 rounded-xl border border-[#D5DFD9]">
            <button
              type="button"
              onClick={() => setActiveTab('trajectory')}
              className={`h-7 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150 cursor-pointer ${
                activeTab === 'trajectory'
                  ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
                  : 'text-[#2D4439] hover:text-[#13221C]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-[#1B4938]" />
              <span>ReAct Trajectory Rail</span>
              {candidate.reasoning_trajectory && candidate.reasoning_trajectory.length > 0 && (
                <span className="font-mono tabular-nums text-[10px] bg-[#EBF1EE] text-[#124B2E] font-bold px-1 rounded">
                  {candidate.reasoning_trajectory.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('grounding')}
              className={`h-7 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150 cursor-pointer ${
                activeTab === 'grounding'
                  ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
                  : 'text-[#2D4439] hover:text-[#13221C]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#1B4938]" />
              <span>Kutipan CV Asli (Grounding View)</span>
            </button>
          </div>

          <span className="text-[10px] font-mono text-[#2D4439] shrink-0 hidden sm:inline">
            Mode: <strong className="text-[#13221C]">{telemetry.mode}</strong>
          </span>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Screening Telemetry Avionics HUD */}
          <ScreeningTelemetryPanel telemetry={telemetry} />
          {/* TAB 1: REASONING TRAJECTORY RAIL */}
          {activeTab === 'trajectory' && (
            <div className="space-y-4">
              <div className="bg-[#F5F8F6] p-3 rounded-xl border border-[#D5DFD9] text-xs text-[#2D4439] flex items-center justify-between">
                <span>
                  Jejak penalaran AI & verifikasi bukti kualifikasi langkah demi langkah
                  secara deterministik.
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
                    Kandidat ini belum memiliki jejak eksekusi reasoning bertahap. Verifikasi AI
                    mengevaluasi profil menggunakan aturan kualifikasi deterministik.
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
                          <span className="font-mono text-[10px] text-[#2D4439] tabular-nums flex items-center gap-1 font-semibold">
                            <Clock className="w-3 h-3 text-[#2D4439]/70" />
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
                          <span className="text-[#2D4439] block text-[10px] font-bold uppercase tracking-wider">
                            // Action Input
                          </span>
                          <pre className="whitespace-pre-wrap leading-tight text-[#13221C] font-mono text-[11px]">
                            {JSON.stringify(step.action_input, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Observation (Verbatim Evidence Box in Soft Mint Sage) */}
                      <div className="bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD] p-3 rounded-lg space-y-1.5 font-mono text-xs shadow-tactile-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#124B2E] uppercase tracking-wider">
                            <Terminal className="w-3 h-3 text-[#124B2E]" />
                            <span>Observation (Verbatim CV Grounding)</span>
                          </div>
                          <VerbatimGroundingChip isGrounded={true} />
                        </div>
                        <p className="font-mono text-xs text-[#124B2E] leading-relaxed whitespace-pre-wrap">
                          {step.observation}
                        </p>
                      </div>

                      {/* State Mutation */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#D5DFD9] text-[10px]">
                        <span className="font-bold text-[#2D4439] uppercase tracking-wider text-[10px]">
                          State Mutation:
                        </span>
                        <span className="font-mono font-bold text-[#124B2E] bg-[#EBF6EF] px-2.5 py-0.5 rounded-md border border-[#BBE5CD] text-xs shadow-tactile-sm">
                          {step.state_mutation}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: KUTIPAN CV ASLI (GROUNDING VIEW) */}
          {activeTab === 'grounding' && (
            <div className="space-y-3">
              {/* Grounding Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F5F8F6] p-2.5 rounded-xl border border-[#D5DFD9] text-xs">
                <span className="font-mono text-[#2D4439] truncate">
                  Berkas Asli: <strong>{candidate.file_name}</strong>
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCopyCvText}
                    className="h-6 px-2.5 rounded-md bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[10px] font-bold text-[#13221C] flex items-center space-x-1 cursor-pointer transition-colors shadow-tactile-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1B4938]"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-[#124B2E]" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#2D4439]" />
                        <span>Salin Teks</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Jump Requirement Pills */}
              {requirements.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-[#FCFDFC] border border-[#D5DFD9]">
                  <span className="text-[10px] font-mono text-[#2D4439] uppercase font-bold shrink-0 flex items-center gap-1 mr-1">
                    <Sparkles className="w-3 h-3 text-[#1B4938]" />
                    Kriteria:
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
                            setLocalQuote(null)
                          } else {
                            setSelectedReqId(r.requirement_id)
                            setLocalQuote(firstQuote || null)
                            setSearchTerm('')
                          }
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
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
                        setLocalQuote(null)
                      }}
                      className="ml-auto text-[9px] font-mono text-[#7A3E02] bg-[#FEF6E8] px-1.5 py-0.5 rounded border border-[#F8D8A7] cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}

              {/* Detail Kriteria Terpilih (Muncul Persis di Bawahnya) */}
              {activeRequirement && (
                <div className="p-3 rounded-xl bg-[#FCFDFC] border-2 border-[#1B4938]/40 shadow-tactile space-y-2 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#E2E9E5] pb-1.5">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="font-mono font-bold text-[10px] text-white bg-[#1B4938] px-1.5 py-0.5 rounded">
                        {activeRequirement.requirement_id}
                      </span>
                      <DualLayerCriterionBadge req={activeRequirement} />
                      <span className="font-mono text-[10px] text-[#2D4439]">
                        Bobot: <strong>{activeRequirement.weight}%</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReqId(null)
                        setLocalQuote(null)
                      }}
                      className="p-1 rounded-lg hover:bg-black/5 text-[#2D4439] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-xs font-semibold text-[#13221C] leading-snug">
                    {activeRequirement.description}
                  </p>
                </div>
              )}

              {/* In-text Filter / Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#2D4439] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kata kunci di dalam teks CV..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#FCFDFC] hover:bg-[#F5F8F6] focus:bg-[#FCFDFC] border border-[#D5DFD9] focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 rounded-lg text-xs text-[#13221C] placeholder-[#2D4439]/60 focus:outline-none transition-all shadow-tactile-sm"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#2D4439] hover:text-[#13221C] cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Target Highlight Banner (if initiated from a matrix quote click) */}
              {highlightedQuote && (
                <div className="p-3 rounded-xl bg-[#FEF6E8] border border-[#F8D8A7] flex items-center justify-between gap-3 text-xs shadow-tactile-sm">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-[#7A3E02] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#7A3E02]" />
                        Target Kutipan Verifikasi:
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
                    <p className="font-mono text-[11px] text-[#713F12] truncate select-text">
                      &quot;{highlightedQuote}&quot;
                    </p>
                  </div>
                  {isMatchFound && (
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('forensic-cv-highlight')
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }}
                      className="px-2 py-1 rounded-lg bg-[#FCFDFC] hover:bg-[#F3ECE0] border border-[#D5DFD9] text-[10px] font-bold text-[#7A3E02] cursor-pointer shadow-tactile-sm shrink-0"
                    >
                      Scroll ke Sorotan
                    </button>
                  )}
                </div>
              )}

              {/* Raw CV Content Container */}
              <div className="p-4 bg-[#F2F5F3] text-[#13221C] rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[560px] overflow-y-auto border border-[#D5DFD9] shadow-inner select-text">
                {highlightedContent}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
