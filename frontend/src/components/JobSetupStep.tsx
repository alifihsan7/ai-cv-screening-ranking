import React, { useState, useMemo } from 'react'
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
  Circle,
  FileCheck,
  Sliders,
  ArrowRight,
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
  selectedTemplateId?: string | null
  onSelectTemplateId?: (id: string | null) => void
  cachedTemplateIds?: string[]
}

const JOB_TYPE_PRESETS = [
  'Penuh Waktu (Full-time)',
  'Kontrak (Contract)',
  'Paruh Waktu (Part-time)',
  'Remote / Hybrid',
]

interface DetectedBullet {
  text: string
  category: 'EXPERIENCE' | 'HARD_SKILLS' | 'EDUCATION_CERT'
  categoryLabel: string
}

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
  selectedTemplateId: propSelectedTemplateId,
  onSelectTemplateId,
  cachedTemplateIds = [],
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(() => {
    if (propSelectedTemplateId !== undefined) return propSelectedTemplateId
    const match = ROLE_TEMPLATES.find((t) => t.title === jobTitle)
    return match ? match.id : null
  })

  // Synchronize internal state with prop if prop is explicitly supplied
  React.useEffect(() => {
    if (propSelectedTemplateId !== undefined) {
      setInternalSelectedId(propSelectedTemplateId)
    }
  }, [propSelectedTemplateId])

  const selectedTemplateId =
    propSelectedTemplateId !== undefined ? propSelectedTemplateId : internalSelectedId

  const updateSelectedId = (id: string | null) => {
    setInternalSelectedId(id)
    if (onSelectTemplateId) {
      onSelectTemplateId(id)
    }
  }

  const handleApplyTemplate = async (tmpl: JobTemplate) => {
    updateSelectedId(tmpl.id)
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

  // Real-time JD Quality & Completeness Telemetry
  const jdTelemetry = useMemo(() => {
    const text = jobDescription || ''
    const trimmed = text.trim()
    const charCount = trimmed.length
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    const lineCount = lines.length

    // Structure completeness heuristic checks
    const hasResponsibilities =
      /(tanggung\s*jawab|responsibilit|tugas|deskripsi\s*kerja|role|lingkup\s*pekerjaan)/i.test(text)
    const hasRequirements =
      /(kualifikasi|persyaratan|requirement|kriteria|keahlian|syarat|kompetensi)/i.test(text)
    const hasExperience =
      /(tahun|year|\bthn\b|pengalaman|experience|senior|junior|lead|mid-level|\bexp\b)/i.test(text)
    const hasTechSkills =
      /(python|react|typescript|javascript|golang|java|sql|postgres|docker|aws|api|backend|frontend|git|rest|node|kubernetes|vue|next)/i.test(
        text
      )

    let checksPassed = 0
    if (hasResponsibilities) checksPassed++
    if (hasRequirements) checksPassed++
    if (hasExperience) checksPassed++
    if (hasTechSkills) checksPassed++

    // Quality Score (0 - 100)
    const lengthScore = Math.min(50, Math.round((charCount / 650) * 50))
    const checksScore = checksPassed * 12.5
    const score = trimmed ? Math.min(100, Math.max(15, Math.round(lengthScore + checksScore))) : 0

    let qualityRating = 'Perlu Diisi'
    let scoreColor = 'text-[#7A3E02]'
    let barColor = 'bg-[#7A3E02]'
    if (score >= 80) {
      qualityRating = 'Sangat Lengkap & Siap Ekstraksi'
      scoreColor = 'text-[#124B2E]'
      barColor = 'bg-[#1B4938]'
    } else if (score >= 50) {
      qualityRating = 'Cukup Lengkap'
      scoreColor = 'text-[#1B4938]'
      barColor = 'bg-[#1B4938]'
    } else if (score > 0) {
      qualityRating = 'Draf Ringkas'
      scoreColor = 'text-[#7A3E02]'
      barColor = 'bg-[#F59E0B]'
    }

    // Live Criteria Sneak-Peek parser (Extract top bullets or key clauses)
    const detectedBullets: DetectedBullet[] = []
    const bulletRegex = /^[-*•–—]\s+|\b\d+[.)]\s+/

    for (const line of lines) {
      if (detectedBullets.length >= 5) break
      if (bulletRegex.test(line)) {
        const clean = line.replace(bulletRegex, '').trim()
        if (clean.length >= 10) {
          let cat: 'EXPERIENCE' | 'HARD_SKILLS' | 'EDUCATION_CERT' = 'HARD_SKILLS'
          let label = 'Hard Skill'
          if (/(tahun|year|pengalaman|experience|rekam jejak)/i.test(clean)) {
            cat = 'EXPERIENCE'
            label = 'Pengalaman'
          } else if (/(gelar|sarjana|diploma|pendidikan|s1|d3|s2|degree|universitas)/i.test(clean)) {
            cat = 'EDUCATION_CERT'
            label = 'Pendidikan'
          }
          detectedBullets.push({ text: clean, category: cat, categoryLabel: label })
        }
      }
    }

    return {
      charCount,
      lineCount,
      hasResponsibilities,
      hasRequirements,
      hasExperience,
      hasTechSkills,
      checksPassed,
      score,
      qualityRating,
      scoreColor,
      barColor,
      detectedBullets,
    }
  }, [jobDescription])

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F2F5F3]">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Banner Skeleton */}
          <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E9E5]">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#E2E9E5] animate-pulse shrink-0" />
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-5 w-24 bg-[#E2E9E5] rounded animate-pulse" />
                    <div className="h-6 w-44 bg-[#E2E9E5] rounded animate-pulse" />
                  </div>
                  <div className="h-3.5 w-72 sm:w-96 bg-[#EBF1EE] rounded animate-pulse" />
                </div>
              </div>
              <div className="h-6 w-24 bg-[#E2E9E5] rounded animate-pulse shrink-0" />
            </div>
          </div>

          {/* 2-Column Skeleton (60% : 40%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 xl:col-span-7 space-y-5">
              <div className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-6 shadow-tactile space-y-4">
                <div className="h-4 w-48 bg-[#E2E9E5] rounded animate-pulse" />
                <div className="flex flex-wrap gap-2">
                  <div className="h-8 w-28 bg-[#E2E9E5] rounded-lg animate-pulse" />
                  <div className="h-8 w-32 bg-[#E2E9E5] rounded-lg animate-pulse" />
                  <div className="h-8 w-24 bg-[#E2E9E5] rounded-lg animate-pulse" />
                </div>
              </div>
              <div className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-6 shadow-tactile space-y-5">
                <div className="h-10 w-full bg-[#E2E9E5] rounded-xl animate-pulse" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-10 bg-[#E2E9E5] rounded-xl animate-pulse" />
                  <div className="h-10 bg-[#E2E9E5] rounded-xl animate-pulse" />
                </div>
                <div className="h-60 bg-[#E2E9E5] rounded-xl animate-pulse" />
              </div>
            </div>
            <div className="lg:col-span-5 xl:col-span-5 space-y-5">
              <div className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-6 shadow-tactile space-y-4">
                <div className="h-11 w-full bg-[#E2E9E5] rounded-xl animate-pulse" />
                <div className="h-20 bg-[#E2E9E5] rounded-xl animate-pulse" />
              </div>
              <div className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-6 shadow-tactile space-y-4">
                <div className="h-32 bg-[#E2E9E5] rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F2F5F3]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Step Banner */}
        <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E9E5]">
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

          {/* Quick Role Templates Pills Selector */}
          <div className="mt-5 bg-[#F5F8F6] border border-[#D5DFD9] rounded-xl p-4 sm:p-5 shadow-tactile-sm">
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
                const isSelected =
                  selectedTemplateId === tmpl.id ||
                  (selectedTemplateId === null && jobTitle === tmpl.title)
                const hasCache = cachedTemplateIds.includes(tmpl.id)

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
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#BBE5CD] shrink-0" />
                    ) : null}
                    <span>{tmpl.role}</span>
                    {hasCache && (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-full font-medium tracking-tight ${
                          isSelected
                            ? 'bg-[#12382B] text-[#BBE5CD] border border-[#2D8A58]/50'
                            : 'bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD]'
                        }`}
                        title="Kriteria tersimpan di memori cache"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1 shrink-0 ${
                            isSelected ? 'bg-[#52D48E]' : 'bg-[#1B4938]'
                          }`}
                        />
                        Tersimpan
                      </span>
                    )}
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
                    Template <strong>{ROLE_TEMPLATES.find((t) => t.id === selectedTemplateId)?.role}</strong> diterapkan. Tinjau teks deskripsi dan klik <strong>Ekstrak Kriteria AI & Lanjut ke Step 2</strong>.
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
                    <span className="font-semibold">{requirementsCount} kriteria tersimpan berhasil dipulihkan</span>
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#1B4938]/80 font-bold hidden sm:inline">
                  DRAF TERSINKRON
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Asymmetric 2-Column Studio (60% : 40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (60% -> lg:col-span-7 xl:col-span-7) */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">
            {/* Position & Location Card */}
            <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-6 space-y-5">
              <h2 className="text-sm font-bold text-[#13221C] tracking-tight flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[#1B4938]" />
                <span>Parameter Pekerjaan</span>
              </h2>

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
                        updateSelectedId(null)
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
            </div>

            {/* Job Description Textarea Card */}
            <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#13221C]">
                  Deskripsi Pekerjaan (Job Description) <span className="text-[#8C1819] font-bold">*</span>
                </label>
                <span className="text-[11px] text-[#2D4439] flex items-center space-x-2 font-mono tabular-nums">
                  <span className="flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-[#1B4938]" />
                    <span>{jdTelemetry.lineCount} baris</span>
                  </span>
                  <span>·</span>
                  <span>{jdTelemetry.charCount} karakter</span>
                </span>
              </div>

              <textarea
                rows={13}
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value)
                  if (selectedTemplateId) {
                    const match = ROLE_TEMPLATES.find((t) => t.id === selectedTemplateId)
                    if (match && match.jd_text !== e.target.value) {
                      updateSelectedId(null)
                    }
                  }
                }}
                onBlur={onBlurDetails}
                placeholder="Tempel atau ketik teks Job Description lengkap di sini (Tanggung Jawab, Kualifikasi Wajib, Kualifikasi Nilai Tambah)..."
                className="w-full px-3.5 py-3 bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl text-xs sm:text-sm font-mono text-[#13221C] placeholder-[#2D4439]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none leading-relaxed transition-all duration-150 shadow-tactile-sm resize-y"
              />

              <div className="p-3 bg-[#F5F8F6] border border-[#D5DFD9] rounded-lg text-xs text-[#2D4439] flex items-start space-x-2">
                <HelpCircle className="w-4 h-4 text-[#1B4938] shrink-0 mt-0.5" />
                <p>
                  <strong>Tips Ekstraksi Deterministik:</strong> Gunakan tanda strip (<code className="font-mono text-[#1B4938] font-bold">-</code>) untuk butir kualifikasi agar kompilator AI dapat memecah kriteria per kategori (Pengalaman, Hard Skill, Pendidikan) secara akurat tanpa halusinasi.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (40% - Sticky Panel -> lg:col-span-5 xl:col-span-5 lg:sticky lg:top-6 space-y-5) */}
          <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-6 space-y-5">
            {/* 1. Sticky Primary Action Card */}
            <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#124B2E] bg-[#EBF6EF] px-2 py-0.5 rounded border border-[#BBE5CD]">
                  AKSI UTAMA
                </span>
                <span className="text-[11px] font-mono text-[#2D4439] font-medium">
                  {jobTitle.trim() ? 'Draf Siap' : 'Menunggu Input'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleExtractAndContinue}
                disabled={isCompiling || !jobDescription.trim()}
                className="w-full py-3.5 px-4 bg-[#1B4938] hover:bg-[#265B46] text-[#FCFDFC] font-bold text-xs sm:text-sm rounded-xl shadow-tactile flex items-center justify-center space-x-2 transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] focus-visible:ring-offset-2"
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
                        : 'Ekstrak Kriteria AI & Lanjut ke Step 2'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {requirementsCount > 0 && (
                <button
                  type="button"
                  disabled={isCompiling}
                  onClick={() => {
                    if (onBlurTitle) onBlurTitle()
                    if (onBlurDetails) onBlurDetails()
                    onNext()
                  }}
                  className="w-full py-2 px-3 text-xs font-bold text-[#1B4938] hover:bg-[#EBF1EE] border border-[#D5DFD9] rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938]"
                >
                  <span>Lanjut ke Step 2 (Tinjau {requirementsCount} Kriteria)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="pt-2 border-t border-[#E2E9E5] flex items-center justify-between text-[11px] text-[#2D4439]">
                <span className="flex items-center space-x-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#124B2E]" />
                  <span>Draf tersimpan di memori</span>
                </span>
                <span className="font-mono text-[#1B4938] font-bold">
                  {criteriaApproved ? `v${criteriaVersion} Disetujui` : 'Belum Dikunci'}
                </span>
              </div>
            </div>

            {/* 2. JD Quality & Readiness Card (Live Telemetry) */}
            <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#13221C] tracking-tight flex items-center space-x-2">
                  <FileCheck className="w-4 h-4 text-[#1B4938]" />
                  <span>Kualitas & Kesiapan JD</span>
                </h3>
                <span className={`text-[11px] font-mono font-bold ${jdTelemetry.scoreColor}`}>
                  {jdTelemetry.score}/100
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-[#EBF1EE] rounded-full h-2 overflow-hidden border border-[#D5DFD9]">
                  <div
                    className={`${jdTelemetry.barColor} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${jdTelemetry.score}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#2D4439]">
                  <span className="font-medium">{jdTelemetry.qualityRating}</span>
                  <span className="font-mono tabular-nums">{jdTelemetry.charCount} karakter</span>
                </div>
              </div>

              {/* Structure Completeness Checklist */}
              <div className="pt-3 border-t border-[#E2E9E5] space-y-2">
                <span className="text-[11px] font-bold text-[#13221C] uppercase tracking-wider font-mono">
                  Kelengkapan Struktur:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    {jdTelemetry.hasResponsibilities ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#124B2E] shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[#8C9B93] shrink-0" />
                    )}
                    <span
                      className={
                        jdTelemetry.hasResponsibilities
                          ? 'text-[#13221C] font-semibold'
                          : 'text-[#2D4439]/70'
                      }
                    >
                      Tanggung Jawab
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {jdTelemetry.hasRequirements ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#124B2E] shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[#8C9B93] shrink-0" />
                    )}
                    <span
                      className={
                        jdTelemetry.hasRequirements
                          ? 'text-[#13221C] font-semibold'
                          : 'text-[#2D4439]/70'
                      }
                    >
                      Kualifikasi Wajib
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {jdTelemetry.hasExperience ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#124B2E] shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[#8C9B93] shrink-0" />
                    )}
                    <span
                      className={
                        jdTelemetry.hasExperience
                          ? 'text-[#13221C] font-semibold'
                          : 'text-[#2D4439]/70'
                      }
                    >
                      Pengalaman Kerja
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {jdTelemetry.hasTechSkills ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#124B2E] shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[#8C9B93] shrink-0" />
                    )}
                    <span
                      className={
                        jdTelemetry.hasTechSkills
                          ? 'text-[#13221C] font-semibold'
                          : 'text-[#2D4439]/70'
                      }
                    >
                      Keahlian Teknis
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Live Criteria Sneak-Peek Card */}
            <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#13221C] tracking-tight flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#1B4938]" />
                  <span>Pratinjau Kualifikasi Terdeteksi</span>
                </h3>
                <span className="font-mono text-[10px] bg-[#EBF1EE] px-1.5 py-0.5 rounded text-[#1B4938] font-bold">
                  {jdTelemetry.detectedBullets.length} Terdeteksi
                </span>
              </div>

              {jdTelemetry.detectedBullets.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-[#F5F8F6] border border-[#D5DFD9] text-center text-xs text-[#2D4439]">
                  <p className="font-medium text-[#13221C]">Belum ada butir kualifikasi terdeteksi</p>
                  <p className="text-[11px] mt-1 text-[#2D4439]">
                    Gunakan format list berbutir (<code className="font-mono text-[#1B4938] font-bold">-</code>) pada deskripsi untuk melihat pratinjau kualifikasi otomatis.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {jdTelemetry.detectedBullets.map((bullet, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#F5F8F6] border border-[#D5DFD9] text-xs flex items-start space-x-2 transition-all hover:bg-[#EBF1EE]"
                    >
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FCFDFC] border border-[#D5DFD9] text-[#124B2E] shrink-0 mt-0.5">
                        {bullet.categoryLabel}
                      </span>
                      <p className="text-[#13221C] font-medium leading-snug line-clamp-2">
                        {bullet.text}
                      </p>
                    </div>
                  ))}
                  <p className="text-[10px] text-[#2D4439] font-mono pt-1">
                    Seluruh kriteria di atas akan diverifikasi dengan kutipan verbatim dari CV kandidat di Step 4.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
