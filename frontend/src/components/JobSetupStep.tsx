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
                  <span className="font-mono text-[11px] font-bold text-[#1B6C47] uppercase tracking-wider bg-[#EBF6EF] px-2 py-0.5 rounded border border-[#BBE5CD]">
                    Tahap 1 dari 4
                  </span>
                  <h1 className="text-lg sm:text-xl font-bold text-[#13221C] tracking-tight">
                    Setup Lowongan Kerja
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-[#40564D] mt-1">
                  Tentukan profil posisi kerja dan masukkan teks deskripsi lowongan (JD). Mesin Solaris akan mengekstrak kriteria kompetensi deterministik secara otomatis.
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 text-xs">
              <span className="text-[#40564D] text-[11px]">Status Kriteria:</span>
              <span
                className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  criteriaApproved
                    ? 'bg-[#EBF6EF] text-[#1B6C47] border-[#BBE5CD]'
                    : 'bg-[#FEF6E8] text-[#8A4C05] border-[#F8D8A7]'
                }`}
              >
                {criteriaApproved ? `Disetujui (v${criteriaVersion})` : 'Draf Baru'}
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
              <span className="text-[11px] text-[#40564D] font-medium hidden sm:inline">
                Klik untuk mengisi otomatis seluruh field & kualifikasi teknis
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ROLE_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id || jobTitle === tmpl.title
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer shadow-tactile-sm flex items-center space-x-1.5 active:scale-98 ${
                      isSelected
                        ? 'bg-[#1B4938] text-[#FCFDFC] border-[#1B4938]'
                        : 'bg-[#FCFDFC] border-[#D5DFD9] text-[#13221C] hover:text-[#1B4938] hover:border-[#1B4938]/40 hover:bg-[#EBF1EE]'
                    }`}
                  >
                    <span>{tmpl.role}</span>
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-[#BBE5CD]" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form Fields */}
          <div className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#13221C] mb-1.5">
                Judul Posisi Pekerjaan <span className="text-[#9E2A2B]">*</span>
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Misal: Senior Backend Engineer / AI Research Engineer"
                className="w-full px-3.5 py-2.5 bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl text-sm font-medium text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none transition-all shadow-tactile-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#13221C] mb-1.5 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#40564D]" />
                  <span>Lokasi Penempatan</span>
                </label>
                <input
                  type="text"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  placeholder="Misal: Jakarta / Hybrid, Remote ID"
                  className="w-full px-3.5 py-2 bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl text-sm font-medium text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none transition-all shadow-tactile-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#13221C] mb-1.5 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#40564D]" />
                  <span>Tipe Pekerjaan</span>
                </label>
                <input
                  type="text"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  placeholder="Penuh Waktu (Full-time) / Kontrak"
                  className="w-full px-3.5 py-2 bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl text-sm font-medium text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none transition-all shadow-tactile-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#13221C]">
                  Deskripsi Pekerjaan (Job Description) <span className="text-[#9E2A2B]">*</span>
                </label>
                <span className="text-[11px] text-[#40564D] flex items-center space-x-1 font-mono">
                  <Layers className="w-3.5 h-3.5 text-[#1B4938]" />
                  <span>{jobDescription.split('\n').filter(Boolean).length} baris terdeteksi</span>
                </span>
              </div>
              <textarea
                rows={10}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Tempel atau ketik teks Job Description lengkap di sini (Tanggung Jawab, Kualifikasi Wajib, Kualifikasi Nilai Tambah)..."
                className="w-full px-3.5 py-3 bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl text-xs sm:text-sm font-mono text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none leading-relaxed transition-all shadow-tactile-sm resize-y"
              />
              <div className="mt-2 p-3 bg-[#F5F8F6] border border-[#D5DFD9] rounded-lg text-xs text-[#40564D] flex items-start space-x-2">
                <HelpCircle className="w-4 h-4 text-[#1B4938] shrink-0 mt-0.5" />
                <p>
                  <strong>Tips Ekstraksi Cepat:</strong> Gunakan tanda strip (<code className="font-mono text-[#1B4938]">-</code>) untuk butir kualifikasi agar kompilator deterministik AI dapat memecah kriteria per kategori (Pengalaman, Hard Skill, Pendidikan) secara akurat tanpa halusinasi.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="mt-8 pt-5 border-t border-[#E2E9E5] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={onNext}
              className="text-xs font-semibold text-[#40564D] hover:text-[#13221C] transition-colors cursor-pointer"
            >
              Lewati ke Step 2 (Gunakan Kriteria yang Sudah Ada) →
            </button>

            <button
              type="button"
              onClick={handleExtractAndContinue}
              disabled={isCompiling || !jobDescription.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-[#1B4938] hover:bg-[#2D6A4F] text-[#FCFDFC] font-bold text-xs sm:text-sm rounded-xl shadow-tactile flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.99]"
            >
              {isCompiling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#BBE5CD]" />
                  <span>Mengekstrak Kriteria dari JD...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#BBE5CD]" />
                  <span>Ekstrak Kriteria & Lanjut ke Step 2</span>
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
