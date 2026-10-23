import React, { useState, useMemo, useEffect } from 'react'
import { Search, HelpCircle, Eye } from 'lucide-react'
import type { CandidateDetail } from '../types'

export interface CandidateRosterProps {
  candidates: CandidateDetail[]
  selectedCandidateId: string | null
  onSelectCandidate: (candidate: CandidateDetail) => void
  blindMode: boolean
  onToggleBlindMode: () => void
  onDecision: (cv_id: string, decision: 'SHORTLIST' | 'HOLD' | 'TIDAK_LANJUT') => void
  onRevealCandidate: (cv_id: string) => void
  onToggleAuditDrawer?: () => void
}

export const CandidateRoster: React.FC<CandidateRosterProps> = ({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  blindMode,
  onToggleBlindMode,
  onDecision,
  onRevealCandidate,
  onToggleAuditDrawer,
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

  const jevVerifiedCount = useMemo(() => {
    return candidates.filter(
      (c) =>
        c.verifier_provider === 'JEV_TYPESAFE' ||
        (c.reasoning_trajectory && c.reasoning_trajectory.length > 0)
    ).length
  }, [candidates])

  // Power Keyboard Navigation
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
        onSelectCandidate(filteredCandidates[nextIndex])
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex =
          currentIndex <= 0 ? filteredCandidates.length - 1 : currentIndex - 1
        onSelectCandidate(filteredCandidates[prevIndex])
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
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        onToggleAuditDrawer?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    filteredCandidates,
    selectedCandidateId,
    onSelectCandidate,
    onDecision,
    onToggleBlindMode,
    onToggleAuditDrawer,
  ])

  // Minimalist tactile decision indicator (Option A)
  const renderMinimalDecisionIndicator = (cand: CandidateDetail) => {
    if (cand.decision === 'SHORTLIST') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#1B6C47]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1B6C47]" />
          Shortlist
        </span>
      )
    }
    if (cand.decision === 'HOLD') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#8A4C05]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8A4C05]" />
          Hold
        </span>
      )
    }
    if (cand.decision === 'TIDAK_LANJUT') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#9E2A2B]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9E2A2B]" />
          Tolak
        </span>
      )
    }
    if (cand.recommendation === 'SHORTLIST') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#1B6C47]/80">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1B6C47]/60" />
          Saran Shortlist
        </span>
      )
    }
    if (cand.recommendation === 'REVIEW') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#8A4C05]/80">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8A4C05]/60" />
          Perlu Review
        </span>
      )
    }
    if (cand.recommendation === 'MANUAL_CHECK') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#9E2A2B]/80">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9E2A2B]/60" />
          Cek Manual
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#40564D]/60">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D5DFD9]" />
        Belum Diputuskan
      </span>
    )
  }

  const getBandBadgeClass = (band: string) => {
    switch (band) {
      case 'A':
        return 'bg-[#EBF6EF] text-[#1B4938] border-[#BBE5CD]'
      case 'B':
        return 'bg-[#FEF6E8] text-[#8A4C05] border-[#F8D8A7]'
      case 'C':
        return 'bg-[#FCEBEB] text-[#9E2A2B] border-[#F6C1C1]'
      default:
        return 'bg-[#EBF1EE] text-[#40564D] border-[#D5DFD9]'
    }
  }

  return (
    <aside className="w-[38%] min-w-[320px] max-w-[480px] border-r border-[#D5DFD9] bg-[#F2F5F3] flex flex-col h-full overflow-hidden shrink-0">
      {/* Top Controls: Search + Filter Pills + Counter */}
      <div className="p-3 border-b border-[#D5DFD9] bg-[#FCFDFC] space-y-2.5 shrink-0">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#40564D] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kandidat, nama, atau berkas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#F2F5F3] hover:bg-[#EBF1EE] focus:bg-[#FCFDFC] border border-[#D5DFD9] focus:border-[#1B4938] rounded-lg text-xs text-[#13221C] placeholder-[#40564D]/70 focus:outline-none transition-all shadow-tactile-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#40564D] hover:text-[#13221C] cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Pills + Counter */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center space-x-1">
            {(['ALL', 'A', 'B', 'C'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBandFilter(b)}
                className={`h-6 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  bandFilter === b
                    ? 'bg-[#1B4938] text-[#FCFDFC] shadow-tactile-sm'
                    : 'bg-[#F2F5F3] hover:bg-[#EBF1EE] text-[#40564D] hover:text-[#13221C] border border-[#D5DFD9]'
                }`}
              >
                {b === 'ALL' ? 'Semua' : `Band ${b}`}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-mono text-[#40564D] tabular-nums font-medium text-right shrink-0">
            <strong>{filteredCandidates.length}</strong> Kandidat •{' '}
            <span className="text-[#134E35] font-semibold">{jevVerifiedCount} Jev</span>
          </div>
        </div>

        {/* Power Keyboard Shortcuts Hint */}
        <div className="flex items-center justify-between text-[10px] text-[#40564D] pt-0.5 border-t border-[#E2E9E5]/60 font-mono">
          <span>[J/K] Nav · [D] Audit Jev</span>
          <span>[S] Shortlist · [H] Hold · [X] Tolak</span>
        </div>
      </div>

      {/* Scrollable Streamlined Roster Cards (Option A) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredCandidates.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2 text-[#40564D]">
            <HelpCircle className="w-8 h-8 mx-auto text-[#40564D]/40" />
            <p className="text-xs font-semibold text-[#13221C]">
              Tidak ada kandidat sesuai filter
            </p>
            <p className="text-[11px] text-[#40564D] leading-relaxed">
              Coba sesuaikan kata kunci pencarian atau ganti filter band di atas.
            </p>
          </div>
        ) : (
          filteredCandidates.map((c) => {
            const isSelected = selectedCandidateId === c.cv_id
            const displayName =
              blindMode && !c.revealed ? c.blind_id : c.real_name

            return (
              <div
                key={c.cv_id}
                onClick={() => onSelectCandidate(c)}
                className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#EBF1EE] border-[#D5DFD9] border-l-4 border-l-[#1B4938] shadow-tactile'
                    : 'bg-[#FCFDFC] hover:bg-[#F5F8F6] border-[#D5DFD9] shadow-tactile-sm'
                }`}
              >
                {/* Baris 1: #Rank, Nama Kandidat/Blind ID (dengan Reveal), Skor Akhir, Badge Band Mini */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="font-mono text-xs font-bold text-[#40564D] tabular-nums shrink-0">
                      #{c.rank}
                    </span>
                    <h4 className="text-xs font-bold text-[#13221C] truncate tracking-tight">
                      {displayName}
                    </h4>
                    {blindMode && !c.revealed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRevealCandidate(c.cv_id)
                        }}
                        className="p-0.5 text-[#40564D] hover:text-[#1B4938] cursor-pointer shrink-0"
                        title="Buka Identitas Kandidat (Audit Log Dicatat)"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className="font-mono tabular-nums font-bold text-sm text-[#13221C]">
                      {c.final_score.toFixed(1)}
                    </span>
                    <span
                      className={`font-mono text-[9px] px-1.5 py-0.2 rounded border font-semibold ${getBandBadgeClass(
                        c.band
                      )}`}
                    >
                      Band {c.band}
                    </span>
                  </div>
                </div>

                {/* Baris 2: Subteks Berkas Ringkas + Indikator Keputusan Minimalis */}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-[10px] text-[#40564D] font-mono truncate">
                    {c.file_name}
                  </p>
                  <div className="shrink-0 flex items-center">
                    {renderMinimalDecisionIndicator(c)}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
