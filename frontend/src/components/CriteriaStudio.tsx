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
  LockOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { Requirement } from '../types'
import type { SelectOption } from './CustomSelect'
import { CustomSelect } from './CustomSelect'

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
  isLocked?: boolean
  isDirty?: boolean
  approvedSnapshot?: string | null
  onCompileFromJd: () => void
  onApproveCriteria: () => void
  onBack?: () => void
  onNext?: () => void
  showToast?: (arg1: string, arg2?: string) => void
}

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'EXPERIENCE', label: 'Pengalaman' },
  { value: 'HARD_SKILLS', label: 'Hard Skill' },
  { value: 'EDUCATION_CERT', label: 'Pendidikan' },
  { value: 'ACHIEVEMENT', label: 'Pencapaian' },
]

const IMPORTANCE_OPTIONS: SelectOption[] = [
  {
    value: 'MUST_HAVE',
    label: 'Wajib',
    labelClassName: 'text-[#8C1819] font-bold',
    colorClassName: 'text-[#8C1819] font-bold',
    dotClassName: 'bg-[#8C1819]',
    containerClassName: 'bg-[#FCEBEB] border-[#F6C1C1]',
  },
  {
    value: 'STRONG_PREFERENCE',
    label: 'Diutamakan',
    labelClassName: 'text-[#7A3E02] font-bold',
    colorClassName: 'text-[#7A3E02] font-bold',
    dotClassName: 'bg-[#7A3E02]',
    containerClassName: 'bg-[#FEF6E8] border-[#F8D8A7]',
  },
  {
    value: 'NICE_TO_HAVE',
    label: 'Nilai Tambah',
    labelClassName: 'text-[#124B2E] font-bold',
    colorClassName: 'text-[#124B2E] font-bold',
    dotClassName: 'bg-[#124B2E]',
    containerClassName: 'bg-[#EBF6EF] border-[#BBE5CD]',
  },
]

