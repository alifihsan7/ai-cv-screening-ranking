import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Eye,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react'
import type { CandidateDetail, Requirement } from '../types'

export interface CandidateRosterProps {
  candidates: CandidateDetail[]
  requirements: Requirement[]
  selectedCandidateId: string | null
  onSelectCandidate: (candidate: CandidateDetail) => void
  blindMode: boolean
  onToggleBlindMode: () => void
  onDecision: (cv_id: string, decision: 'SHORTLIST' | 'HOLD' | 'TIDAK_LANJUT') => void
  onRevealCandidate: (cv_id: string) => void
  isInspectorOpen?: boolean
  onOpenInspector: (candidate?: CandidateDetail) => void
  onCloseInspector?: () => void
}

export const CandidateRoster: React.FC<CandidateRosterProps> = ({
  candidates,
  requirements,
  selectedCandidateId,
  onSelectCandidate,
  blindMode,
  onToggleBlindMode,
  onDecision,
  onRevealCandidate,
  isInspectorOpen = false,
  onOpenInspector,
  onCloseInspector,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [bandFilter, setBandFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL')

  // Filter candidates based on search & band
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (bandFilter !== 'ALL' && c.band !== bandFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const name = (blindMode && !c.revealed ? c.blind_id : c.real_name).toLowerCase()
        const file = c.file_name.toLowerCase()
        if (!name.includes(q) && !file.includes(q)) return false
      }
      return true
    })
  }, [candidates, bandFilter, searchQuery, blindMode])

  // Quick stats calculations
  const stats = useMemo(() => {
    const total = candidates.length
    const shortlist = candidates.filter((c) => c.decision === 'SHORTLIST').length
    const hold = candidates.filter((c) => c.decision === 'HOLD').length
    const rejected = candidates.filter((c) => c.decision === 'TIDAK_LANJUT').length
    const pending = candidates.filter((c) => !c.decision || c.decision === 'NONE').length
    const jevVerified = candidates.filter(
      (c) =>
        c.verifier_provider === 'JEV_TYPESAFE' ||
        (c.reasoning_trajectory && c.reasoning_trajectory.length > 0)
    ).length

    return { total, shortlist, hold, rejected, pending, jevVerified }
  }, [candidates])

  // Must-have requirements count helper
  const mustHaveReqs = useMemo(() => {
    return requirements.filter((r) => r.importance === 'MUST_HAVE')
  }, [requirements])

  // Power Keyboard Shortcuts (Linear-Style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside an input or textarea
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      if (filteredCandidates.length === 0) return

      const currentIndex = filteredCandidates.findIndex(
        (c) => c.cv_id === selectedCandidateId
      )

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex =
          currentIndex === -1 || currentIndex === filteredCandidates.length - 1
            ? 0
            : currentIndex + 1
        const nextCand = filteredCandidates[nextIndex]
        onSelectCandidate(nextCand)
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex =
          currentIndex <= 0 ? filteredCandidates.length - 1 : currentIndex - 1
        const prevCand = filteredCandidates[prevIndex]
        onSelectCandidate(prevCand)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (isInspectorOpen && onCloseInspector) {
          onCloseInspector()
        } else {
          const cand =
            currentIndex !== -1
              ? filteredCandidates[currentIndex]
              : filteredCandidates[0]
          if (cand) {
            onSelectCandidate(cand)
            onOpenInspector(cand)
          }
        }
      } else if (e.key === 'Escape') {
        if (isInspectorOpen && onCloseInspector) {
          e.preventDefault()
          onCloseInspector()
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (selectedCandidateId) {
          e.preventDefault()
          onDecision(selectedCandidateId, 'SHORTLIST')
        }
      } else if (e.key === 'h' || e.key === 'H') {
        if (selectedCandidateId) {
          e.preventDefault()
          onDecision(selectedCandidateId, 'HOLD')
        }
      } else if (e.key === 'x' || e.key === 'X') {
        if (selectedCandidateId) {
          e.preventDefault()
          onDecision(selectedCandidateId, 'TIDAK_LANJUT')
        }
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        onToggleBlindMode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    filteredCandidates,
    selectedCandidateId,
    isInspectorOpen,
    onSelectCandidate,
    onOpenInspector,
    onCloseInspector,
    onDecision,
    onToggleBlindMode,
  ])

  const getBandBadgeClass = (band: string) => {
    switch (band) {
      case 'A':
        return 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD] font-bold'
      case 'B':
        return 'bg-[#FEF6E8] text-[#7A3E02] border-[#F8D8A7] font-bold'
      case 'C':
        return 'bg-[#FCEBEB] text-[#8C1819] border-[#F6C1C1] font-bold'
      default:
        return 'bg-[#EBF1EE] text-[#2D4439] border-[#D5DFD9]'
    }
  }

  const renderDecisionPill = (c: CandidateDetail) => {
    if (c.decision === 'SHORTLIST') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD] shadow-tactile-sm">
          <span className="w-2 h-2 rounded-full bg-[#124B2E]" />
          <span>Shortlist</span>
        </span>
      )
    }
    if (c.decision === 'HOLD') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7] shadow-tactile-sm">
          <span className="w-2 h-2 rounded-full bg-[#7A3E02]" />
          <span>Hold</span>
        </span>
      )
    }
    if (c.decision === 'TIDAK_LANJUT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FCEBEB] text-[#8C1819] border border-[#F6C1C1] shadow-tactile-sm">
          <span className="w-2 h-2 rounded-full bg-[#8C1819]" />
          <span>Tidak Lanjut</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F2F5F3] text-[#2D4439] border border-[#D5DFD9]">
        <span className="w-2 h-2 rounded-full border border-[#2D4439]/40 bg-transparent" />
        <span>Belum Diputuskan</span>
      </span>
    )
  }

  const renderMustHaveStatus = (c: CandidateDetail) => {
    if (mustHaveReqs.length === 0) {
      return (
        <span className="text-[11px] font-mono text-[#2D4439]/70">
          Tidak ada syarat wajib
        </span>
      )
    }

    const fulfilledCount = mustHaveReqs.filter(
      (r) => c.requirement_states[r.requirement_id] === 'STRONG'
    ).length

    const isAllMet = fulfilledCount === mustHaveReqs.length

    if (isAllMet) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#124B2E] shrink-0" />
          <span>{fulfilledCount}/{mustHaveReqs.length} Terpenuhi</span>
        </span>
      )
    }

    const deficitCount = mustHaveReqs.length - fulfilledCount
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7]">
        <AlertTriangle className="w-3.5 h-3.5 text-[#7A3E02] shrink-0" />
        <span>{deficitCount} Perlu Dicek</span>
      </span>
    )
  }

  return (
    <div className="flex-1 w-full bg-[#FCFDFC] flex flex-col h-full overflow-hidden select-none">
      {/* 1. Filter Band Taktil & Quick Stats Bar (Linear-Style Header) */}
      <header className="p-3.5 sm:px-6 sm:py-3 border-b border-[#D5DFD9] bg-[#FCFDFC] space-y-3 shrink-0 shadow-tactile-sm">
        {/* Top Row: Search Input + Band Filter + Blind Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-3.5 h-3.5 text-[#2D4439] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kandidat, nama, atau berkas CV..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-[#F2F5F3] hover:bg-[#EBF1EE] focus:bg-[#FCFDFC] border border-[#D5DFD9] focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 rounded-xl text-xs text-[#13221C] placeholder-[#2D4439]/60 focus:outline-none transition-all shadow-tactile-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#2D4439] hover:text-[#13221C] cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Band Filter Segmented Pills */}
          <div className="flex items-center space-x-1 bg-[#EBF1EE] p-0.5 rounded-xl border border-[#D5DFD9]">
            {(['ALL', 'A', 'B', 'C'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBandFilter(b)}
                className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] ${
                  bandFilter === b
                    ? 'bg-[#1B4938] text-[#FCFDFC] shadow-tactile-sm font-bold'
                    : 'text-[#2D4439] hover:text-[#13221C]'
                }`}
              >
                {b === 'ALL' ? 'Semua Band' : `Band ${b}`}
              </button>
            ))}
          </div>

          {/* Blind Mode Toggle */}
          <button
            type="button"
            onClick={onToggleBlindMode}
            className={`h-7 px-3 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all duration-150 cursor-pointer shadow-tactile-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] ${
              blindMode
                ? 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD]'
                : 'bg-[#FCFDFC] text-[#2D4439] hover:text-[#13221C] border-[#D5DFD9]'
            }`}
            title="Toggle Blind Screening Mode (Shortcut: 'B')"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Blind Mode: {blindMode ? 'Aktif' : 'Non-aktif'}</span>
          </button>
        </div>

        {/* Bottom Row: Quick Stats Metric Bar + Keyboard Hints */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E2E9E5]">
          {/* Quick Stats Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="text-[#13221C] font-bold">
              {stats.total} <span className="text-[#2D4439] font-normal">Kandidat</span>
            </span>
            <span className="text-[#D5DFD9]">·</span>
            <span className="inline-flex items-center gap-1 text-[#124B2E] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#124B2E]" />
              {stats.shortlist} Shortlist
            </span>
            <span className="text-[#D5DFD9]">·</span>
            <span className="inline-flex items-center gap-1 text-[#7A3E02] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7A3E02]" />
              {stats.hold} Hold
            </span>
            <span className="text-[#D5DFD9]">·</span>
            <span className="inline-flex items-center gap-1 text-[#8C1819] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8C1819]" />
              {stats.rejected} Tolak
            </span>
            {stats.pending > 0 && (
              <>
                <span className="text-[#D5DFD9]">·</span>
                <span className="text-[#2D4439] font-medium">
                  {stats.pending} Belum Diputuskan
                </span>
              </>
            )}
            <span className="text-[#D5DFD9]">·</span>
            <span className="inline-flex items-center gap-1 text-[#1B4938] font-bold">
              <ShieldCheck className="w-3 h-3 text-[#124B2E]" />
              {stats.jevVerified} Jev Verified
            </span>
          </div>

          {/* Keyboard Ergonomics Indicator */}
          <div className="hidden lg:flex items-center space-x-2 text-[10px] text-[#2D4439] font-mono">
            <span>[J/K] Navigasi</span>
            <span>·</span>
            <span>[Enter] Inspeksi</span>
            <span>·</span>
            <span>[S/H/X] Keputusan</span>
            <span>·</span>
            <span>[Esc] Tutup</span>
          </div>
        </div>
      </header>

      {/* 2. Full-Width Table / Roster */}
      <div className="flex-1 overflow-y-auto">
        {filteredCandidates.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3 text-[#2D4439]">
            <HelpCircle className="w-10 h-10 mx-auto text-[#2D4439]/40" />
            <h4 className="text-sm font-bold text-[#13221C]">
              Tidak ada kandidat sesuai kriteria pencarian
            </h4>
            <p className="text-xs text-[#2D4439] max-w-sm mx-auto leading-relaxed">
              Coba sesuaikan kata kunci pencarian atau ganti filter band di bagian atas untuk melihat kandidat lain.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setBandFilter('ALL')
              }}
              className="px-3 py-1.5 rounded-lg bg-[#EBF1EE] hover:bg-[#D5DFD9] text-xs font-semibold text-[#13221C] cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            {/* Table Header */}
            <thead className="sticky top-0 z-10 bg-[#F7FAF8] border-b border-[#D5DFD9] text-[10px] font-mono uppercase tracking-wider text-[#2D4439] font-bold">
              <tr>
                <th className="py-2.5 px-4 w-16 text-center">Rank</th>
                <th className="py-2.5 px-4 min-w-[220px]">Kandidat & Berkas</th>
                <th className="py-2.5 px-4 w-44">Kualifikasi Wajib</th>
                <th className="py-2.5 px-4 w-32 text-right">Skor Fit</th>
                <th className="py-2.5 px-4 w-40">Status Keputusan</th>
                <th className="py-2.5 px-4 w-60 text-right">Aksi Cepat</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#E2E9E5]">
              {filteredCandidates.map((c) => {
                const isSelected = selectedCandidateId === c.cv_id
                const displayName =
                  blindMode && !c.revealed ? c.blind_id : c.real_name

                return (
                  <tr
                    key={c.cv_id}
                    onClick={() => {
                      onSelectCandidate(c)
                      onOpenInspector(c)
                    }}
                    className={`transition-colors duration-150 cursor-pointer group ${
                      isSelected
                        ? 'bg-[#EBF1EE]/70 ring-1 ring-inset ring-[#1B4938]/20'
                        : 'hover:bg-[#F5F8F6] bg-[#FCFDFC]'
                    }`}
                  >
                    {/* 1. Rank Badge */}
                    <td className="py-3 px-4 text-center">
                      <div className="w-9 h-7 mx-auto rounded-lg bg-[#EBF1EE] group-hover:bg-[#FCFDFC] border border-[#D5DFD9] flex items-center justify-center font-mono font-bold text-xs text-[#1B4938] shadow-tactile-sm transition-colors">
                        #{String(c.rank).padStart(2, '0')}
                      </div>
                    </td>

                    {/* 2. Kandidat: Name/Blind ID + File + Reveal */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-[#13221C] tracking-tight group-hover:text-[#1B4938] transition-colors">
                            {displayName}
                          </span>

                          {blindMode && !c.revealed && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onRevealCandidate(c.cv_id)
                              }}
                              className="px-1.5 py-0.5 rounded bg-[#F2F5F3] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[10px] font-semibold text-[#1B4938] flex items-center space-x-1 cursor-pointer transition-colors shadow-tactile-sm"
                              title="Buka Identitas Asli Kandidat"
                            >
                              <Eye className="w-2.5 h-2.5" />
                              <span>Reveal</span>
                            </button>
                          )}

                          <span
                            className={`font-mono text-[9px] px-1.5 py-0.2 rounded border ${getBandBadgeClass(
                              c.band
                            )}`}
                          >
                            Band {c.band}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 text-[11px] text-[#2D4439] font-mono">
                          <FileText className="w-3 h-3 text-[#2D4439]/70 shrink-0" />
                          <span className="truncate max-w-[240px]">{c.file_name}</span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Kualifikasi Wajib Badge */}
                    <td className="py-3 px-4">
                      {renderMustHaveStatus(c)}
                    </td>

                    {/* 4. Skor Fit */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono tabular-nums font-bold text-base text-[#13221C] leading-none">
                          {c.final_score.toFixed(1)}
                        </span>
                        <span className="font-mono text-[10px] text-[#2D4439]/80 mt-0.5">
                          / 100
                        </span>
                      </div>
                    </td>

                    {/* 5. Keputusan Status Pill */}
                    <td className="py-3 px-4">
                      {renderDecisionPill(c)}
                    </td>

                    {/* 6. Aksi Cepat + Inspeksi Button */}
                    <td className="py-3 px-4 text-right">
                      <div
                        className="flex items-center justify-end space-x-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Shortlist [S] Button */}
                        <button
                          type="button"
                          onClick={() => onDecision(c.cv_id, 'SHORTLIST')}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-tactile-sm ${
                            c.decision === 'SHORTLIST'
                              ? 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD]'
                              : 'bg-[#FCFDFC] hover:bg-[#EBF6EF] text-[#2D4439] hover:text-[#124B2E] border-[#D5DFD9]'
                          }`}
                          title="Shortlist (Shortcut: S)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Hold [H] Button */}
                        <button
                          type="button"
                          onClick={() => onDecision(c.cv_id, 'HOLD')}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-tactile-sm ${
                            c.decision === 'HOLD'
                              ? 'bg-[#FEF6E8] text-[#7A3E02] border-[#F8D8A7]'
                              : 'bg-[#FCFDFC] hover:bg-[#FEF6E8] text-[#2D4439] hover:text-[#7A3E02] border-[#D5DFD9]'
                          }`}
                          title="Hold (Shortcut: H)"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>

                        {/* Tolak [X] Button */}
                        <button
                          type="button"
                          onClick={() => onDecision(c.cv_id, 'TIDAK_LANJUT')}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-tactile-sm ${
                            c.decision === 'TIDAK_LANJUT'
                              ? 'bg-[#FCEBEB] text-[#8C1819] border-[#F6C1C1]'
                              : 'bg-[#FCFDFC] hover:bg-[#FCEBEB] text-[#2D4439] hover:text-[#8C1819] border-[#D5DFD9]'
                          }`}
                          title="Tidak Lanjut / Tolak (Shortcut: X)"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>

                        <div className="h-4 w-px bg-[#D5DFD9] mx-1" />

                        {/* Inspeksi Forensik Button */}
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCandidate(c)
                            onOpenInspector(c)
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#EBF1EE] hover:bg-[#1B4938] text-[#1B4938] hover:text-[#FCFDFC] border border-[#D5DFD9] hover:border-[#1B4938] text-xs font-bold flex items-center space-x-1.5 transition-all shadow-tactile-sm cursor-pointer"
                          title="Buka Panel Inspeksi Forensik (Enter)"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>Inspeksi</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
