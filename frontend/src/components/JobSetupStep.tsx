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
  ShieldCheck,
  FileCheck2,
  ListOrdered,
  Check,
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

  // Reactive Document Inspection Metrics
  const lineCount = useMemo(() => {
    return jobDescription.split('\n').filter((l) => l.trim().length > 0).length
  }, [jobDescription])

  const charCount = jobDescription.length

  const detectedBullets = useMemo(() => {
    const matches = jobDescription.match(/^\s*[-*•]\s+/gm)
    return matches ? matches.length : 0
  }, [jobDescription])

  const hasExperience = useMemo(
    () => /(pengalaman|experience|tahun|years|min\.\s*\d+)/i.test(jobDescription),
    [jobDescription]
  )
  const hasHardSkills = useMemo(
    () => /(skill|keahlian|kualifikasi|stack|backend|frontend|api|database|sql|python|react|golang|docker|aws)/i.test(jobDescription),
    [jobDescription]
  )
  const hasEducation = useMemo(
    () => /(pendidikan|education|s1|d3|sarjana|degree|sertifikasi|certification|magister)/i.test(jobDescription),
    [jobDescription]
  )

  const isJdReady = charCount >= 100 && detectedBullets >= 2

  return (
    <div className="flex-1 overflow-y-auto bg-[#F2F5F3] py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Executive Studio 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left / Primary Column: Form Setup Studio */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-6 sm:p-8 space-y-7">
              
              {/* Header: Standalone Pill & Uncollided Heading */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#E2E9E5]">
                <div className="flex items-start gap-4">
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
                    <p className="text-xs sm:text-sm text-[#40564D] mt-1.5 leading-relaxed">
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
                    Klik untuk mengisi otomatis seluruh field & kualifikasi teknis
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
                        className={`text-xs px-3.5 py-2 rounded-xl border font-semibold transition-all cursor-pointer shadow-tactile-sm flex items-center gap-2 active:scale-98 ${
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
                    rows={12}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Tempel atau ketik teks Job Description lengkap di sini (Tanggung Jawab, Kualifikasi Wajib, Kualifikasi Nilai Tambah)..."
                    className="w-full px-4 py-3.5 bg-[#FCFDFC] border border-[#C2D1C9] rounded-xl text-xs sm:text-sm font-mono text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none leading-relaxed transition-all shadow-tactile-sm resize-y"
                  />

                  {/* Refined Tips Callout Box */}
                  <div className="mt-3 p-4 bg-[#EBF6EF]/75 border border-[#BBE5CD] rounded-xl text-xs sm:text-sm text-[#1B4938] shadow-tactile-sm flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#FCFDFC] border border-[#BBE5CD] flex items-center justify-center shrink-0 shadow-tactile-sm mt-0.5">
                      <HelpCircle className="w-4 h-4 text-[#1B4938]" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-[#13221C] text-xs sm:text-[13px]">
                        Tips Ekstraksi Cepat & Akurasi Deterministik
                      </div>
                      <p className="text-[#40564D] text-xs leading-relaxed">
                        Gunakan tanda strip (<code className="font-mono font-bold text-[#1B4938] bg-[#EBF1EE] px-1.5 py-0.5 rounded border border-[#D5DFD9]">-</code>) di awal setiap baris kualifikasi agar kompilator deterministik AI dapat memecah kriteria per kategori (Pengalaman, Hard Skill, Pendidikan) secara akurat tanpa halusinasi.
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
                      <span>Ekstrak Kriteria & Lanjut ke Step 2</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right / Supportive Context Column: Executive Intelligence */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Card 1: Pipeline Overview & Funnel Status */}
            <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E9E5] pb-3.5">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-[#1B4938]" />
                  <span className="text-xs sm:text-sm font-bold text-[#13221C]">
                    Alur 4 Tahap Sovereign
                  </span>
                </div>
                <span className="font-mono text-[10px] font-semibold text-[#1B6C47] bg-[#EBF6EF] px-2 py-0.5 rounded border border-[#BBE5CD]">
                  Step 1 Aktif
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#EBF6EF]/60 border border-[#BBE5CD] flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1B4938] text-[#FCFDFC] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#13221C]">Setup Lowongan Kerja</div>
                    <div className="text-[11px] text-[#1B6C47] font-medium mt-0.5">
                      Sedang aktif — Tentukan peran, lokasi, dan teks deskripsi posisi.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F8F6] border border-[#E2E9E5] flex items-start gap-3 opacity-90">
                  <div className="w-6 h-6 rounded-full bg-[#D5DFD9] text-[#40564D] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#13221C]">Kriteria & Bobot 100%</div>
                    <div className="text-[11px] text-[#40564D] mt-0.5">
                      Validasi kualifikasi deterministik, must-have, dan distribusi bobot.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F8F6] border border-[#E2E9E5] flex items-start gap-3 opacity-75">
                  <div className="w-6 h-6 rounded-full bg-[#D5DFD9] text-[#40564D] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#13221C]">Unggah Berkas CV</div>
                    <div className="text-[11px] text-[#40564D] mt-0.5">
                      Ingestion berkas, sanitasi dokumen, dan deduplikasi hash.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F8F6] border border-[#E2E9E5] flex items-start gap-3 opacity-60">
                  <div className="w-6 h-6 rounded-full bg-[#D5DFD9] text-[#40564D] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    4
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#13221C]">Workbench Skrining</div>
                    <div className="text-[11px] text-[#40564D] mt-0.5">
                      Audit bukti forensik, verifikasi sitasi kutipan, dan ranking final.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Integritas Penilaian Jev Scorer */}
            <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E9E5] pb-3.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#1B4938]" />
                  <span className="text-xs sm:text-sm font-bold text-[#13221C]">
                    Standar Objektivitas Jev
                  </span>
                </div>
                <span className="font-mono text-[10px] font-semibold text-[#40564D] bg-[#F5F8F6] px-2 py-0.5 rounded border border-[#D5DFD9]">
                  Anti-Slop
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#EBF6EF] text-[#1B6C47] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <span className="font-bold text-[#13221C]">Zero Halusinasi:</span>
                    <p className="text-[#40564D] text-[11px] leading-relaxed mt-0.5">
                      Penilaian skor 100% didasarkan pada teks resume pelamar. Asumsi tanpa bukti eksplisit langsung digugurkan.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#EBF6EF] text-[#1B6C47] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <span className="font-bold text-[#13221C]">Anchored Citations:</span>
                    <p className="text-[#40564D] text-[11px] leading-relaxed mt-0.5">
                      Setiap klaim kecocokan melampirkan kutipan klausa asli dari CV untuk audit forensik yang dapat dipertanggungjawabkan.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#EBF6EF] text-[#1B6C47] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <span className="font-bold text-[#13221C]">Blind Screening:</span>
                    <p className="text-[#40564D] text-[11px] leading-relaxed mt-0.5">
                      Identitas sensitif (nama, gender, usia, foto) disamarkan selama evaluasi untuk memastikan keadilan seleksi talenta.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Analisis Kesiapan Dokumen JD */}
            <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E9E5] pb-3.5">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-[#1B4938]" />
                  <span className="text-xs sm:text-sm font-bold text-[#13221C]">
                    Inspeksi Kesiapan JD
                  </span>
                </div>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isJdReady
                      ? 'bg-[#EBF6EF] text-[#1B6C47] border-[#BBE5CD]'
                      : 'bg-[#FEF6E8] text-[#8A4C05] border-[#F8D8A7]'
                  }`}
                >
                  {isJdReady ? 'Siap Ekstraksi' : 'Perlu Detail'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 px-2.5 bg-[#F5F8F6] rounded-lg border border-[#E2E9E5]">
                  <span className="text-[#40564D]">Butir Kualifikasi Bertanda Strip:</span>
                  <span className="font-mono font-bold text-[#13221C]">
                    {detectedBullets} butir
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 px-2.5 bg-[#F5F8F6] rounded-lg border border-[#E2E9E5]">
                  <span className="text-[#40564D]">Deteksi Pengalaman:</span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      hasExperience ? 'text-[#1B6C47]' : 'text-[#8A4C05]'
                    }`}
                  >
                    {hasExperience ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" /> Terdeteksi
                      </>
                    ) : (
                      'Belum Spesifik'
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 px-2.5 bg-[#F5F8F6] rounded-lg border border-[#E2E9E5]">
                  <span className="text-[#40564D]">Deteksi Keahlian Teknis:</span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      hasHardSkills ? 'text-[#1B6C47]' : 'text-[#8A4C05]'
                    }`}
                  >
                    {hasHardSkills ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" /> Terdeteksi
                      </>
                    ) : (
                      'Belum Spesifik'
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 px-2.5 bg-[#F5F8F6] rounded-lg border border-[#E2E9E5]">
                  <span className="text-[#40564D]">Deteksi Pendidikan / Sertifikasi:</span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      hasEducation ? 'text-[#1B6C47]' : 'text-[#8A4C05]'
                    }`}
                  >
                    {hasEducation ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" /> Terdeteksi
                      </>
                    ) : (
                      'Belum Spesifik'
                    )}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
