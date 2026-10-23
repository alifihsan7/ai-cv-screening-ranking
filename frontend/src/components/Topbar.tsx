import React, { useState, useRef, useEffect } from 'react'
import {
  Briefcase,
  Layers,
  Sliders,
  Upload,
  Sparkles,
  Eye,
  EyeOff,
  ChevronDown,
  Check,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react'

export interface TopbarProps {
  currentTab: 'workbench' | 'criteria'
  setCurrentTab: (tab: 'workbench' | 'criteria') => void
  currentJobId: string | null
  currentJobTitle: string
  availableJobs: Array<{ id: string; title: string; cv_count: number }>
  onSelectJob: (id: string, title?: string) => void
  onRenameJob: () => void
  onDeleteJob: () => void
  onCreateNewJob: () => void
  onOpenUpload: () => void
  onLoadGoldenSample: () => void
  blindMode: boolean
  onToggleBlindMode: () => void
}

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  setCurrentTab,
  currentJobId,
  currentJobTitle,
  availableJobs,
  onSelectJob,
  onRenameJob,
  onDeleteJob,
  onCreateNewJob,
  onOpenUpload,
  onLoadGoldenSample,
  blindMode,
  onToggleBlindMode,
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
  const displayCvCount = activeJob?.cv_count ?? 15

  return (
    <header className="h-[46px] border-b border-[#D5DFD9] bg-[#FCFDFC] px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left: Brand Monogram + Job Popover Selector */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-[#1B4938] flex items-center justify-center text-[#FCFDFC] font-bold text-xs shadow-tactile-sm">
            <span className="font-mono text-[11px] tracking-tight">S7</span>
          </div>
          <span className="font-bold text-xs text-[#13221C] tracking-tight hidden md:inline">
            Solaris Talent Engine
          </span>
        </div>

        <div className="h-4 w-px bg-[#D5DFD9] hidden md:block" />

        {/* Custom Popover Job Selector */}
        <div className="relative" ref={jobSelectRef}>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setIsJobSelectOpen((prev) => !prev)}
              aria-expanded={isJobSelectOpen}
              aria-haspopup="listbox"
              className="h-7 px-2.5 bg-[#F2F5F3] hover:bg-[#EBF1EE] border border-[#D5DFD9] rounded-lg text-xs font-semibold text-[#13221C] flex items-center space-x-2 transition-all cursor-pointer shadow-tactile-sm"
              title="Pilih Lowongan Aktif"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#1B4938]" />
              <span className="truncate max-w-[170px] sm:max-w-[220px]">{displayTitle}</span>
              <span className="bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9] text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold tabular-nums">
                {displayCvCount} CV
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#40564D] transition-transform duration-150 ${
                  isJobSelectOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={onRenameJob}
              disabled={!currentJobId}
              className="h-7 w-7 inline-flex items-center justify-center text-[#40564D] hover:text-[#1B4938] bg-[#F2F5F3] hover:bg-[#EBF1EE] rounded-lg border border-[#D5DFD9] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-tactile-sm"
              title="Ubah Nama Lowongan"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onDeleteJob}
              disabled={!currentJobId}
              className="h-7 w-7 inline-flex items-center justify-center text-[#40564D] hover:text-[#9E2A2B] bg-[#F2F5F3] hover:bg-[#FCEBEB] rounded-lg border border-[#D5DFD9] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-tactile-sm"
              title="Hapus Lowongan"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onCreateNewJob}
              className="h-7 px-2 text-[11px] bg-[#EBF6EF] hover:bg-[#E6F4EA] text-[#1B4938] border border-[#BBE5CD] rounded-lg font-semibold transition-all flex items-center space-x-1 cursor-pointer shadow-tactile-sm"
              title="Buat Lowongan Baru"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden sm:inline">Baru</span>
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
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9] tabular-nums">
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

      {/* Center: Dual-Tab Switcher */}
      <div className="flex items-center bg-[#EBF1EE] p-0.5 rounded-lg border border-[#D5DFD9]">
        <button
          type="button"
          onClick={() => setCurrentTab('workbench')}
          className={`h-7 px-3 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
            currentTab === 'workbench'
              ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
              : 'text-[#40564D] hover:text-[#13221C]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#1B4938]" />
          <span>Workbench Skrining</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentTab('criteria')}
          className={`h-7 px-3 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
            currentTab === 'criteria'
              ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]'
              : 'text-[#40564D] hover:text-[#13221C]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-[#2D6A4F]" />
          <span>Studio Kriteria</span>
        </button>
      </div>

      {/* Right: Actions (Unggah CV, Golden Sample, Blind Mode) */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onOpenUpload}
          className="h-7 px-2.5 rounded-lg bg-[#1B4938] hover:bg-[#2D6A4F] text-[#FCFDFC] text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-tactile-sm active:scale-98"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">+ Unggah CV</span>
        </button>

        <button
          type="button"
          onClick={onLoadGoldenSample}
          className="h-7 px-2.5 rounded-lg bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[#13221C] text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-tactile-sm"
          title="Muat 15 Berkas Sampel Terkalibrasi"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#8A4C05]" />
          <span className="hidden md:inline">Muat Golden Sample</span>
        </button>

        {/* Tactile Blind Mode Switch */}
        <button
          type="button"
          onClick={onToggleBlindMode}
          className={`h-7 px-2.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-tactile-sm ${
            blindMode
              ? 'bg-[#EBF6EF] border-[#BBE5CD] text-[#134E35]'
              : 'bg-[#FCFDFC] border-[#D5DFD9] text-[#40564D] hover:text-[#13221C]'
          }`}
          title="Pencegahan Bias Demografis & Kognitif (Shortcut: 'B')"
        >
          {blindMode ? (
            <EyeOff className="w-3.5 h-3.5 text-[#134E35]" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-[#40564D]" />
          )}
          <span className="font-mono text-[11px]">
            Blind: <strong>{blindMode ? 'ON' : 'OFF'}</strong>
          </span>
        </button>
      </div>
    </header>
  )
}
