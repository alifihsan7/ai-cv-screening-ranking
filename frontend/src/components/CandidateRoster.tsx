import React, { useState, useMemo } from 'react'
import {
  Search,
  Eye,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react'
import type { CandidateDetail, Requirement } from '../types'
import { CustomSelect, type SelectOption } from './CustomSelect'

const DECISION_OPTIONS: SelectOption[] = [
  {
    value: '',
    label: 'Belum Diputuskan',
    dotClassName: 'bg-[#8C9B93]',
    labelClassName: 'text-[#2D4439] font-medium',
    containerClassName: 'bg-[#FCFDFC] hover:bg-[#F2F5F3] border-[#D5DFD9] text-[#2D4439]',
  },
  {
    value: 'SHORTLIST',
    label: 'Shortlist',
    dotClassName: 'bg-[#124B2E]',
    labelClassName: 'text-[#124B2E] font-bold',
    containerClassName: 'bg-[#EBF6EF] hover:bg-[#E2F1E7] border-[#BBE5CD] text-[#124B2E]',
  },
  {
    value: 'HOLD',
    label: 'Hold',
    dotClassName: 'bg-[#7A3E02]',
    labelClassName: 'text-[#7A3E02] font-bold',
    containerClassName: 'bg-[#FEF6E8] hover:bg-[#FBEED7] border-[#F8D8A7] text-[#7A3E02]',
  },
  {
    value: 'TIDAK_LANJUT',
    label: 'Tidak Lanjut',
    dotClassName: 'bg-[#8C1819]',
    labelClassName: 'text-[#8C1819] font-bold',
    containerClassName: 'bg-[#FCEBEB] hover:bg-[#F9DDDD] border-[#F6C1C1] text-[#8C1819]',
  },
]

export interface CandidateRosterProps {
  candidates: CandidateDetail[]
  requirements: Requirement[]
  selectedCandidateId: string | null
  onSelectCandidate: (candidate: CandidateDetail) => void
  blindMode: boolean
  onToggleBlindMode: () => void
  onDecision: (
    cv_id: string,
    decision?: 'SHORTLIST' | 'HOLD' | 'TIDAK_LANJUT' | 'NONE' | '' | null
  ) => void
  onRevealCandidate: (cv_id: string) => void
  onOpenInspector: (candidate?: CandidateDetail) => void
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
  onOpenInspector,
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
    const aiVerified = candidates.filter(
      (c) =>
        c.verifier_provider === 'JEV_TYPESAFE' ||
        (c.reasoning_trajectory && c.reasoning_trajectory.length > 0)
    ).length

    return { total, shortlist, hold, rejected, pending, aiVerified, jevVerified: aiVerified }
  }, [candidates])

  // Must-have requirements count helper
  const mustHaveReqs = useMemo(() => {
    return requirements.filter((r) => r.importance === 'MUST_HAVE')
  }, [requirements])

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
    <div className="flex-1 w-full bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile-sm overflow-hidden flex flex-col h-full min-h-0 select-none">
      {/* 1. Filter Band Taktil & Quick Stats Bar (Linear-Style Header) */}
      <header className="p-3.5 sm:px-5 sm:py-3.5 border-b border-[#D5DFD9] bg-[#FCFDFC] space-y-3 shrink-0">
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
            title="Toggle Blind Screening Mode"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Blind Mode: {blindMode ? 'Aktif' : 'Non-aktif'}</span>
          </button>
        </div>

        {/* Bottom Row: Quick Stats Metric Bar */}
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
              {stats.aiVerified} AI Verified
            </span>
            <span className="text-[#D5DFD9]">·</span>
            <span className="inline-flex items-center gap-1 text-[#124B2E] font-bold font-mono text-[10px] bg-[#EBF6EF] px-1.5 py-0.5 rounded border border-[#BBE5CD] shadow-tactile-sm">
              JEV_HYBRID
            </span>
          </div>
        </div>
      </header>

      {/* 2. Full-Width Table / Roster */}
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 pb-20">
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
                <th className="py-2.5 px-3 w-[60px] text-center">Rank</th>
                <th className="py-2.5 px-4 min-w-[240px] max-w-[360px]">Kandidat & Berkas</th>
                <th className="py-2.5 px-3.5 w-[160px]">Kualifikasi Wajib</th>
                <th className="py-2.5 px-3.5 w-[120px] text-right">Skor Fit</th>
                <th className="py-2.5 px-3.5 w-[170px]">Status Keputusan</th>
                <th className="py-2.5 px-4 w-[110px] text-right">Aksi</th>
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
                    <td className="py-3 px-3 w-[60px] text-center">
                      <div className="w-8 h-6.5 mx-auto rounded-lg bg-[#EBF1EE] group-hover:bg-[#FCFDFC] border border-[#D5DFD9] flex items-center justify-center font-mono font-bold text-xs text-[#1B4938] shadow-tactile-sm transition-colors">
                        #{String(c.rank).padStart(2, '0')}
                      </div>
                    </td>

                    {/* 2. Kandidat: Name/Blind ID + File + Reveal */}
                    <td className="py-3 px-4 min-w-[240px] max-w-[360px]">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-[#13221C] tracking-tight group-hover:text-[#1B4938] transition-colors truncate">
                            {displayName}
                          </span>

                          {blindMode && !c.revealed && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onRevealCandidate(c.cv_id)
                              }}
                              className="px-1.5 py-0.5 rounded bg-[#F2F5F3] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[10px] font-semibold text-[#1B4938] flex items-center space-x-1 cursor-pointer transition-colors shadow-tactile-sm shrink-0"
                              title="Buka Identitas Asli Kandidat"
                            >
                              <Eye className="w-2.5 h-2.5" />
                              <span>Reveal</span>
                            </button>
                          )}

                          <span
                            className={`font-mono text-[9px] px-1.5 py-0.2 rounded border shrink-0 ${getBandBadgeClass(
                              c.band
                            )}`}
                          >
                            Band {c.band}
                          </span>

                          <span className="font-mono text-[8.5px] px-1 py-0.2 rounded border font-semibold bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD] shrink-0">
                            {c.scoring_mode || (c.verifier_provider === 'JEV_TYPESAFE' ? 'JEV_HYBRID' : 'AI_FORENSIC')}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 text-[11px] text-[#2D4439] font-mono">
                          <FileText className="w-3 h-3 text-[#2D4439]/70 shrink-0" />
                          <span className="truncate max-w-[260px]">{c.file_name}</span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Kualifikasi Wajib Badge */}
                    <td className="py-3 px-3.5 w-[160px]">
                      {renderMustHaveStatus(c)}
                    </td>

                    {/* 4. Skor Fit */}
                    <td className="py-3 px-3.5 w-[120px] text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono tabular-nums font-bold text-base text-[#13221C] leading-none">
                          {c.final_score.toFixed(1)}
                        </span>
                        <span className="font-mono text-[10px] text-[#2D4439]/80 mt-0.5">
                          / 100
                        </span>
                      </div>
                    </td>

                    {/* 5. Dropdown Status Keputusan */}
                    <td className="py-3 px-3.5 w-[170px]">
                      <div
                        className="w-[165px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CustomSelect
                          value={c.decision && c.decision !== 'NONE' ? c.decision : ''}
                          onChange={(val) => {
                            onDecision(c.cv_id, val ? (val as 'SHORTLIST' | 'HOLD' | 'TIDAK_LANJUT') : '')
                          }}
                          options={DECISION_OPTIONS}
                          size="sm"
                          ariaLabel={`Status keputusan untuk ${displayName}`}
                        />
                      </div>
                    </td>

                    {/* 6. Aksi Detail / Inspeksi */}
                    <td className="py-3 px-4 w-[110px] text-right">
                      <div
                        className="flex items-center justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCandidate(c)
                            onOpenInspector(c)
                          }}
                          className="h-8 px-3 rounded-lg bg-[#EBF1EE] hover:bg-[#1B4938] text-[#1B4938] hover:text-[#FCFDFC] border border-[#D5DFD9] hover:border-[#1B4938] text-xs font-bold inline-flex items-center space-x-1.5 transition-all shadow-tactile-sm cursor-pointer active:scale-[0.98]"
                          title="Buka Panel Inspeksi Detail"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Detail</span>
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

      {/* 3. Workbench Card Footer */}
      <footer className="px-5 py-2.5 bg-[#F7FAF8] border-t border-[#D5DFD9] flex flex-wrap items-center justify-between gap-3 text-xs text-[#2D4439] shrink-0 font-mono">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-[#13221C]">
            {filteredCandidates.length}
          </span>
          <span className="text-[#2D4439]">
            dari {candidates.length} kandidat
          </span>
          {bandFilter !== 'ALL' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EBF1EE] text-[#1B4938] border border-[#D5DFD9] font-bold">
              Band {bandFilter}
            </span>
          )}
          {searchQuery && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EBF1EE] text-[#2D4439] border border-[#D5DFD9]">
              Filter: &quot;{searchQuery}&quot;
            </span>
          )}
        </div>

        <div className="hidden sm:flex items-center space-x-3 text-[11px] text-[#2D4439]/80">
          <span>Klik baris untuk inspeksi</span>
        </div>
      </footer>
    </div>
  )
}
