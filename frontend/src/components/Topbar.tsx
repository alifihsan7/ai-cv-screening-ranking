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
  isLoading?: boolean
}

export const Topbar: React.FC<TopbarProps> = ({
  currentStep = 'setup',
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
  isLoading = false,
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
  const displayTitle = currentJobTitle || activeJob?.title || ''
  const displayCvCount = activeJob?.cv_count ?? readyCvCount ?? 0

  const stepLabels: Record<WorkflowStep, string> = {
    setup: '1. Setup',
    criteria: '2. Kriteria',
    upload: '3. Unggah CV',
    workbench: '4. Workbench',
  }

  return (
    <header className="h-[44px] border-b border-[#D5DFD9] bg-[#FCFDFC] px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 gap-2">
      {/* Left: Brand Monogram + Job Popover Selector + Workspace Indicator */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#1B4938] flex items-center justify-center text-[#FCFDFC] font-bold text-xs shadow-tactile-sm shrink-0 ring-1 ring-[#1B4938]/20">
            <span className="font-mono text-[11px] tracking-tight">AI</span>
          </div>
          <div className="hidden lg:flex flex-col shrink-0">
            <span className="font-bold text-xs text-[#13221C] tracking-tight leading-none">
              AI CV Screening
            </span>
            <span className="font-mono text-[9px] text-[#2D4439] tracking-wider uppercase font-semibold leading-none mt-0.5">
              Deterministic Verifier
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-[#D5DFD9] hidden md:block shrink-0" />

        {/* Custom Popover Job Selector */}
        <div className="relative shrink-0" ref={jobSelectRef}>
          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsJobSelectOpen((prev) => !prev)}
              aria-expanded={isJobSelectOpen}
              aria-haspopup="listbox"
              className="h-8 px-2.5 bg-[#F2F5F3] hover:bg-[#EBF1EE] border border-[#D5DFD9] hover:border-[#1B4938]/50 rounded-lg text-xs font-semibold text-[#13221C] flex items-center space-x-1.5 sm:space-x-2 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shadow-tactile-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] focus-visible:ring-offset-1 active:scale-[0.98]"
              title="Pilih Lowongan Aktif"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#1B4938] shrink-0" />
              {isLoading && !displayTitle ? (
                <span className="inline-block h-3.5 w-24 sm:w-32 bg-[#D5DFD9] rounded animate-pulse" />
              ) : (
                <span className="truncate max-w-[110px] sm:max-w-[160px] md:max-w-[200px] lg:max-w-[260px] font-bold">
                  {displayTitle || (isLoading ? 'Memuat lowongan...' : 'Pilih Lowongan')}
                </span>
              )}
              {isLoading && !activeJob ? (
                <span className="inline-block h-3.5 w-8 bg-[#D5DFD9] rounded animate-pulse" />
              ) : (
                <span className="bg-[#EBF1EE] text-[#2D4439] border border-[#D5DFD9] text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold tabular-nums shrink-0 whitespace-nowrap">
                  {displayCvCount} CV
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#2D4439] transition-transform duration-150 shrink-0 ${
                  isJobSelectOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={onRenameJob}
              disabled={!currentJobId}
              className="h-8 w-8 inline-flex items-center justify-center text-[#2D4439] hover:text-[#1B4938] bg-[#F2F5F3] hover:bg-[#EBF1EE] hover:border-[#1B4938]/40 rounded-lg border border-[#D5DFD9] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-tactile-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] focus-visible:ring-offset-1 active:scale-[0.96]"
              title="Ubah Nama Lowongan"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onDeleteJob}
              disabled={!currentJobId}
              className="h-8 w-8 inline-flex items-center justify-center text-[#2D4439] hover:text-[#8C1819] bg-[#F2F5F3] hover:bg-[#FCEBEB] hover:border-[#F6C1C1] rounded-lg border border-[#D5DFD9] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-tactile-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1819] focus-visible:ring-offset-1 active:scale-[0.96]"
              title="Hapus Lowongan"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onCreateNewJob}
              className="h-8 px-2.5 text-xs bg-[#EBF6EF] hover:bg-[#DEF0E4] text-[#124B2E] border border-[#BBE5CD] rounded-lg font-bold transition-all duration-150 flex items-center space-x-1 cursor-pointer shadow-tactile-sm shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] focus-visible:ring-offset-1 active:scale-[0.98]"
              title="Buat Lowongan Baru"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Baru</span>
            </button>
          </div>

          {/* Job Dropdown Menu */}
          {isJobSelectOpen && (
            <div
              role="listbox"
              className="absolute left-0 mt-1.5 w-76 bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl shadow-tactile-lg z-50 py-1 space-y-0.5 max-h-72 overflow-y-auto"
            >
              <div className="px-3 py-1.5 border-b border-[#E2E9E5] text-[10px] font-bold text-[#2D4439] uppercase tracking-wider flex items-center justify-between">
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
                    className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF6EF] text-[#124B2E] font-bold border-l-3 border-[#1B4938]'
                        : 'text-[#13221C] hover:bg-[#EBF1EE] font-medium border-l-3 border-transparent'
                    }`}
                  >
                    <span className="truncate pr-2">{j.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EBF1EE] text-[#2D4439] border border-[#D5DFD9] tabular-nums whitespace-nowrap font-semibold">
                        {j.cv_count} CV
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#124B2E]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Workspace Active Step Pill */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-[#EBF1EE] border border-[#D5DFD9] text-[11px] font-mono font-semibold text-[#2D4439]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1B4938] animate-pulse" />
          <span>{stepLabels[currentStep] || currentStep}</span>
        </div>
      </div>

      {/* Right: Quick Actions & Tactile Blind Mode Switch */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        {onLoadGoldenSample && (
          <button
            type="button"
            onClick={onLoadGoldenSample}
            className="h-8 px-2.5 rounded-lg bg-[#FCFDFC] hover:bg-[#EBF1EE] hover:border-[#1B4938]/40 border border-[#D5DFD9] text-[#13221C] text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150 cursor-pointer shadow-tactile-sm shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] focus-visible:ring-offset-1 active:scale-[0.98]"
            title="Muat 15 Berkas Sampel Terkalibrasi Golden Dataset"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#7A3E02] shrink-0" />
            <span className="hidden sm:inline">Golden Dataset</span>
          </button>
        )}

        {/* Tactile Blind Mode Switch */}
        <button
          type="button"
          onClick={onToggleBlindMode}
          className={`h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center space-x-1.5 transition-all duration-150 cursor-pointer shadow-tactile-sm active:scale-[0.98] shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] focus-visible:ring-offset-1 ${
            blindMode
              ? 'bg-[#EBF6EF] border-[#BBE5CD] text-[#124B2E]'
              : 'bg-[#FCFDFC] border-[#D5DFD9] text-[#2D4439] hover:text-[#13221C]'
          }`}
          title="Pencegahan Bias Demografis & Kognitif"
        >
          {blindMode ? (
            <EyeOff className="w-3.5 h-3.5 text-[#124B2E] shrink-0" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-[#2D4439] shrink-0" />
          )}
          <span className="font-mono text-[11px] hidden xs:inline">
            Blind: <span className="underline decoration-2">{blindMode ? 'ON' : 'OFF'}</span>
          </span>
        </button>
      </div>
    </header>
  )
}