const normalizeCategory = (cat: string) => {
  if (cat === 'EDUCATION_CERT' || cat === 'EDUCATION_CERTIFICATION') return 'EDUCATION_CERT'
  if (cat === 'ACHIEVEMENT' || cat === 'ACHIEVEMENT_LEADERSHIP') return 'ACHIEVEMENT'
  return cat
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
  criteriaApproved: _criteriaApproved,
  criteriaVersion,
  isCompiling,
  isLocked: propIsLocked,
  isDirty: propIsDirty,
  approvedSnapshot,
  onCompileFromJd,
  onApproveCriteria,
  onBack,
  onNext,
  showToast: propShowToast,
}) => {
  const showToast = (arg1: string, arg2?: string) => {
    if (propShowToast) {
      propShowToast(arg1, arg2)
    }
  }
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL')
  const [isManualFormOpen, setIsManualFormOpen] = useState<boolean>(true)
  const [newDesc, setNewDesc] = useState('')
  const [newCategory, setNewCategory] = useState<string>('HARD_SKILLS')
  const [newImportance, setNewImportance] = useState<string>('MUST_HAVE')
  const [newWeight, setNewWeight] = useState<number>(10)
  const [showUnapprovedWarning, setShowUnapprovedWarning] = useState<boolean>(false)

  // Snapshot dirty-checking
  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      reqs: requirements.map((r) => ({
        id: r.requirement_id,
        desc: r.description || '',
        cat: r.category,
        imp: r.importance,
        w: Number(r.weight) || 0,
      })),
      weights: {
        EXPERIENCE: Number(categoryWeights?.EXPERIENCE) || 0,
        HARD_SKILLS: Number(categoryWeights?.HARD_SKILLS) || 0,
        EDUCATION_CERT: Number(categoryWeights?.EDUCATION_CERT) || 0,
        ACHIEVEMENT: Number(categoryWeights?.ACHIEVEMENT) || 0,
      },
    })
  }, [requirements, categoryWeights])

  const computedLocked = Boolean(
    approvedSnapshot && requirements.length > 0 && currentSnapshot === approvedSnapshot
  )
  const computedDirty = Boolean(
    approvedSnapshot && currentSnapshot !== approvedSnapshot
  )

  const isLocked = propIsLocked !== undefined ? propIsLocked : computedLocked
  const isDirty = propIsDirty !== undefined ? propIsDirty : computedDirty

  // Policy Linter: Bias & Prohibited Criteria Detection
  const prohibitedFlags = useMemo(() => {
    const flags: string[] = []
    requirements.forEach((r) => {
      const txt = (r.description + ' ' + (r.source_text || '')).toLowerCase()
      if (
        /\b(?:(?:maks(?:\.|imal)?|min(?:imal)?|max)\s*(?:usia|umur)\s*\d+|\b(?:usia|umur)\s*(?:maks(?:\.|imal)?|min(?:imal)?|max)?\s*\d+\s*(?:tahun|thn)?)\b/i.test(
          txt
        )
      ) {
        flags.push(`Kriteria usia (${r.requirement_id}): Tidak diperkenankan sesuai aturan anti-bias`)
      }
      if (
        /\b(?:khusus\s*(?:pria|wanita|laki-laki|perempuan)|hanya\s*(?:pria|wanita|laki-laki|perempuan)|wajib\s*(?:pria|wanita|laki-laki|perempuan))\b/i.test(
          txt
        )
      ) {
        flags.push(`Kriteria gender (${r.requirement_id}): Tidak diperkenankan sesuai aturan anti-bias`)
      }
      if (
        /\b(?:tinggi\s*badan|berat\s*badan|tinggi\s*min(?:imal)?|berat\s*min(?:imal)?|berpenampilan\s*menarik|penampilan\s*menarik|good\s*looking|foto\s*(?:full\s*body|seluruh\s*badan)|proporsional\s*(?:badan|fisik))\b/i.test(
          txt
        )
      ) {
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

  const isWeightValid = Math.abs(totalCategoryWeight - 100) < 0.01

  const filteredRequirements = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return requirements
    return requirements.filter((r) => normalizeCategory(r.category) === selectedCategoryFilter)
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

  const handleApprovalClick = () => {
    if (isLocked) {
      showToast(
        'info',
        `Kriteria telah disetujui & dikunci resmi (v${criteriaVersion}). Ubah salah satu kriteria atau bobot jika ingin menyetujui versi baru.`
      )
      return
    }

    if (requirements.length === 0) {
      showToast(
        'error',
        'Belum ada kriteria! Tambahkan minimal 1 kriteria manual atau klik "Ekstraksi dari JD".'
      )
      return
    }

    if (prohibitedFlags.length > 0) {
      showToast(
        'error',
        `Terdapat ${prohibitedFlags.length} kriteria yang melanggar aturan anti-bias. Silakan periksa panel Policy Linter dan sesuaikan kriteria tersebut.`
      )
      return
    }

    if (!isWeightValid) {
      showToast(
        'error',
        `Total bobot kategori harus tepat 100% (saat ini ${totalCategoryWeight}%). Silakan sesuaikan bobot pada panel kiri.`
      )
      return
    }

    // Jika semua validasi lolos:
    setShowUnapprovedWarning(false)
    onApproveCriteria()
  }

  const handleSaveAndContinue = () => {
    if (!isLocked) {
      if (showToast) {
        if (requirements.length === 0) {
          showToast('Kriteria lowongan masih kosong. Ekstraksi dari JD atau tambahkan kriteria terlebih dahulu!', 'warning')
        } else {
          showToast('Harap setujui kriteria terlebih dahulu sebelum lanjut ke tahap Unggah CV!', 'warning')
        }
      }
      setShowUnapprovedWarning(true)
      return
    }
    setShowUnapprovedWarning(false)
    if (onNext) {
      onNext()
    }
  }

  return (
    <div className="flex-1 w-full bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile-sm overflow-hidden flex flex-col h-full min-h-0">
      {/* Dual Column Studio Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Kolom Kiri (~58-60%): Editor Kriteria */}
        <div className="w-full lg:w-[58%] xl:w-[60%] border-b lg:border-b-0 lg:border-r border-[#D5DFD9] bg-[#FCFDFC] flex flex-col h-full overflow-hidden min-h-0">
          {/* Header Editor */}
          <div className="px-4 sm:px-5 py-3 border-b border-[#D5DFD9] bg-[#FCFDFC] flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-[#13221C] tracking-tight">
                  Studio Kriteria & Spesifikasi Evaluasi
                </h2>
                <span className="font-mono text-[10px] bg-[#EBF1EE] text-[#2D4439] border border-[#D5DFD9] px-2 py-0.5 rounded font-semibold tabular-nums">
                  v{criteriaVersion}
                </span>
              </div>
              <p className="text-xs text-[#2D4439] mt-0.5">
                Definisikan aturan kualifikasi deterministik yang dieksekusi oleh verifier Jev.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={onCompileFromJd}
                disabled={isCompiling}
                className="h-8 px-3 bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[#13221C] text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all duration-150 cursor-pointer shadow-tactile-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] active:scale-[0.98]"
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
                onClick={handleApprovalClick}
                title={
                  isLocked
                    ? `Kriteria telah disetujui & dikunci (v${criteriaVersion}). Lakukan perubahan pada kriteria atau bobot untuk membuka kunci.`
                    : prohibitedFlags.length > 0
                    ? 'Perbaiki kriteria yang melanggar aturan anti-bias sebelum menyetujui.'
                    : !isWeightValid
                    ? `Total bobot kategori harus tepat 100% (saat ini ${totalCategoryWeight}%).`
                    : requirements.length === 0
                    ? 'Tambahkan minimal 1 kriteria sebelum menyetujui.'
                    : isDirty
                    ? 'Klik untuk menyetujui dan mengunci perubahan kriteria terbaru.'
                    : 'Klik untuk menyetujui dan mengunci kriteria.'
                }
                className={
                  isLocked
                    ? 'h-8 px-3 bg-[#EBF6EF] hover:bg-[#DDF0E4] border border-[#BBE5CD] text-[#124B2E] text-xs font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-tactile-sm transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124B2E]'
                    : 'h-8 px-3 bg-[#1B4938] hover:bg-[#265B46] text-[#FCFDFC] text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all duration-150 cursor-pointer shadow-tactile-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938]'
                }
              >
                {isLocked ? (
                  <Lock className="w-3.5 h-3.5 text-[#124B2E]" />
                ) : (
                  <LockOpen className="w-3.5 h-3.5 text-[#FCFDFC]" />
                )}
                <span>
                  {isLocked
                    ? `Terkunci & Disetujui (v${criteriaVersion})`
                    : isDirty
                    ? 'Setujui Perubahan'
                    : 'Setujui Kriteria'}
                </span>
              </button>
            </div>
          </div>

          {/* Category Pills Filter */}
          <div className="px-5 py-2 border-b border-[#E2E9E5] bg-[#F5F8F6] flex items-center space-x-1.5 shrink-0 overflow-x-auto">
            {[
              { id: 'ALL', label: 'Semua', count: requirements.length },
              { id: 'EXPERIENCE', label: 'Pengalaman', count: requirements.filter((r) => normalizeCategory(r.category) === 'EXPERIENCE').length },
              { id: 'HARD_SKILLS', label: 'Hard Skill', count: requirements.filter((r) => normalizeCategory(r.category) === 'HARD_SKILLS').length },
              { id: 'EDUCATION_CERT', label: 'Pendidikan', count: requirements.filter((r) => normalizeCategory(r.category) === 'EDUCATION_CERT').length },
              { id: 'ACHIEVEMENT', label: 'Pencapaian', count: requirements.filter((r) => normalizeCategory(r.category) === 'ACHIEVEMENT').length },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center space-x-1.5 active:scale-[0.98] ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-[#1B4938] text-[#FCFDFC] shadow-tactile-sm font-bold'
                    : 'text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE]'
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-0">
            {/* Form Tambah Kriteria Spesifik Secara Manual (Diletakkan di Atas r1) */}
            <div className="bg-[#F5F8F6] border border-[#D5DFD9] rounded-xl p-3.5 sm:p-4 shadow-tactile-sm transition-all mb-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsManualFormOpen((prev) => !prev)}
                  className="flex items-center space-x-2 text-xs font-bold text-[#13221C] hover:text-[#1B4938] transition-colors focus-visible:outline-none cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-md bg-[#EBF1EE] border border-[#D5DFD9] flex items-center justify-center text-[#1B4938]">
                    <Plus className={`w-3.5 h-3.5 transition-transform duration-200 ${isManualFormOpen ? 'rotate-45' : ''}`} />
                  </div>
                  <span>Tambah Kriteria Spesifik Secara Manual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualFormOpen((prev) => !prev)}
                  className="text-[11px] font-mono font-semibold text-[#2D4439] hover:text-[#13221C] cursor-pointer"
                >
                  {isManualFormOpen ? 'Lipat Form' : 'Buka Form'}
                </button>
              </div>

              {isManualFormOpen && (
                <form onSubmit={handleAddCriteria} className="mt-3 space-y-2.5">
                  <input
                    type="text"
                    placeholder="Deskripsi kriteria (e.g. Mahir Redis & Celery, Pengalaman 5+ thn Python)..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full text-xs bg-[#FCFDFC] border border-[#D5DFD9] focus:border-[#1B4938] px-3 py-2 rounded-xl focus:outline-none transition-all shadow-tactile-sm"
                  />

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <div className="flex-1 min-w-[140px]">
                      <CustomSelect
                        value={newCategory}
                        onChange={setNewCategory}
                        options={CATEGORY_OPTIONS}
                        size="sm"
                        ariaLabel="Kategori Kriteria"
                      />
                    </div>

                    <div className="w-auto min-w-[130px]">
                      <CustomSelect
                        value={newImportance}
                        onChange={setNewImportance}
                        options={IMPORTANCE_OPTIONS}
                        size="sm"
                        ariaLabel="Tingkat Kepentingan Kriteria"
                      />
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 bg-[#FCFDFC] px-2 h-8 rounded-lg border border-[#D5DFD9]">
                      <span className="text-[10px] font-mono text-[#2D4439]">Bobot:</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={newWeight}
                        onChange={(e) => setNewWeight(parseInt(e.target.value) || 5)}
                        className="w-10 text-center text-xs font-mono font-bold bg-transparent focus:outline-none"
                        title="Bobot (%)"
                      />
                      <span className="text-[11px] font-mono text-[#2D4439] font-bold">%</span>
                    </div>

                    <button
                      type="submit"
                      className="h-8 px-4 bg-[#1B4938] hover:bg-[#265B46] text-[#FCFDFC] text-xs font-bold rounded-lg shrink-0 transition-all cursor-pointer shadow-tactile-sm active:scale-[0.98]"
                    >
                      Tambah
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Empty state: belum ada kriteria sama sekali atau filter kategori kosong */}
            {requirements.length === 0 ? (
              <div className="text-center py-10 px-6 border-2 border-dashed border-[#D5DFD9] rounded-2xl bg-[#F5F8F6] flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#EBF1EE] border border-[#D5DFD9] flex items-center justify-center text-[#1B4938] shadow-tactile-sm">
                  <Layers className="w-6 h-6 text-[#1B4938]" />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="text-sm font-bold text-[#13221C]">Belum Ada Kriteria Lowongan</h3>
                  <p className="text-xs text-[#2D4439] leading-relaxed">
                    Belum ada kriteria lowongan. Silakan kembali ke Langkah 1 untuk Ekstraksi dari JD, atau klik &apos;Tambah Kriteria Manual&apos;.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onCompileFromJd}
                    disabled={isCompiling}
                    className="h-8 px-3.5 bg-[#1B4938] hover:bg-[#265B46] text-[#FCFDFC] text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-tactile-sm disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isCompiling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Ekstraksi dari JD</span>
                  </button>
                  {onBack && (
                    <button
                      type="button"
                      onClick={onBack}
                      className="h-8 px-3 bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[#13221C] text-xs font-semibold rounded-lg flex items-center space-x-1 transition-all cursor-pointer shadow-tactile-sm active:scale-[0.98]"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Kembali ke Langkah 1</span>
                    </button>
                  )}
                  {!isManualFormOpen && (
                    <button
                      type="button"
                      onClick={() => setIsManualFormOpen(true)}
                      className="h-8 px-3 bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[#13221C] text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-tactile-sm active:scale-[0.98]"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#1B4938]" />
                      <span>Tambah Kriteria Manual</span>
                    </button>
                  )}
                </div>
              </div>
            ) : filteredRequirements.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-[#D5DFD9] rounded-xl bg-[#F5F8F6]">
                <p className="text-xs text-[#2D4439] font-medium">
                  Belum ada kriteria untuk kategori ini. Tambahkan secara manual di atas atau pilih filter kategori lainnya.
                </p>
              </div>
            ) : null}

            {/* List Kriteria dengan Dua Dropdown Interaktif */}
            {filteredRequirements.map((r) => {
              return (
                <div
                  key={r.requirement_id}
                  className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl p-3.5 space-y-3 shadow-tactile-sm hover:border-[#1B4938]/40 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                      <span className="font-mono text-xs font-bold text-[#1B4938] bg-[#EBF1EE] px-2.5 h-8 rounded-lg border border-[#D5DFD9] flex items-center shrink-0">
                        {r.requirement_id}
                      </span>

                      {/* Dropdown Kategori Interaktif */}
                      <div className="w-48 sm:w-52 shrink-0">
                        <CustomSelect
                          value={normalizeCategory(r.category)}
                          onChange={(val) =>
                            handleUpdateRequirement(r.requirement_id, { category: val })
                          }
                          options={CATEGORY_OPTIONS}
                          size="sm"
                          ariaLabel={`Kategori untuk ${r.requirement_id}`}
                        />
                      </div>

                      {/* Dropdown Tingkat Interaktif */}
                      <div className="w-40 sm:w-44 shrink-0">
                        <CustomSelect
                          value={r.importance || 'MUST_HAVE'}
                          onChange={(val) =>
                            handleUpdateRequirement(r.requirement_id, { importance: val })
                          }
                          options={IMPORTANCE_OPTIONS}
                          size="sm"
                          ariaLabel={`Tingkat kepentingan untuk ${r.requirement_id}`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="flex items-center space-x-1.5 bg-[#F5F8F6] px-2 h-8 rounded-lg border border-[#D5DFD9]">
                        <span className="text-[10px] font-mono text-[#2D4439] font-medium">Bobot:</span>
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
                          className="w-10 px-1 py-0.5 text-center font-mono tabular-nums text-xs font-bold bg-[#FCFDFC] border border-[#D5DFD9] rounded focus:outline-none focus:border-[#1B4938]"
                        />
                        <span className="text-[10px] font-mono text-[#2D4439] font-bold">%</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCriteria(r.requirement_id)}
                        className="w-8 h-8 flex items-center justify-center text-[#2D4439] hover:text-[#8C1819] hover:bg-[#FCEBEB] rounded-lg border border-[#D5DFD9] hover:border-[#F6C1C1] bg-[#FCFDFC] transition-colors cursor-pointer shadow-tactile-sm"
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
                      <p className="text-[11px] text-[#2D4439] font-mono mt-1 italic">
                        Sumber: &quot;{r.source_text}&quot;
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Kolom Kanan (~40-42%): Live Impact Simulator & Policy Linter */}
        <div className="w-full lg:w-[42%] xl:w-[40%] bg-[#F5F8F6] flex flex-col h-full overflow-y-auto p-4 sm:p-5 space-y-4 min-h-0">
          {/* Policy Linter Card */}
          <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl p-4 shadow-tactile-sm space-y-3 shrink-0">
            <div className="flex items-center justify-between border-b border-[#E2E9E5] pb-2">
              <div className="flex items-center space-x-2">
                {prohibitedFlags.length > 0 ? (
                  <ShieldAlert className="w-4 h-4 text-[#8C1819]" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-[#124B2E]" />
                )}
                <h3 className="text-xs font-bold text-[#13221C] uppercase tracking-wider">
                  Policy Linter (Anti-Bias & Regulasi)
                </h3>
              </div>
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded-md font-bold ${
                  prohibitedFlags.length > 0
                    ? 'bg-[#FCEBEB] text-[#8C1819] border border-[#F6C1C1]'
                    : 'bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD]'
                }`}
              >
                {prohibitedFlags.length > 0 ? `${prohibitedFlags.length} Pelanggaran` : 'Lolos Audit'}
              </span>
            </div>

            {prohibitedFlags.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-[#8C1819] font-medium leading-relaxed">
                  Peringatan: Ditemukan kriteria yang berpotensi melanggar doktrin anti-bias.
                  Harap hapus atau ubah sebelum menyetujui kriteria:
                </p>
                <ul className="space-y-1">
                  {prohibitedFlags.map((flag, idx) => (
                    <li
                      key={idx}
                      className="p-2 rounded-lg bg-[#FCEBEB] text-[#8C1819] text-xs font-mono leading-relaxed flex items-start space-x-1.5"
                    >
                      <span>⚠️</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#EBF6EF] border border-[#BBE5CD] text-xs text-[#0E432B] space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0E432B]" />
                  <span>Seluruh Kriteria Bebas dari Bias Demografis</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#0E432B]/90">
                  Tidak ditemukan batasan diskriminatif usia, gender, maupun penampilan fisik.
                  Evaluasi 100% deterministik berbasis kompetensi.
                </p>
              </div>
            )}
          </section>

          {/* Live Impact Simulator: Distribusi Bobot Kategori */}
          <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl p-4 shadow-tactile-sm space-y-3 shrink-0">
            <div className="flex items-center justify-between border-b border-[#E2E9E5] pb-2">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#1B4938]" />
                <h3 className="text-xs font-bold text-[#13221C] uppercase tracking-wider">
                  Distribusi Bobot Kategori (Wajib 100%)
                </h3>
              </div>
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded-md font-bold tabular-nums ${
                  isWeightValid
                    ? 'bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD]'
                    : 'bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7]'
                }`}
              >
                Total: {totalCategoryWeight}%
              </span>
            </div>

            <div className="space-y-3">
              {[
                { key: 'EXPERIENCE', label: 'Pengalaman', code: 'EXPERIENCE', color: '#1B4938' },
                { key: 'HARD_SKILLS', label: 'Hard Skill', code: 'HARD_SKILLS', color: '#265B46' },
                { key: 'EDUCATION_CERT', label: 'Pendidikan', code: 'EDUCATION_CERT', color: '#7A3E02' },
                { key: 'ACHIEVEMENT', label: 'Pencapaian', code: 'ACHIEVEMENT', color: '#2D4439' },
              ].map((cat) => {
                const val = categoryWeights[cat.key] || 0
                return (
                  <div key={cat.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="font-semibold text-[#13221C] truncate">{cat.label}</span>
                        <span className="font-mono text-[10px] text-[#2D4439] bg-[#EBF1EE] px-1.5 py-0.5 rounded border border-[#D5DFD9] font-medium tracking-tight shrink-0 select-all">
                          {cat.code}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
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
                          className="w-12 px-1 py-0.5 text-center font-mono tabular-nums text-xs font-bold bg-[#F5F8F6] border border-[#D5DFD9] rounded-md focus:outline-none focus:border-[#1B4938] transition-colors"
                          aria-label={`Bobot persentase ${cat.label} (${cat.code})`}
                        />
                        <span className="font-mono text-[11px] text-[#2D4439] font-bold">%</span>
                      </div>
                    </div>
                    {/* Visual Bar */}
                    <div className="w-full h-2 bg-[#EBF1EE] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{ width: `${Math.min(100, val)}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {!isWeightValid && (
              <div className="p-2.5 rounded-xl bg-[#FEF6E8] border border-[#F8D8A7] text-[11px] text-[#7A3E02] flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#7A3E02]" />
                <span>
                  Jumlah persentase kategori saat ini <strong>{totalCategoryWeight}%</strong>. Sesuaikan
                  agar tepat 100%.
                </span>
              </div>
            )}
          </section>

          {/* Job Description Preview Card */}
          <section className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl p-4 shadow-tactile-sm space-y-3 shrink-0">
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
                <label className="block text-[10px] font-mono text-[#2D4439] uppercase font-bold mb-1">
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
                  <label className="block text-[10px] font-mono text-[#2D4439] uppercase font-bold mb-1">
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
                  <label className="block text-[10px] font-mono text-[#2D4439] uppercase font-bold mb-1">
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
                <label className="block text-[10px] font-mono text-[#2D4439] uppercase font-bold mb-1">
                  Teks Job Description (JD)
                </label>
                <textarea
                  rows={5}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#F5F8F6] focus:bg-[#FCFDFC] border border-[#D5DFD9] focus:border-[#1B4938] rounded-lg font-mono text-[11px] text-[#13221C] leading-relaxed focus:outline-none resize-none"
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Unapproved Warning Banner */}
      {showUnapprovedWarning && !isLocked && (
        <div className="px-4 sm:px-6 py-2.5 bg-[#FEF6E8] border-t border-[#F8D8A7] flex flex-wrap items-center justify-between gap-2 text-xs text-[#7A3E02] animate-in fade-in duration-150 shrink-0">
          <div className="flex items-center space-x-2 flex-1 min-w-[260px]">
            <AlertTriangle className="w-4 h-4 text-[#7A3E02] shrink-0" />
            <span>
              {requirements.length === 0 ? (
                <>
                  <strong>Kriteria Kosong:</strong> Belum ada kriteria lowongan untuk disetujui. Silakan lakukan <strong>Ekstraksi dari JD</strong> atau kembali ke Langkah 1.
                </>
              ) : (
                <>
                  <strong>Perhatian:</strong> Harap setujui kriteria terlebih dahulu sebelum lanjut ke tahap Unggah CV! Silakan klik tombol <strong>&ldquo;Setujui Kriteria&rdquo;</strong> di bilah atas.
                </>
              )}
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {requirements.length === 0 && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="h-7 px-2.5 bg-[#FCFDFC] hover:bg-[#FEF6E8] border border-[#F8D8A7] text-[#7A3E02] text-xs font-bold rounded flex items-center space-x-1 cursor-pointer transition-colors shadow-tactile-sm"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Kembali ke Langkah 1</span>
              </button>
            )}
            {requirements.length === 0 && (
              <button
                type="button"
                onClick={onCompileFromJd}
                disabled={isCompiling}
                className="h-7 px-2.5 bg-[#7A3E02] hover:bg-[#603001] text-[#FCFDFC] text-xs font-bold rounded flex items-center space-x-1 cursor-pointer transition-colors shadow-tactile-sm disabled:opacity-50"
              >
                {isCompiling ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>Ekstraksi JD</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowUnapprovedWarning(false)}
              className="text-xs font-bold text-[#7A3E02] hover:text-[#502901] px-2 py-1 rounded cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Footer Status Bar */}
      <footer className="px-4 sm:px-6 py-2.5 bg-[#FCFDFC] border-t border-[#D5DFD9] flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-[#2D4439] hover:text-[#13221C] transition-colors flex items-center space-x-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] rounded-lg px-2 py-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Setup Posisi</span>
        </button>

        <div className="hidden md:flex items-center space-x-3 text-xs font-mono">
          <span className="text-[#2D4439]">
            Total Bobot:{' '}
            <strong
              className={`tabular-nums ${
                isWeightValid
                  ? 'text-[#124B2E]'
                  : 'text-[#7A3E02] font-bold underline'
              }`}
            >
              {totalCategoryWeight}%
            </strong>
          </span>
          <span className="text-[#D5DFD9]">|</span>
          <span className="text-[#2D4439]">
            Kriteria: <strong className="text-[#13221C] tabular-nums">{requirements.length} item</strong>
          </span>
          <span className="text-[#D5DFD9]">|</span>
          <span className="text-[#2D4439]">
            Status:{' '}
            <strong className={isLocked ? 'text-[#124B2E]' : 'text-[#7A3E02]'}>
              {isLocked
                ? `Disetujui (v${criteriaVersion})`
                : isDirty
                ? 'Draf (Perubahan Belum Disetujui)'
                : 'Draf'}
            </strong>
          </span>
        </div>

        <button
          type="button"
          onClick={handleSaveAndContinue}
          title={
            !isLocked
              ? 'Harap setujui kriteria terlebih dahulu sebelum lanjut ke tahap Unggah CV'
              : 'Lanjut ke tahap Unggah Berkas CV'
          }
          className="h-8 px-4 bg-[#1B4938] hover:bg-[#265B46] text-[#FCFDFC] text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer shadow-tactile-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938]"
        >
          <span>Simpan & Lanjut ke Unggah CV</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </footer>
    </div>
  )
}
