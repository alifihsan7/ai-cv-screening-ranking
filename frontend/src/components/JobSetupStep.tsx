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
  criteriaApproved: boolean
  criteriaVersion: number
  isCompiling: boolean
  onCompileFromJd: () => Promise<void> | void
  onNext: () => void
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
  criteriaApproved,
  criteriaVersion,
  isCompiling,
  onCompileFromJd,
  onNext,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const handleApplyTemplate = (tmpl: JobTemplate) => {
    setSelectedTemplateId(tmpl.id)
    setJobTitle(tmpl.title)
    setJobLocation(tmpl.location)
    setJobType(tmpl.employmentType)
    setJobDescription(tmpl.jd_text)
  }

  const handleExtractAndContinue = async () => {
    if (onCompileFromJd) {
      await onCompileFromJd()
    }
    onNext()
  }

  // Reactive metrics for line and character counter
  const lineCount = useMemo(() => {
    return jobDescription.split('\n').filter((l) => l.trim().length > 0).length
  }, [jobDescription])

  const charCount = jobDescription.length

  return (
    <div className="flex-1 overflow-y-auto bg-[#F2F5F3] py-6 sm:py-8 lg:py-10">
      <div className="max-w-3xl sm:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Single-Column Centered Studio Card */}
        <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-6 sm:p-8 lg:p-9 space-y-7">
          
          {/* Header: Standalone Pill & Uncollided Heading */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#E2E9E5]">
            <div className="flex items-start gap-3.5 sm:gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#EBF6EF] border border-[#BBE5CD] flex items-center justify-center shrink-0 shadow-tactile-sm mt-0.5">
                <Briefcase className="w-5 h-5 text-[#1B4938]" />
              </div>
              <div className="flex flex-col items-start">
                {/* Standalone Pill Badge distinctly above heading */}
                <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#1B6C47] uppercase tracking-wider bg-[#EBF6EF] px-2.5 py-0.5 rounded-md border border-[#BBE5CD] mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B6C47] animate-pulse" />
                  <span>Tahap 1 dari 4</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#13221C] tracking-tight">
                  Setup Lowongan Kerja
                </h1>
                <p className="text-xs sm:text-sm text-[#40564D] mt-1.5 leading-relaxed max-w-xl">
                  Tentukan profil posisi kerja dan masukkan teks deskripsi lowongan (JD). Sistem AI akan mengekstrak kriteria kompetensi deterministik secara otomatis.
                </p>
              </div>
            </div>

            <div className="flex items-center sm:flex-col sm:items-end justify-between shrink-0 bg-[#F5F8F6] sm:bg-transparent px-3 py-2 sm:p-0 rounded-xl border sm:border-0 border-[#D5DFD9]">
              <span className="text-[#40564D] text-[11px] font-medium">Status Kriteria:</span>
              <span
                className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg border shadow-tactile-sm ${
                  criteriaApproved
                    ? 'bg-[#EBF6EF] text-[#1B6C47] border-[#BBE5CD]'
                    : 'bg-[#FEF6E8] text-[#8A4C05] border-[#F8D8A7]'
                }`}
              >
                {criteriaApproved ? `Disetujui (v${criteriaVersion})` : 'Draf Baru'}
              </span>
            </div>
          </div>

          {/* Quick Role Templates Cluster */}
          <div className="bg-[#F5F8F6] border border-[#D5DFD9] rounded-xl p-4 sm:p-5 shadow-tactile-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs sm:text-sm font-bold text-[#13221C] flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4 text-[#1B4938] shrink-0" />
                <span>Pilih Template Peran Standar Industri:</span>
              </span>
              <span className="text-[11px] text-[#40564D] font-medium">
                Klik untuk mengisi otomatis seluruh field &amp; kualifikasi teknis
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {ROLE_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id || jobTitle === tmpl.title
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className={`text-xs px-3.5 py-2.5 rounded-xl border font-semibold transition-all cursor-pointer shadow-tactile-sm flex items-center justify-center gap-1.5 active:scale-98 flex-1 min-w-[130px] sm:min-w-[150px] ${
                      isSelected
                        ? 'bg-[#1B4938] text-[#FCFDFC] border-[#1B4938] ring-2 ring-[#1B4938]/20'
                        : 'bg-[#FCFDFC] border-[#D5DFD9] text-[#13221C] hover:text-[#1B4938] hover:border-[#1B4938]/40 hover:bg-[#EBF1EE]'
                    }`}
                  >
                    <span>{tmpl.role}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#BBE5CD] shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form Input Fields */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#13221C] mb-2">
                Judul Posisi Pekerjaan <span className="text-[#9E2A2B]">*</span>
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Misal: Senior Backend Engineer / AI Research Engineer"
                className="w-full px-4 py-2.5 bg-[#FCFDFC] border border-[#C2D1C9] rounded-xl text-sm font-semibold text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none transition-all shadow-tactile-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#13221C] mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#1B4938]" />
                  <span>Lokasi Penempatan</span>
                </label>
                <input
                  type="text"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  placeholder="Misal: Jakarta / Hybrid, Remote ID"
                  className="w-full px-4 py-2.5 bg-[#FCFDFC] border border-[#C2D1C9] rounded-xl text-sm font-medium text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none transition-all shadow-tactile-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#13221C] mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#1B4938]" />
                  <span>Tipe Pekerjaan</span>
                </label>
                <input
                  type="text"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  placeholder="Penuh Waktu (Full-time) / Kontrak"
                  className="w-full px-4 py-2.5 bg-[#FCFDFC] border border-[#C2D1C9] rounded-xl text-sm font-medium text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none transition-all shadow-tactile-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-[#13221C]">
                  Deskripsi Pekerjaan (Job Description) <span className="text-[#9E2A2B]">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#40564D] bg-[#F5F8F6] px-2.5 py-1 rounded-lg border border-[#D5DFD9] flex items-center gap-1.5 font-mono">
                    <Layers className="w-3.5 h-3.5 text-[#1B4938]" />
                    <span>{lineCount} baris</span>
                    <span className="text-[#D5DFD9]">·</span>
                    <span>{charCount.toLocaleString()} karakter</span>
                  </span>
                </div>
              </div>

              <textarea
                rows={13}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Tempel atau ketik teks Job Description lengkap di sini (Tanggung Jawab, Kualifikasi Wajib, Kualifikasi Nilai Tambah)..."
                className="w-full px-4 py-3.5 bg-[#FCFDFC] border border-[#C2D1C9] rounded-xl text-xs sm:text-sm font-sans text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none leading-relaxed transition-all shadow-tactile-sm resize-y"
              />

              {/* Refined Tips Callout Box */}
              <div className="mt-3 p-4 bg-[#EBF6EF]/80 border border-[#BBE5CD] rounded-xl text-xs sm:text-sm text-[#1B4938] shadow-tactile-sm flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#FCFDFC] border border-[#BBE5CD] flex items-center justify-center shrink-0 shadow-tactile-sm mt-0.5">
                  <HelpCircle className="w-4 h-4 text-[#1B4938]" />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-[#13221C] text-xs sm:text-[13px]">
                    Tips Ekstraksi Cepat &amp; Akurasi Deterministik
                  </div>
                  <p className="text-[#40564D] text-xs leading-relaxed">
                    Gunakan tanda strip (<code className="font-mono font-bold text-[#1B4938] bg-[#FCFDFC] px-1.5 py-0.5 rounded border border-[#BBE5CD]">-</code>) di awal setiap baris kualifikasi agar kompilator deterministik AI dapat memecah kriteria per kategori (Pengalaman, Hard Skill, Pendidikan) secara akurat tanpa halusinasi.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-6 border-t border-[#E2E9E5] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={onNext}
              className="text-xs font-semibold text-[#40564D] hover:text-[#13221C] transition-colors cursor-pointer flex items-center gap-1.5 order-2 sm:order-1"
            >
              <span>Lewati ke Step 2 (Gunakan Kriteria yang Sudah Ada)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleExtractAndContinue}
              disabled={isCompiling || !jobDescription.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-[#1B4938] hover:bg-[#2D6A4F] text-[#FCFDFC] font-bold text-xs sm:text-sm rounded-xl shadow-tactile flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.99] order-1 sm:order-2"
            >
              {isCompiling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#BBE5CD]" />
                  <span>Mengekstrak Kriteria dari JD...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#BBE5CD]" />
                  <span>Ekstrak Kriteria &amp; Lanjut ke Step 2</span>
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
