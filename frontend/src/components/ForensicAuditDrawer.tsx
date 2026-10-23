import React, { useState, useEffect } from 'react'
import {
  X,
  ShieldCheck,
  Terminal,
  FileText,
  Cpu,
  Clock,
  Search,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react'
import type { CandidateDetail } from '../types'

export interface ForensicAuditDrawerProps {
  isOpen: boolean
  onClose: () => void
  candidate: CandidateDetail | null
  initialTab?: 'trajectory' | 'grounding'
  highlightedQuote?: string | null
  blindMode?: boolean
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

export const ForensicAuditDrawer: React.FC<ForensicAuditDrawerProps> = ({
  isOpen,
  onClose,
  candidate,
  initialTab = 'trajectory',
  highlightedQuote = null,
  blindMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'trajectory' | 'grounding'>(initialTab)
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab)
  const [searchTerm, setSearchTerm] = useState('')
  const [copied, setCopied] = useState(false)

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

  const displayName =
    blindMode && !candidate.revealed ? candidate.blind_id : candidate.real_name
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
      {/* Backdrop gelap transparan pudar */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-Over Drawer Container */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:w-[540px] lg:w-[620px] z-50 bg-[#FCFDFC] border-l border-[#D5DFD9] shadow-2xl flex flex-col transform transition-transform duration-200 ease-in-out select-none ${
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
                {isJevVerified && (
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border font-semibold bg-[#E6F4EA] text-[#134E35] border-[#A5D6B6] flex items-center space-x-1 shrink-0">
                    <ShieldCheck className="w-3 h-3 text-[#134E35]" />
                    <span>Jev Verified</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#40564D] font-mono truncate mt-0.5">
                Audit Telemetri Mesin Jev • {candidate.file_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#40564D] hover:text-[#13221C] hover:bg-[#EBF1EE] transition-colors cursor-pointer border border-transparent hover:border-[#D5DFD9] flex items-center gap-1 text-xs font-mono"
            title="Tutup Drawer (ESC)"
          >
            <span className="hidden sm:inline text-[10px] text-[#40564D]/80">ESC</span>
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Tab Navigation Switcher */}
        <div className="px-5 py-2.5 bg-[#F7FAF8] border-b border-[#D5DFD9] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-1 bg-[#EBF1EE] p-0.5 rounded-xl border border-[#D5DFD9]">
            <button
              type="button"
              onClick={() => setActiveTab('trajectory')}
              className={`h-7 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'trajectory'
                  ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
                  : 'text-[#40564D] hover:text-[#13221C]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-[#1B4938]" />
              <span>ReAct Trajectory Rail</span>
              {candidate.reasoning_trajectory && candidate.reasoning_trajectory.length > 0 && (
                <span className="font-mono tabular-nums text-[10px] bg-[#EBF1EE] text-[#134E35] font-bold px-1 rounded">
                  {candidate.reasoning_trajectory.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('grounding')}
              className={`h-7 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'grounding'
                  ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
                  : 'text-[#40564D] hover:text-[#13221C]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#2D6A4F]" />
              <span>Kutipan CV Asli (Grounding View)</span>
            </button>
          </div>

          <span className="text-[10px] font-mono text-[#40564D] shrink-0 hidden sm:inline">
            Provider: <strong>{candidate.verifier_provider || 'JEV_TYPESAFE'}</strong>
          </span>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: REASONING TRAJECTORY RAIL */}
          {activeTab === 'trajectory' && (
            <div className="space-y-4">
              <div className="bg-[#F5F8F6] p-3 rounded-xl border border-[#D5DFD9] text-xs text-[#40564D] flex items-center justify-between">
                <span>
                  Jejak penalaran agen otonom & verifikasi tipe-aman Jev langkah demi langkah
                  secara deterministik.
                </span>
              </div>

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

          {/* TAB 2: KUTIPAN CV ASLI (GROUNDING VIEW) */}
          {activeTab === 'grounding' && (
            <div className="space-y-3">
              {/* Grounding Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F5F8F6] p-2.5 rounded-xl border border-[#D5DFD9] text-xs">
                <span className="font-mono text-[#40564D] truncate">
                  Berkas Asli: <strong>{candidate.file_name}</strong>
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCopyCvText}
                    className="h-6 px-2 rounded-md bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[10px] font-semibold text-[#13221C] flex items-center space-x-1 cursor-pointer transition-colors shadow-tactile-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-[#1B6C47]" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#40564D]" />
                        <span>Salin Teks</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* In-text Filter / Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#40564D] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kata kunci di dalam teks CV..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#FCFDFC] hover:bg-[#F5F8F6] focus:bg-[#FCFDFC] border border-[#D5DFD9] focus:border-[#1B4938] rounded-lg text-xs text-[#13221C] placeholder-[#40564D]/60 focus:outline-none transition-all shadow-tactile-sm"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#40564D] hover:text-[#13221C] cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Target Highlight Banner (if initiated from a matrix quote click) */}
              {highlightedQuote && (
                <div className="p-2.5 rounded-xl bg-[#E6F4EA] border border-[#A5D6B6] flex items-start justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-mono text-[10px] font-bold text-[#134E35] uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#134E35]" />
                      Target Kutipan Verifikasi:
                    </span>
                    <p className="font-mono text-[11px] text-[#134E35] italic">
                      &quot;{highlightedQuote}&quot;
                    </p>
                  </div>
                </div>
              )}

              {/* Raw CV Content Container */}
              <div className="p-4 bg-[#F2F5F3] text-[#13221C] rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[560px] overflow-y-auto border border-[#D5DFD9] shadow-inner select-text">
                {defaultCvText}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
