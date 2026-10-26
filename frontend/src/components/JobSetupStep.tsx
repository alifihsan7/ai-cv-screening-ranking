import React, { useState } from 'react'
import {
  Briefcase,
  Layers,
  BookmarkCheck,
  ChevronRight,
  Loader2,
  Sparkles,
  MapPin,
  Clock,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react'
import { ROLE_TEMPLATES, type JobTemplate } from '../jobTemplates'

export interface JobSetupStepProps {
  jobTitle: string
  setJobTitle: (val: string) => void
  jobLocation: string
  setJobLocation: (val: string) => void
  jobType: string
  setJobType: (val: string) => void
  jobDescription: string
  setJobDescription: (val: string) => void
  requirementsCount?: number
  criteriaApproved: boolean
  criteriaVersion: number
  isCompiling: boolean
  isLoading?: boolean
  onCompileFromJd: () => Promise<void> | void
  onNext: () => void
  onBlurTitle?: () => void
  onBlurDetails?: () => void
  onSelectTemplate?: (tmpl: JobTemplate) => void | Promise<void>
}

const JOB_TYPE_PRESETS = [
  'Penuh Waktu (Full-time)',
  'Kontrak (Contract)',
  'Paruh Waktu (Part-time)',
  'Remote / Hybrid',
]

export const JobSetupStep: React.FC<JobSetupStepProps> = ({
  jobTitle,
  setJobTitle,
  jobLocation,
  setJobLocation,
  jobType,
  setJobType,
  jobDescription,
  setJobDescription,
  requirementsCount = 0,
  criteriaApproved,
  criteriaVersion,
  isCompiling,
  isLoading = false,
  onCompileFromJd,
  onNext,
  onBlurTitle,
  onBlurDetails,
  onSelectTemplate,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(() => {
    const match = ROLE_TEMPLATES.find((t) => t.title === jobTitle)
    return match ? match.id : null
  })

  const handleApplyTemplate = async (tmpl: JobTemplate) => {
    setSelectedTemplateId(tmpl.id)
    setJobTitle(tmpl.title)
    setJobLocation(tmpl.location)
    setJobType(tmpl.employmentType)
    setJobDescription(tmpl.jd_text)
    if (onSelectTemplate) {
      await onSelectTemplate(tmpl)
    }
  }

  const handleExtractAndContinue = async () => {
    if (onBlurTitle) {
      onBlurTitle()
    }
    if (onBlurDetails) {
      onBlurDetails()
    }
    if (onCompileFromJd) {
      await onCompileFromJd()
    }
    onNext()
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F2F5F3]">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-6 sm:p-7">
            {/* Step Banner Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E9E5]">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#E2E9E5] animate-pulse shrink-0" />
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-5 w-24 bg-[#E2E9E5] rounded animate-pulse" />
                    <div className="h-6 w-44 bg-[#E2E9E5] rounded animate-pulse" />
                  </div>
                  <div className="h-3.5 w-72 sm:w-96 bg-[#EBF1EE] rounded animate-pulse" />
                  <div className="h-3.5 w-48 sm:w-64 bg-[#EBF1EE] rounded animate-pulse" />
                </div>
              </div>
              <div className="h-6 w-24 bg-[#E2E9E5] rounded animate-pulse shrink-0" />
            </div>

            {/* Quick Role Templates Skeleton */}
            <div className="mt-6 bg-[#F5F8F6] border border-[#D5DFD9] rounded-xl p-4 sm:p-5 shadow-tactile-sm">
              <div className="h-4 w-48 bg-[#E2E9E5] rounded animate-pulse mb-3" />
              <div className="flex flex-wrap gap-2">
                <div className="h-8 w-28 bg-[#E2E9E5] rounded-lg animate-pulse" />
                <div className="h-8 w-32 bg-[#E2E9E5] rounded-lg animate-pulse" />
                <div className="h-8 w-24 bg-[#E2E9E5] rounded-lg animate-pulse" />
                <div className="h-8 w-36 bg-[#E2E9E5] rounded-lg animate-pulse" />
                <div className="h-8 w-28 bg-[#E2E9E5] rounded-lg animate-pulse" />
              </div>
            </div>

            {/* Form Fields Skeleton */}
            <div className="mt-6 space-y-5">
              <div>
                <div className="h-3.5 w-36 bg-[#E2E9E5] rounded animate-pulse mb-1.5" />
                <div className="h-10 w-full bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl animate-pulse" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="h-3.5 w-28 bg-[#E2E9E5] rounded animate-pulse mb-1.5" />
                  <div className="h-10 w-full bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl animate-pulse" />
                </div>
                <div>
                  <div className="h-3.5 w-24 bg-[#E2E9E5] rounded animate-pulse mb-1.5" />
                  <div className="h-10 w-full bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl animate-pulse" />
                </div>
              </div>

              <div>
                <div className="h-3.5 w-48 bg-[#E2E9E5] rounded animate-pulse mb-1.5" />
                <div className="h-52 w-full bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl animate-pulse" />
              </div>
            </div>

            {/* Bottom Action Footer Skeleton */}
            <div className="mt-8 pt-5 border-t border-[#E2E9E5] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="h-4 w-48 bg-[#E2E9E5] rounded animate-pulse" />
              <div className="h-11 w-full sm:w-60 bg-[#1B4938]/30 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const lineCount = jobDescription ? jobDescription.split('\n').filter(Boolean).length : 0
  const charCount = jobDescription ? jobDescription.length : 0

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F2F5F3]">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Step Banner */}
        <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E9E5]">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#EBF6EF] border border-[#BBE5CD] flex items-center justify-center shrink-0 shadow-tactile-sm">
                <Briefcase className="w-5 h-5 text-[#1B4938]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[11px] font-bold text-[#124B2E] uppercase tracking-wider bg-[#EBF6EF] px-2 py-0.5 rounded border border-[#BBE5CD]">
                    Tahap 1 dari 4
                  </span>
                  <h1 className="text-lg sm:text-xl font-bold text-[#13221C] tracking-tight">
                    Setup Lowongan Kerja
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-[#2D4439] mt-1">
                  Tentukan profil posisi kerja dan masukkan teks deskripsi lowongan (JD). Sistem AI akan mengekstrak kriteria kompetensi deterministik secara otomatis.
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 text-xs">
              <span className="text-[#2D4439] text-[11px] font-medium">Status Kriteria:</span>
              <span
                className={`font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-md border mt-0.5 tabular-nums ${
                  isCompiling
                    ? 'bg-[#EBF1EE] text-[#1B4938] border-[#D5DFD9] animate-pulse'
                    : criteriaApproved
                    ? 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD]'
                    : requirementsCount > 0
                    ? 'bg-[#FEF6E8] text-[#7A3E02] border-[#F8D8A7]'
                    : 'bg-[#F2F5F3] text-[#2D4439] border-[#D5DFD9]'
                }`}
              >
                {isCompiling
                  ? 'Mengekstrak...'
                  : criteriaApproved
                  ? `Disetujui (v${criteriaVersion})`
                  : requirementsCount > 0
                  ? `Draf Baru (${requirementsCount} Kriteria)`
                  : 'Belum Ada Kriteria'}
              </span>
            </div>
          </div>

          {/* Quick Role Templates */}
          <div className="mt-6 bg-[#F5F8F6] border border-[#D5DFD9] rounded-xl p-4 sm:p-5 shadow-tactile-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#13221C] flex items-center space-x-2">
                <BookmarkCheck className="w-4 h-4 text-[#1B4938]" />
                <span>Pilih Template Peran Standar Industri:</span>
              </span>
              <span className="text-[11px] text-[#2D4439] font-medium hidden sm:inline">
                Klik untuk mengisi otomatis seluruh field & kualifikasi teknis
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ROLE_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id || (selectedTemplateId === null && jobTitle === tmpl.title)
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    disabled={isCompiling}
                    onClick={() => handleApplyTemplate(tmpl)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shadow-tactile-sm flex items-center space-x-1.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] focus-visible:ring-offset-1 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-[#1B4938] text-[#FCFDFC] border-[#1B4938] font-bold ring-1 ring-[#1B4938]'
                        : 'bg-[#FCFDFC] border-[#D5DFD9] text-[#13221C] hover:text-[#1B4938] hover:border-[#1B4938]/40 hover:bg-[#EBF1EE]'
                    } ${isCompiling ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="w-3 h-3 text-[#BBE5CD]" />
                    ) : null}
                    <span>{tmpl.role}</span>
                  </button>
                )
              })}
            </div>

            {/* Tactile Feedback Banner */}
            {isCompiling && (
              <div className="mt-3 flex items-center space-x-2 text-xs text-[#124B2E] bg-[#EBF6EF] border border-[#BBE5CD] px-3.5 py-2.5 rounded-lg transition-all animate-pulse shadow-tactile-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1B4938] shrink-0" />
                <span className="font-medium">
                  Sedang mengekstrak kriteria kompetensi deterministik dari teks Job Description...
                </span>
              </div>
            )}

            {!isCompiling && selectedTemplateId && requirementsCount === 0 && (
              <div className="mt-3 flex items-center justify-between text-xs text-[#2D4439] bg-[#F2F5F3] border border-[#D5DFD9] px-3.5 py-2 rounded-lg transition-all shadow-tactile-sm">
                <div className="flex items-center space-x-2">
                  <BookmarkCheck className="w-3.5 h-3.5 text-[#1B4938] shrink-0" />
                  <span>
                    Template <strong>{ROLE_TEMPLATES.find((t) => t.id === selectedTemplateId)?.role}</strong> diterapkan. Tinjau teks deskripsi pekerjaan di bawah, lalu klik <strong>Ekstrak Kriteria & Lanjut ke Step 2</strong>.
                  </span>
                </div>
              </div>
            )}

            {!isCompiling && selectedTemplateId && requirementsCount > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs text-[#124B2E] bg-[#EBF6EF]/70 border border-[#BBE5CD] px-3.5 py-2 rounded-lg transition-all shadow-tactile-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1B4938] shrink-0" />
                  <span>
                    Template <strong>{ROLE_TEMPLATES.find((t) => t.id === selectedTemplateId)?.role}</strong> aktif ·{' '}
                    <span className="font-semibold">{requirementsCount} kriteria kompetensi</span> siap ditinjau di Step 2.
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#1B4938]/80 font-bold hidden sm:inline">
                  DRAF TERSINKRON
                </span>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#13221C] mb-1.5">
                Judul Posisi Pekerjaan <span className="text-[#8C1819] font-bold">*</span>
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => {
                  setJobTitle(e.target.value)
                  if (selectedTemplateId) {
                    const match = ROLE_TEMPLATES.find((t) => t.id === selectedTemplateId)
                    if (match && match.title !== e.target.value) {
                      setSelectedTemplateId(null)
                    }
                  }
                }}
                onBlur={onBlurTitle}
                placeholder="Misal: Senior Backend Engineer / AI Research Engineer"
                className="w-full px-3.5 py-2.5 bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl text-sm font-semibold text-[#13221C] placeholder-[#2D4439]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none transition-all duration-150 shadow-tactile-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#13221C] mb-1.5 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#2D4439]" />
                  <span>Lokasi Penempatan</span>
                </label>
                <input
                  type="text"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  onBlur={onBlurDetails}
                  placeholder="Misal: Jakarta / Hybrid, Remote ID"
                  className="w-full px-3.5 py-2 bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl text-sm font-medium text-[#13221C] placeholder-[#2D4439]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none transition-all duration-150 shadow-tactile-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#13221C] mb-1.5 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#2D4439]" />
                  <span>Tipe Pekerjaan</span>
                </label>
                <input
                  type="text"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  onBlur={onBlurDetails}
                  placeholder="Penuh Waktu (Full-time) / Kontrak"
                  className="w-full px-3.5 py-2 bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl text-sm font-medium text-[#13221C] placeholder-[#2D4439]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none transition-all duration-150 shadow-tactile-sm"
                />
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {JOB_TYPE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setJobType(preset)
                        if (onBlurDetails) onBlurDetails()
                      }}
                      className={`text-[11px] px-2 py-0.5 rounded-md border font-medium transition-all duration-150 cursor-pointer ${
                        jobType === preset
                          ? 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD] font-bold'
                          : 'bg-[#FCFDFC] text-[#2D4439] border-[#D5DFD9] hover:bg-[#F2F5F3]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#13221C]">
                  Deskripsi Pekerjaan (Job Description) <span className="text-[#8C1819] font-bold">*</span>
                </label>
                <span className="text-[11px] text-[#2D4439] flex items-center space-x-2 font-mono tabular-nums">
                  <span className="flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-[#1B4938]" />
                    <span>{lineCount} baris</span>
                  </span>
                  <span>·</span>
                  <span>{charCount} karakter</span>
                </span>
              </div>
              <textarea
                rows={10}
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value)
                  if (selectedTemplateId) {
                    const match = ROLE_TEMPLATES.find((t) => t.id === selectedTemplateId)
                    if (match && match.jd_text !== e.target.value) {
                      setSelectedTemplateId(null)
                    }
                  }
                }}
                onBlur={onBlurDetails}
                placeholder="Tempel atau ketik teks Job Description lengkap di sini (Tanggung Jawab, Kualifikasi Wajib, Kualifikasi Nilai Tambah)..."
                className="w-full px-3.5 py-3 bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl text-xs sm:text-sm font-mono text-[#13221C] placeholder-[#2D4439]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none leading-relaxed transition-all duration-150 shadow-tactile-sm resize-y"
              />
              <div className="mt-2 p-3 bg-[#F5F8F6] border border-[#D5DFD9] rounded-lg text-xs text-[#2D4439] flex items-start space-x-2">
                <HelpCircle className="w-4 h-4 text-[#1B4938] shrink-0 mt-0.5" />
                <p>
                  <strong>Tips Ekstraksi Cepat:</strong> Gunakan tanda strip (<code className="font-mono text-[#1B4938] font-bold">-</code>) untuk butir kualifikasi agar kompilator deterministik AI dapat memecah kriteria per kategori (Pengalaman, Hard Skill, Pendidikan) secara akurat tanpa halusinasi.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="mt-8 pt-5 border-t border-[#E2E9E5] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              disabled={isCompiling || requirementsCount === 0}
              onClick={() => {
                if (requirementsCount === 0) return
                if (onBlurTitle) onBlurTitle()
                if (onBlurDetails) onBlurDetails()
                onNext()
              }}
              className="text-xs font-bold text-[#2D4439] hover:text-[#13221C] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] rounded-lg px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {requirementsCount > 0
                ? `Lanjut ke Step 2 (Tinjau ${requirementsCount} Kriteria) →`
                : 'Pilih Ekstrak Kriteria untuk Melanjutkan'}
            </button>

            <button
              type="button"
              onClick={handleExtractAndContinue}
              disabled={isCompiling || !jobDescription.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-[#1B4938] hover:bg-[#265B46] text-[#FCFDFC] font-bold text-xs sm:text-sm rounded-xl shadow-tactile flex items-center justify-center space-x-2 transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] focus-visible:ring-offset-2"
            >
              {isCompiling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#BBE5CD]" />
                  <span>Mengekstrak Kriteria dari JD...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#BBE5CD]" />
                  <span>
                    {requirementsCount > 0
                      ? 'Ekstrak Ulang & Lanjut ke Step 2'
                      : 'Ekstrak Kriteria & Lanjut ke Step 2'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
