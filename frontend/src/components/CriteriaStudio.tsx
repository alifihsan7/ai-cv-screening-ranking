import React, { useState, useMemo } from 'react'
import {
  FileText,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Layers,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { Requirement } from '../types'

export interface CriteriaStudioProps {
  jobTitle: string
  setJobTitle: (val: string) => void
  jobLocation: string
  setJobLocation: (val: string) => void
  jobType: string
  setJobType: (val: string) => void
  jobDescription: string
  setJobDescription: (val: string) => void
  requirements: Requirement[]
  setRequirements: (reqs: Requirement[]) => void
  categoryWeights: Record<string, number>
  setCategoryWeights: (weights: Record<string, number>) => void
  criteriaApproved: boolean
  criteriaVersion: number
  isCompiling: boolean
  onCompileFromJd: () => void
  onApproveCriteria: () => void
  onBack?: () => void
  onNext?: () => void
}

export const CriteriaStudio: React.FC<CriteriaStudioProps> = ({
  jobTitle,
  setJobTitle,
  jobLocation,
  setJobLocation,
  jobType,
  setJobType,
  jobDescription,
  setJobDescription,
  requirements,
  setRequirements,
  categoryWeights,
  setCategoryWeights,
  criteriaApproved,
  criteriaVersion,
  isCompiling,
  onCompileFromJd,
  onApproveCriteria,
  onBack,
  onNext,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL')
  const [newDesc, setNewDesc] = useState('')
  const [newCategory, setNewCategory] = useState<string>('HARD_SKILLS')
  const [newImportance, setNewImportance] = useState<string>('MUST_HAVE')
  const [newWeight, setNewWeight] = useState<number>(10)

  // Policy Linter: Bias & Prohibited Criteria Detection
  const prohibitedFlags = useMemo(() => {
    const flags: string[] = []
    requirements.forEach((r) => {
      const txt = (r.description + ' ' + (r.source_text || '')).toLowerCase()
      if (/\busia\b|\bumur\b|maks\.\s*\d+|max\s*\d+\s*tahun/.test(txt)) {
        flags.push(`Kriteria usia (${r.requirement_id}): Tidak diperkenankan sesuai doktrin anti-bias Solaris`)
      }
      if (/\bpria\b|\bwanita\b|\bgender\b|\blaki-laki\b|\bperempuan\b/.test(txt)) {
        flags.push(`Kriteria gender (${r.requirement_id}): Tidak diperkenankan sesuai doktrin anti-bias Solaris`)
      }
      if (/menarik|penampilan|good looking|tinggi|berat/.test(txt)) {
        flags.push(`Kriteria fisik (${r.requirement_id}): Evaluasi wajib 100% berbasis kompetensi teknis`)
      }
    })
    return flags
  }, [requirements])

  // Total weight sum
  const totalCategoryWeight = useMemo(() => {
    return (
      Number(categoryWeights.EXPERIENCE || 0) +
      Number(categoryWeights.HARD_SKILLS || 0) +
      Number(categoryWeights.EDUCATION_CERT || 0) +
      Number(categoryWeights.ACHIEVEMENT || 0)
    )
  }, [categoryWeights])

  const filteredRequirements = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return requirements
    return requirements.filter((r) => r.category === selectedCategoryFilter)
  }, [requirements, selectedCategoryFilter])

  const handleAddCriteria = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDesc.trim()) return

    const newId = `R${requirements.length + 1}`
    const newReq: Requirement = {
      requirement_id: newId,
      description: newDesc.trim(),
      category: newCategory,
      kind: 'SKILL',
      importance: newImportance,
      weight: Number(newWeight) || 5,
      concepts: [],
      source_text: 'Ditambahkan manual di Studio Kriteria',
    }

    setRequirements([...requirements, newReq])
    setNewDesc('')
  }

  const handleDeleteCriteria = (id: string) => {
    setRequirements(requirements.filter((r) => r.requirement_id !== id))
  }

  const handleUpdateRequirement = (id: string, updates: Partial<Requirement>) => {
    setRequirements(
      requirements.map((r) => (r.requirement_id === id ? { ...r, ...updates } : r))
    )
  }

  const handleSaveAndContinue = () => {
    if (!criteriaApproved) {
      onApproveCriteria()
    }
    if (onNext) {
      onNext()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F2F5F3] select-none">
      {/* Dual Column Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Kolom Kiri (60%): Editor Kriteria */}
        <div className="w-[60%] border-r border-[#D5DFD9] bg-[#FCFDFC] flex flex-col h-full overflow-hidden">
        {/* Header Editor */}
        <div className="px-5 py-3 border-b border-[#D5DFD9] bg-[#FCFDFC] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-[#13221C] tracking-tight">
                Studio Kriteria & Spesifikasi Evaluasi
              </h2>
              <span className="font-mono text-[10px] bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9] px-2 py-0.5 rounded font-semibold tabular-nums">
                v{criteriaVersion}
              </span>
            </div>
            <p className="text-xs text-[#40564D] mt-0.5">
              Definisikan aturan kualifikasi deterministik yang dieksekusi oleh verifier Jev.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onCompileFromJd}
              disabled={isCompiling}
              className="h-7 px-3 bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[#13221C] text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-tactile-sm disabled:opacity-50"
            >
              {isCompiling ? (
                <Loader2 className="w-3.5 h-3.5 text-[#1B4938] animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#1B4938]" />
              )}
              <span>Ekstraksi dari JD</span>
            </button>

            <button
              type="button"
              onClick={onApproveCriteria}
              disabled={prohibitedFlags.length > 0}
              className="h-7 px-3 bg-[#1B4938] hover:bg-[#2D6A4F] text-[#FCFDFC] text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-tactile-sm disabled:opacity-40"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{criteriaApproved ? 'Kunci & Disetujui' : 'Setujui Kriteria'}</span>
            </button>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="px-5 py-2 border-b border-[#E2E9E5] bg-[#F5F8F6] flex items-center space-x-1 shrink-0 overflow-x-auto">
          {[
            { id: 'ALL', label: 'Semua Kriteria', count: requirements.length },
            { id: 'EXPERIENCE', label: 'Pengalaman', count: requirements.filter((r) => r.category === 'EXPERIENCE').length },
            { id: 'HARD_SKILLS', label: 'Hard Skill', count: requirements.filter((r) => r.category === 'HARD_SKILLS').length },
            { id: 'EDUCATION_CERTIFICATION', label: 'Edukasi', count: requirements.filter((r) => r.category.includes('EDUCATION')).length },
            { id: 'ACHIEVEMENT_LEADERSHIP', label: 'Soft Skill & Prestasi', count: requirements.filter((r) => r.category.includes('ACHIEVEMENT')).length },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className={`h-6 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                selectedCategoryFilter === cat.id
                  ? 'bg-[#1B4938] text-[#FCFDFC] shadow-tactile-sm'
                  : 'text-[#40564D] hover:text-[#13221C] hover:bg-[#EBF1EE]'
              }`}
            >
              <span>{cat.label}</span>
              <span className="font-mono tabular-nums text-[10px] opacity-80">
                ({cat.count})
              </span>
            </button>
          ))}
        </div>

        {/* Scrollable Criteria List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredRequirements.map((r) => {
            const isMustHave = r.importance === 'MUST_HAVE'
            return (
              <div
                key={r.requirement_id}
                className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl p-3.5 space-y-3 shadow-tactile-sm hover:border-[#1B4938]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-[#1B4938] bg-[#EBF1EE] px-2 py-0.5 rounded border border-[#D5DFD9]">
                      {r.requirement_id}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateRequirement(r.requirement_id, {
                          importance: isMustHave ? 'NICE_TO_HAVE' : 'MUST_HAVE',
                        })
                      }
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold cursor-pointer transition-colors ${
                        isMustHave
                          ? 'bg-[#FCEBEB] text-[#9E2A2B] border-[#F6C1C1]'
                          : 'bg-[#EBF6EF] text-[#1B6C47] border-[#BBE5CD]'
                      }`}
                    >
                      {isMustHave ? 'MUST HAVE' : 'NICE TO HAVE'}
                    </button>
                    <span className="text-[10px] font-mono text-[#40564D]">
                      {r.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] font-mono text-[#40564D]">Bobot:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={r.weight}
                        onChange={(e) =>
                          handleUpdateRequirement(r.requirement_id, {
                            weight: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-12 px-1.5 py-0.5 text-center font-mono tabular-nums text-xs font-bold bg-[#F5F8F6] border border-[#D5DFD9] rounded focus:outline-none focus:border-[#1B4938]"
                      />
                      <span className="text-[10px] font-mono text-[#40564D]">%</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteCriteria(r.requirement_id)}
                      className="p-1 text-[#40564D] hover:text-[#9E2A2B] hover:bg-[#FCEBEB] rounded transition-colors cursor-pointer"
                      title="Hapus Kriteria"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={r.description}
                    onChange={(e) =>
                      handleUpdateRequirement(r.requirement_id, {
                        description: e.target.value,
                      })
                    }
                    className="w-full text-xs font-medium text-[#13221C] bg-[#F5F8F6] focus:bg-[#FCFDFC] border border-[#D5DFD9] focus:border-[#1B4938] px-2.5 py-1.5 rounded-lg focus:outline-none transition-all"
                  />
                  {r.source_text && (
                    <p className="text-[11px] text-[#40564D] font-mono mt-1 italic">
                      Sumber: &quot;{r.source_text}&quot;
                    </p>
                  )}
                </div>
              </div>
            )
          })}

          {/* Form Tambah Kriteria Baru */}
          <form
            onSubmit={handleAddCriteria}
            className="bg-[#F5F8F6] border border-dashed border-[#D5DFD9] rounded-xl p-4 space-y-3 mt-4"
          >
            <div className="flex items-center space-x-2 text-xs font-bold text-[#13221C]">
              <Plus className="w-4 h-4 text-[#1B4938]" />
              <span>Tambah Kriteria Spesifik Secara Manual</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Deskripsi kriteria (e.g. Mahir Redis & Celery)..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full text-xs bg-[#FCFDFC] border border-[#D5DFD9] focus:border-[#1B4938] px-3 py-1.5 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="text-xs bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg px-2 py-1.5 focus:outline-none"
                >
                  <option value="EXPERIENCE">Pengalaman</option>
                  <option value="HARD_SKILLS">Hard Skill</option>
                  <option value="EDUCATION_CERTIFICATION">Edukasi</option>
                  <option value="ACHIEVEMENT_LEADERSHIP">Prestasi/Soft</option>
                </select>

                <select
                  value={newImportance}
                  onChange={(e) => setNewImportance(e.target.value)}
                  className="text-xs bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg px-2 py-1.5 focus:outline-none"
                >
                  <option value="MUST_HAVE">Must Have</option>
                  <option value="STRONG_PREFERENCE">Strong</option>
                  <option value="NICE_TO_HAVE">Nice to Have</option>
                </select>

                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newWeight}
                  onChange={(e) => setNewWeight(parseInt(e.target.value) || 5)}
                  className="w-12 text-center text-xs font-mono font-bold bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg py-1.5 focus:outline-none"
                  title="Bobot (%)"
                />

                <button
                  type="submit"
                  className="h-8 px-3 bg-[#1B4938] hover:bg-[#2D6A4F] text-[#FCFDFC] text-xs font-semibold rounded-lg shrink-0 transition-all cursor-pointer"
                >
                  Tambah
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Kolom Kanan (40%): Live Impact Simulator & Policy Linter */}
      <div className="w-[40%] bg-[#F2F5F3] flex flex-col h-full overflow-y-auto p-5 space-y-5">
        {/* Policy Linter Card */}
        <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 shadow-tactile space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E9E5] pb-2">
            <div className="flex items-center space-x-2">
              {prohibitedFlags.length > 0 ? (
                <ShieldAlert className="w-4 h-4 text-[#9E2A2B]" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-[#1B6C47]" />
              )}
              <h3 className="text-xs font-bold text-[#13221C] uppercase tracking-wider">
                Policy Linter (Anti-Bias & Regulasi)
              </h3>
            </div>
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                prohibitedFlags.length > 0
                  ? 'bg-[#FCEBEB] text-[#9E2A2B] border border-[#F6C1C1]'
                  : 'bg-[#EBF6EF] text-[#1B6C47] border border-[#BBE5CD]'
              }`}
            >
              {prohibitedFlags.length > 0 ? `${prohibitedFlags.length} Pelanggaran` : 'Lolos Audit'}
            </span>
          </div>

          {prohibitedFlags.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-[#9E2A2B] font-medium leading-relaxed">
                Peringatan: Ditemukan kriteria yang berpotensi melanggar doktrin anti-bias.
                Harap hapus atau ubah sebelum menyetujui kriteria:
              </p>
              <ul className="space-y-1">
                {prohibitedFlags.map((flag, idx) => (
                  <li
                    key={idx}
                    className="p-2 rounded-lg bg-[#FCEBEB] text-[#9E2A2B] text-xs font-mono leading-relaxed flex items-start space-x-1.5"
                  >
                    <span>⚠️</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#EBF6EF] border border-[#BBE5CD] text-xs text-[#134E35] space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#134E35]" />
                <span>Seluruh Kriteria Bebas dari Bias Demografis</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#134E35]/90">
                Tidak ditemukan batasan diskriminatif usia, gender, maupun penampilan fisik.
                Evaluasi 100% deterministik berbasis kompetensi.
              </p>
            </div>
          )}
        </section>

        {/* Live Impact Simulator: Distribusi Bobot Kategori */}
        <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 shadow-tactile space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E9E5] pb-2">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#1B4938]" />
              <h3 className="text-xs font-bold text-[#13221C] uppercase tracking-wider">
                Distribusi Bobot Kategori (Wajib 100%)
              </h3>
            </div>
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold tabular-nums ${
                totalCategoryWeight === 100
                  ? 'bg-[#EBF6EF] text-[#1B6C47] border border-[#BBE5CD]'
                  : 'bg-[#FEF6E8] text-[#8A4C05] border border-[#F8D8A7]'
              }`}
            >
              Total: {totalCategoryWeight}%
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              { key: 'EXPERIENCE', label: 'Pengalaman Kerja', color: '#1B4938' },
              { key: 'HARD_SKILLS', label: 'Hard Skill Teknis', color: '#2D6A4F' },
              { key: 'EDUCATION_CERT', label: 'Pendidikan & Sertifikasi', color: '#8A4C05' },
              { key: 'ACHIEVEMENT', label: 'Prestasi & Kepemimpinan', color: '#40564D' },
            ].map((cat) => {
              const val = categoryWeights[cat.key] || 0
              return (
                <div key={cat.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#13221C]">{cat.label}</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={val}
                        onChange={(e) =>
                          setCategoryWeights({
                            ...categoryWeights,
                            [cat.key]: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
                          })
                        }
                        className="w-12 px-1 text-center font-mono tabular-nums text-xs font-bold bg-[#F5F8F6] border border-[#D5DFD9] rounded focus:outline-none focus:border-[#1B4938]"
                      />
                      <span className="font-mono text-[11px] text-[#40564D]">%</span>
                    </div>
                  </div>
                  {/* Visual Bar */}
                  <div className="w-full h-1.5 bg-[#EBF1EE] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, val)}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {totalCategoryWeight !== 100 && (
            <div className="p-2.5 rounded-xl bg-[#FEF6E8] border border-[#F8D8A7] text-[11px] text-[#8A4C05] flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Jumlah persentase kategori saat ini <strong>{totalCategoryWeight}%</strong>. Sesuaikan
                agar tepat 100%.
              </span>
            </div>
          )}
        </section>

        {/* Job Description Preview Card */}
        <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-4 shadow-tactile space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E9E5] pb-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#1B4938]" />
              <h3 className="text-xs font-bold text-[#13221C] uppercase tracking-wider">
                Rincian & Deskripsi Posisi
              </h3>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-[10px] font-mono text-[#40564D] uppercase font-bold mb-1">
                Judul Posisi
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F5F8F6] focus:bg-[#FCFDFC] border border-[#D5DFD9] focus:border-[#1B4938] rounded-lg text-xs font-semibold text-[#13221C] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-[#40564D] uppercase font-bold mb-1">
                  Lokasi
                </label>
                <input
                  type="text"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F5F8F6] focus:bg-[#FCFDFC] border border-[#D5DFD9] focus:border-[#1B4938] rounded-lg text-xs text-[#13221C] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#40564D] uppercase font-bold mb-1">
                  Tipe Kerja
                </label>
                <input
                  type="text"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F5F8F6] focus:bg-[#FCFDFC] border border-[#D5DFD9] focus:border-[#1B4938] rounded-lg text-xs text-[#13221C] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-[#40564D] uppercase font-bold mb-1">
                Teks Job Description (JD)
              </label>
              <textarea
                rows={6}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#F5F8F6] focus:bg-[#FCFDFC] border border-[#D5DFD9] focus:border-[#1B4938] rounded-lg font-mono text-[11px] text-[#13221C] leading-relaxed focus:outline-none resize-none"
              />
            </div>
          </div>
        </section>
      </div>
    </div>

    {/* Tactile Workflow Navigation Footer */}
      <footer className="h-12 border-t border-[#D5DFD9] bg-[#FCFDFC] px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-tactile-sm z-10">
        <button
          type="button"
          onClick={onBack}
          className="h-8 px-3 text-xs font-semibold text-[#40564D] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-[#D5DFD9] rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-tactile-sm active:scale-98"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Setup Lowongan</span>
        </button>

        <div className="hidden md:flex items-center space-x-3 text-xs font-mono">
          <span className="text-[#40564D]">
            Total Bobot:{' '}
            <strong
              className={
                totalCategoryWeight === 100
                  ? 'text-[#1B6C47]'
                  : 'text-[#8A4C05] font-bold underline'
              }
            >
              {totalCategoryWeight}%
            </strong>
          </span>
          <span className="text-[#D5DFD9]">|</span>
          <span className="text-[#40564D]">
            Kriteria: <strong className="text-[#13221C]">{requirements.length} item</strong>
          </span>
          <span className="text-[#D5DFD9]">|</span>
          <span className="text-[#40564D]">
            Status:{' '}
            <strong className={criteriaApproved ? 'text-[#1B6C47]' : 'text-[#8A4C05]'}>
              {criteriaApproved ? `Disetujui (v${criteriaVersion})` : 'Draf'}
            </strong>
          </span>
        </div>

        <button
          type="button"
          onClick={handleSaveAndContinue}
          className="h-8 px-4 bg-[#1B4938] hover:bg-[#2D6A4F] text-[#FCFDFC] text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer shadow-tactile-sm active:scale-98"
        >
          <span>Simpan & Lanjut ke Unggah CV</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </footer>
    </div>
  )
}
