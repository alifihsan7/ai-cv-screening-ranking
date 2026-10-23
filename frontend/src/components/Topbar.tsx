import React, { useState, useRef, useEffect } from 'react'
import {
  Briefcase,
  Sparkles,
  Eye,
  EyeOff,
  ChevronDown,
  Check,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react'
import type { WorkflowStep } from '../types'

export interface TopbarProps {
  currentStep?: WorkflowStep
  onStepChange?: (step: WorkflowStep) => void
  currentJobId: string | null
  currentJobTitle: string
  availableJobs: Array<{ id: string; title: string; cv_count: number }>
  onSelectJob: (id: string, title?: string) => void
  onRenameJob: () => void
  onDeleteJob: () => void
  onCreateNewJob: () => void
  criteriaCount?: number
  criteriaApproved?: boolean
  uploadedCount?: number
  readyCvCount?: number
  candidatesCount?: number
  blindMode: boolean
  onToggleBlindMode: () => void
  onLoadGoldenSample?: () => void
}

export const Topbar: React.FC<TopbarProps> = ({
  currentJobId,
  currentJobTitle,
  availableJobs,
  onSelectJob,
  onRenameJob,
  onDeleteJob,
  onCreateNewJob,
  readyCvCount = 0,
  blindMode,
  onToggleBlindMode,
  onLoadGoldenSample,
}) => {
  const [isJobSelectOpen, setIsJobSelectOpen] = useState(false)
  const jobSelectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (jobSelectRef.current && !jobSelectRef.current.contains(e.target as Node)) {
        setIsJobSelectOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeJob = availableJobs.find((j) => j.id === currentJobId)
  const displayTitle = currentJobTitle || activeJob?.title || 'Senior Backend Engineer'
  const displayCvCount = activeJob?.cv_count ?? readyCvCount ?? 15

  return (
    <header className="h-[46px] border-b border-[#D5DFD9] bg-[#FCFDFC] px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-30 gap-2">
      {/* Left: Brand Monogram + Job Popover Selector */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-6.5 h-6.5 rounded-lg bg-[#1B4938] flex items-center justify-center text-[#FCFDFC] font-bold text-xs shadow-tactile-sm shrink-0">
            <span className="font-mono text-[11px] tracking-tight">AI</span>
          </div>
          <span className="font-bold text-xs text-[#13221C] tracking-tight hidden lg:inline shrink-0">
            AI CV Screening
          </span>
        </div>

        <div className="h-4 w-px bg-[#D5DFD9] hidden md:block shrink-0" />

        {/* Custom Popover Job Selector Cluster */}
        <div className="relative shrink-0" ref={jobSelectRef}>
          <div className="flex items-center gap-1.5 shrink-0 bg-[#F5F8F6] p-0.5 rounded-xl border border-[#D5DFD9]">
            <button
              type="button"
              onClick={() => setIsJobSelectOpen((prev) => !prev)}
              aria-expanded={isJobSelectOpen}
              aria-haspopup="listbox"
              className="h-7.5 px-2.5 bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] rounded-lg text-xs font-semibold text-[#13221C] flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-tactile-sm shrink-0 active:scale-99"
              title="Pilih Lowongan Aktif"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#1B4938] shrink-0" />
              <span className="truncate max-w-[110px] sm:max-w-[160px] md:max-w-[200px] lg:max-w-[260px]">
                {displayTitle}
              </span>
              <span className="bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9] text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold tabular-nums shrink-0 whitespace-nowrap">
                {displayCvCount} CV
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#40564D] transition-transform duration-150 shrink-0 ${
                  isJobSelectOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={onRenameJob}
              disabled={!currentJobId}
              className="h-7.5 w-7.5 inline-flex items-center justify-center text-[#40564D] hover:text-[#1B4938] bg-[#FCFDFC] hover:bg-[#EBF1EE] rounded-lg border border-[#D5DFD9] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-tactile-sm shrink-0 active:scale-95"
              title="Ubah Nama Lowongan"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onDeleteJob}
              disabled={!currentJobId}
              className="h-7.5 w-7.5 inline-flex items-center justify-center text-[#40564D] hover:text-[#9E2A2B] bg-[#FCFDFC] hover:bg-[#FCEBEB] rounded-lg border border-[#D5DFD9] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-tactile-sm shrink-0 active:scale-95"
              title="Hapus Lowongan"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            <div className="h-4 w-px bg-[#D5DFD9] mx-0.5 shrink-0" />

            <button
              type="button"
              onClick={onCreateNewJob}
              className="h-7.5 px-2.5 text-[11px] bg-[#EBF6EF] hover:bg-[#DEF0E4] active:scale-98 text-[#1B4938] border border-[#BBE5CD] rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer shadow-tactile-sm shrink-0 whitespace-nowrap"
              title="Buat Lowongan Baru"
            >
              <Plus className="w-3 h-3 shrink-0 stroke-[2.5]" />
              <span className="whitespace-nowrap">Baru</span>
            </button>
          </div>

          {/* Job Dropdown Menu */}
          {isJobSelectOpen && (
            <div
              role="listbox"
              className="absolute left-0 mt-1.5 w-76 bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl shadow-tactile-lg z-50 py-1 space-y-0.5 max-h-72 overflow-y-auto"
            >
              <div className="px-3 py-1.5 border-b border-[#E2E9E5] text-[10px] font-bold text-[#40564D] uppercase tracking-wider flex items-center justify-between">
                <span>Daftar Lowongan Aktif</span>
                <span className="font-mono tabular-nums">{availableJobs.length} Tersedia</span>
              </div>
              {availableJobs.map((j) => {
                const isSelected = j.id === currentJobId
                return (
                  <button
                    key={j.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectJob(j.id, j.title)
                      setIsJobSelectOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF6EF] text-[#1B4938] font-bold border-l-3 border-[#1B4938]'
                        : 'text-[#13221C] hover:bg-[#EBF1EE] font-medium border-l-3 border-transparent'
                    }`}
                  >
                    <span className="truncate pr-2">{j.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9] tabular-nums whitespace-nowrap">
                        {j.cv_count} CV
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#1B4938]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick Action Shortcuts & Tactile Blind Mode Switch */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        {onLoadGoldenSample && (
          <button
            type="button"
            onClick={onLoadGoldenSample}
            className="h-7.5 px-2.5 rounded-lg bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[#13221C] text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-tactile-sm shrink-0 whitespace-nowrap"
            title="Muat 15 Berkas Sampel Terkalibrasi Golden Dataset"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8A4C05] shrink-0" />
            <span className="hidden sm:inline">Golden Dataset</span>
          </button>
        )}

        {/* Tactile Blind Mode Switch */}
        <button
          type="button"
          onClick={onToggleBlindMode}
          className={`h-7.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-tactile-sm active:scale-98 shrink-0 whitespace-nowrap ${
            blindMode
              ? 'bg-[#EBF6EF] border-[#BBE5CD] text-[#134E35]'
              : 'bg-[#FCFDFC] border-[#D5DFD9] text-[#40564D] hover:text-[#13221C]'
          }`}
          title="Pencegahan Bias Demografis & Kognitif (Shortcut: 'B')"
        >
          {blindMode ? (
            <EyeOff className="w-3.5 h-3.5 text-[#134E35] shrink-0" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-[#40564D] shrink-0" />
          )}
          <span className="font-mono text-[11px] hidden xs:inline">
            Blind: <strong>{blindMode ? 'ON' : 'OFF'}</strong>
          </span>
        </button>
      </div>
    </header>
  )
}
