import React, { useState, useRef } from 'react'
import {
  Upload,
  FileText,
  RotateCcw,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Clock,
  Archive,
  Copy,
  Activity,
  Layers,
} from 'lucide-react'
import type { UploadedCvFile } from '../types'

export interface UploadStepProps {
  uploadedFiles: UploadedCvFile[]
  isUploading: boolean
  uploadStatusMsg: string
  isScreening: boolean
  onUploadFiles: (files: FileList | File[]) => void
  onLoadGoldenSample: () => void
  onClearFiles?: () => void
  onRefreshStatus?: () => void
  onRefreshFile?: (file: UploadedCvFile) => void
  onRemoveFile?: (fileName: string) => void
  isRefreshing?: boolean
  onStartScreening?: () => void | Promise<void>
  onBack: () => void
  onNext: () => void
}

type NormalizedStatus =
  | 'RECEIVED'
  | 'PROCESSING'
  | 'READY'
  | 'REJECTED'
  | 'DUPLICATE'
  | 'NEEDS_REVIEW'

function normalizeStatus(st: string): NormalizedStatus {
  const s = (st || '').toUpperCase()
  if (s === 'READY') return 'READY'
  if (s === 'PROCESSING') return 'PROCESSING'
  if (s === 'RECEIVED') return 'RECEIVED'
  if (s === 'REJECTED' || s === 'UNQUALIFIED') return 'REJECTED'
  if (s === 'DUPLICATE') return 'DUPLICATE'
  if (s === 'NEEDS_REVIEW' || s === 'REVIEW') return 'NEEDS_REVIEW'
  return 'RECEIVED'
}

function getFileIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.zip')) {
    return Archive
  }
  return FileText
}

export const UploadStep: React.FC<UploadStepProps> = ({
  uploadedFiles,
  isUploading,
  uploadStatusMsg,
  isScreening,
  onUploadFiles,
  onLoadGoldenSample,
  onClearFiles,
  onRefreshStatus,
  onRefreshFile,
  onRemoveFile,
  isRefreshing = false,
  onStartScreening,
  onBack,
  onNext,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [refreshingFiles, setRefreshingFiles] = useState<Record<string, boolean>>({})

  const handleRefreshFile = async (file: UploadedCvFile) => {
    const fileKey = file.id || file.name
    setRefreshingFiles((prev) => ({ ...prev, [fileKey]: true }))
    try {
      if (onRefreshFile) {
        await onRefreshFile(file)
      } else if (onRefreshStatus) {
        await onRefreshStatus()
      }
    } finally {
      setTimeout(() => {
        setRefreshingFiles((prev) => {
          const next = { ...prev }
          delete next[fileKey]
          return next
        })
      }, 500)
    }
  }

  const readyFiles = uploadedFiles.filter((f) => normalizeStatus(f.status) === 'READY')
  const processingFiles = uploadedFiles.filter((f) => normalizeStatus(f.status) === 'PROCESSING')
  const receivedFiles = uploadedFiles.filter((f) => normalizeStatus(f.status) === 'RECEIVED')
  const rejectedFiles = uploadedFiles.filter((f) => normalizeStatus(f.status) === 'REJECTED')
  const duplicateFiles = uploadedFiles.filter((f) => normalizeStatus(f.status) === 'DUPLICATE')
  const reviewFiles = uploadedFiles.filter((f) => normalizeStatus(f.status) === 'NEEDS_REVIEW')

  const totalCount = uploadedFiles.length
  const processedCount =
    readyFiles.length + rejectedFiles.length + duplicateFiles.length + reviewFiles.length
  const progressPct = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0

  const filteredFiles = uploadedFiles.filter((file) => {
    if (statusFilter !== 'ALL' && normalizeStatus(file.status) !== statusFilter) return false
    if (searchQuery.trim() && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files)
      e.target.value = ''
    }
  }

  const handleLaunchScreening = async () => {
    if (isScreening) return
    if (onStartScreening) {
      try {
        await onStartScreening()
      } catch (err) {
        console.error('Screening failed to launch:', err)
      }
    } else {
      onNext()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F2F5F3]">
      {/* Centered Widescreen Studio Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 w-full flex-1 flex flex-col min-h-0">
        {/* Unified Studio Card */}
        <div className="flex-1 w-full bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile-sm overflow-hidden flex flex-col h-full min-h-0">
          {/* Header Card Banner */}
          <div className="p-4 sm:p-5 border-b border-[#E2E9E5] bg-[#FCFDFC] shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#EBF6EF] border border-[#BBE5CD] flex items-center justify-center shrink-0 shadow-tactile-sm">
                  <Upload className="w-5 h-5 text-[#1B4938]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[11px] font-bold text-[#124B2E] uppercase tracking-wider bg-[#EBF6EF] px-2 py-0.5 rounded border border-[#BBE5CD]">
                      Tahap 3 dari 4
                    </span>
                    <h1 className="text-base sm:text-lg font-bold text-[#13221C] tracking-tight">
                      Unggah Berkas CV & Pipeline Ingestion
                    </h1>
                  </div>
                  <p className="text-xs text-[#2D4439] mt-0.5">
                    Unggah resume kandidat dalam format PDF, DOCX, atau arsip batch ZIP. Sistem memproses secara non-blocking dengan deteksi duplikasi hash dan sanitasi teks.
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {onRefreshStatus && (
                  <button
                    type="button"
                    onClick={onRefreshStatus}
                    disabled={isRefreshing}
                    className="h-8 px-3 text-xs text-[#13221C] hover:bg-[#EBF1EE] bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg font-semibold transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] shadow-tactile-sm"
                    title="Segarkan status berkas dari server"
                  >
                    <RotateCcw
                      className={`w-3.5 h-3.5 ${
                        isRefreshing ? 'animate-spin text-[#1B4938]' : 'text-[#2D4439]'
                      }`}
                    />
                    <span className="hidden sm:inline">Perbarui Status</span>
                  </button>
                )}

                {uploadedFiles.length > 0 && onClearFiles && (
                  <button
                    type="button"
                    onClick={onClearFiles}
                    className="h-8 px-3 text-xs text-[#8C1819] hover:bg-[#FCEBEB] bg-[#FCFDFC] border border-[#F6C1C1] rounded-lg font-bold transition-colors flex items-center space-x-1.5 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1819] shadow-tactile-sm"
                    title="Hapus semua berkas CV yang diunggah"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan Berkas</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onLoadGoldenSample}
                  className="h-8 px-3 text-xs text-[#124B2E] hover:bg-[#DEF0E4] bg-[#EBF6EF] border border-[#BBE5CD] rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] shadow-tactile-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#124B2E]" />
                  <span>🧪 Muat 15 Sampel Golden Dataset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Side-by-Side Ingestion Studio (40% : 60%) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            {/* Left Column (40% - Dropzone & Pipeline Telemetry) */}
            <div className="w-full lg:w-[40%] xl:w-[38%] border-b lg:border-b-0 lg:border-r border-[#D5DFD9] flex flex-col overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#FCFDFC]">
              {/* Compact Dropzone */}
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".pdf,.docx,.zip,.doc"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all duration-150 cursor-pointer ${
                  isDragging
                    ? 'border-[#1B4938] bg-[#EBF6EF] scale-[1.01]'
                    : 'border-[#D5DFD9] bg-[#F5F8F6] hover:bg-[#EBF1EE]/60 hover:border-[#1B4938]/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#EBF6EF] border border-[#BBE5CD] flex items-center justify-center mx-auto mb-2.5 shadow-tactile-sm">
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 text-[#1B4938] animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-[#1B4938]" />
                  )}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#13221C]">
                  {isUploading
                    ? uploadStatusMsg || 'Mengunggah dan mendaftarkan berkas CV...'
                    : 'Tarik & letakkan berkas CV ke sini, atau klik untuk memilih file'}
                </h3>
                <p className="text-[11px] text-[#2D4439] mt-1 font-medium">
                  Pilih satu atau banyak berkas secara bersamaan tanpa mengunci antarmuka.
                </p>

                {/* Supported format badges */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                  <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FCFDFC] border border-[#D5DFD9] text-[#13221C]">
                    <FileText className="w-2.5 h-2.5 text-[#1B4938]" />
                    <span>PDF (.pdf)</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FCFDFC] border border-[#D5DFD9] text-[#13221C]">
                    <FileText className="w-2.5 h-2.5 text-[#1B4938]" />
                    <span>DOCX (.docx)</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FCFDFC] border border-[#D5DFD9] text-[#13221C]">
                    <Archive className="w-2.5 h-2.5 text-[#1B4938]" />
                    <span>ZIP (.zip arsip batch)</span>
                  </span>
                </div>
              </div>

              {/* Ingestion Pipeline Telemetry Card */}
              <div className="bg-[#F5F8F6] border border-[#D5DFD9] rounded-xl p-4 space-y-3.5 shadow-tactile-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#13221C] flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#1B4938]" />
                    <span>Telemetri Pipeline Ingestion</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-[#124B2E]">
                    {progressPct}% Siap
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#EBF1EE] rounded-full h-2 overflow-hidden border border-[#D5DFD9]">
                  <div
                    className="bg-[#1B4938] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Metric Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#FCFDFC] p-2 rounded-lg border border-[#D5DFD9]">
                    <span className="text-[10px] text-[#2D4439] block font-medium">Total Berkas</span>
                    <span className="font-mono font-bold text-sm text-[#13221C] tabular-nums">
                      {totalCount}
                    </span>
                  </div>
                  <div className="bg-[#FCFDFC] p-2 rounded-lg border border-[#D5DFD9]">
                    <span className="text-[10px] text-[#2D4439] block font-medium">Siap Dievaluasi</span>
                    <span className="font-mono font-bold text-sm text-[#124B2E] tabular-nums">
                      {readyFiles.length}
                    </span>
                  </div>
                  <div className="bg-[#FCFDFC] p-2 rounded-lg border border-[#D5DFD9]">
                    <span className="text-[10px] text-[#2D4439] block font-medium">Memproses Teks</span>
                    <span className="font-mono font-bold text-sm text-[#7A3E02] tabular-nums">
                      {processingFiles.length}
                    </span>
                  </div>
                  <div className="bg-[#FCFDFC] p-2 rounded-lg border border-[#D5DFD9]">
                    <span className="text-[10px] text-[#2D4439] block font-medium">Antrean / Ditolak</span>
                    <span className="font-mono font-bold text-sm text-[#2D4439] tabular-nums">
                      {receivedFiles.length + rejectedFiles.length}
                    </span>
                  </div>
                </div>

                {/* Pipeline Progression Flow Legend */}
                <div className="pt-2 border-t border-[#E2E9E5] space-y-1.5 text-[11px] text-[#2D4439]">
                  <span className="font-bold text-[#13221C] text-[10px] uppercase tracking-wider font-mono block">
                    Status:
                  </span>
                  <div className="flex flex-col gap-1.5 font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center gap-1 bg-[#EBF1EE] text-[#13221C] px-2 py-0.5 rounded border border-[#D5DFD9] font-mono text-[10px] font-semibold shrink-0">
                        <Clock className="w-2.5 h-2.5 text-[#13221C]" />
                        <span>Diterima (Antrean)</span>
                      </span>
                      <span className="text-[10px] text-[#2D4439]/80 truncate">
                        {receivedFiles.length} berkas dalam antrean worker
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center gap-1 bg-[#FEF6E8] text-[#7A3E02] px-2 py-0.5 rounded border border-[#F8D8A7] font-mono text-[10px] font-semibold shrink-0">
                        <Loader2 className="w-2.5 h-2.5 text-[#7A3E02] animate-spin" />
                        <span>Memproses Teks & Embedding</span>
                      </span>
                      <span className="text-[10px] text-[#2D4439]/80 truncate">
                        {processingFiles.length} berkas aktif diurai
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center gap-1 bg-[#EBF6EF] text-[#124B2E] px-2 py-0.5 rounded border border-[#BBE5CD] font-mono text-[10px] font-bold shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5 text-[#124B2E]" />
                        <span>Siap (READY)</span>
                      </span>
                      <span className="text-[10px] text-[#2D4439]/80 truncate">
                        {readyFiles.length} CV terindeks & siap skrining
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (60% - Roster Table & Direct Screening Launch) */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#FCFDFC]">
              {/* Prominent Action Banner */}
              <div className="p-3.5 sm:p-4 bg-[#F5F8F6] border-b border-[#D5DFD9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      readyFiles.length > 0
                        ? 'bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD]'
                        : 'bg-[#EBF1EE] text-[#2D4439] border border-[#D5DFD9]'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-[#13221C]">
                      {readyFiles.length > 0
                        ? `${readyFiles.length} Berkas CV Siap Dievaluasi!`
                        : 'Menunggu Berkas CV Terproses'}
                    </h2>
                    <p className="text-[11px] text-[#2D4439]">
                      {readyFiles.length > 0
                        ? 'Klik tombol di samping untuk memulai evaluasi deterministik AI ke Step 4 Workbench.'
                        : 'Unggah CV atau muat 15 sampel golden dataset pada panel kiri.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLaunchScreening}
                  disabled={isScreening || readyFiles.length === 0}
                  className="h-9 px-4 bg-[#1B4938] hover:bg-[#265B46] text-[#FCFDFC] text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] shadow-tactile-sm shrink-0"
                >
                  {isScreening ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BBE5CD]" />
                      <span>Mengevaluasi...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#BBE5CD]" />
                      <span>Buka Workbench ({readyFiles.length} Siap)</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {/* Filter Pills & Search Bar */}
              <div className="px-4 py-3 border-b border-[#E2E9E5] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 bg-[#FCFDFC]">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'ALL', label: 'Semua', count: totalCount },
                    { id: 'READY', label: 'Siap', count: readyFiles.length },
                    { id: 'PROCESSING', label: 'Memproses', count: processingFiles.length },
                    { id: 'RECEIVED', label: 'Antrean', count: receivedFiles.length },
                    { id: 'REJECTED', label: 'Ditolak', count: rejectedFiles.length },
                    { id: 'NEEDS_REVIEW', label: 'Perlu Cek', count: reviewFiles.length },
                    { id: 'DUPLICATE', label: 'Duplikat', count: duplicateFiles.length },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStatusFilter(item.id)}
                      className={`h-6 px-2 rounded-md text-[11px] font-semibold transition-all duration-150 cursor-pointer flex items-center space-x-1 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] ${
                        statusFilter === item.id
                          ? 'bg-[#1B4938] text-[#FCFDFC] font-bold'
                          : 'bg-[#FCFDFC] border border-[#D5DFD9] text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE]'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="font-mono text-[9px] tabular-nums opacity-85">
                        ({item.count})
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search box */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#2D4439] absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama berkas..."
                    className="h-7 pl-7 pr-3 bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg text-xs text-[#13221C] placeholder-[#2D4439]/60 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none w-full sm:w-44 font-medium transition-all"
                  />
                </div>
              </div>

              {/* Scrollable Files List Table */}
              <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-[#EBF1EE] text-[#2D4439] font-bold uppercase tracking-wider border-b border-[#D5DFD9] sticky top-0 z-10 shadow-tactile-sm">
                    <tr>
                      <th className="py-2.5 px-3">Nama Berkas</th>
                      <th className="py-2.5 px-3 w-24">Ukuran</th>
                      <th className="py-2.5 px-3 w-48">Status</th>
                      <th className="py-2.5 px-3">Catatan / Detail Ingestion</th>
                      <th className="py-2.5 px-3 w-20 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E9E5] bg-[#FCFDFC]">
                    {filteredFiles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-[#2D4439]">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-[#2D4439]/40" />
                          <p className="font-bold text-[#13221C]">
                            {uploadedFiles.length === 0
                              ? 'Belum ada berkas CV yang diunggah'
                              : 'Tidak ada berkas yang sesuai dengan filter'}
                          </p>
                          <p className="text-[11px] text-[#2D4439] mt-0.5">
                            Tarik berkas PDF, DOCX, atau ZIP pada panel kiri atau klik tombol Muat Golden Dataset.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredFiles.map((file, idx) => {
                        const normStatus = normalizeStatus(file.status)
                        const IconComponent = getFileIcon(file.name)
                        const isFileProcessing = normStatus === 'PROCESSING'
                        const isRowRefreshing =
                          isRefreshing ||
                          isFileProcessing ||
                          !!refreshingFiles[file.id || file.name]

                        let badgeClass = 'bg-[#EBF1EE] text-[#13221C] border border-[#D5DFD9]'
                        let statusLabel = 'Diterima (Antrean)'
                        let StatusIcon = Clock

                        if (normStatus === 'READY') {
                          badgeClass =
                            'bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD] font-bold'
                          statusLabel = 'Siap (READY)'
                          StatusIcon = CheckCircle2
                        } else if (normStatus === 'PROCESSING') {
                          badgeClass =
                            'bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7] font-bold animate-pulse'
                          statusLabel = 'Memproses Teks & Embedding'
                          StatusIcon = Loader2
                        } else if (normStatus === 'RECEIVED') {
                          badgeClass =
                            'bg-[#EBF1EE] text-[#13221C] border border-[#D5DFD9] font-semibold'
                          statusLabel = 'Diterima (Antrean)'
                          StatusIcon = Clock
                        } else if (normStatus === 'REJECTED') {
                          badgeClass =
                            'bg-[#FCEBEB] text-[#8C1819] border border-[#F6C1C1] font-bold'
                          statusLabel = 'Ditolak'
                          StatusIcon = XCircle
                        } else if (normStatus === 'DUPLICATE') {
                          badgeClass =
                            'bg-[#EBF1EE] text-[#2D4439] border border-[#D5DFD9] font-medium'
                          statusLabel = 'Duplikat'
                          StatusIcon = Copy
                        } else if (normStatus === 'NEEDS_REVIEW') {
                          badgeClass =
                            'bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7] font-bold'
                          statusLabel = 'Perlu Cek'
                          StatusIcon = AlertTriangle
                        }

                        // Sanitized notes detail
                        let noteText = file.reason
                        if (!noteText) {
                          if (normStatus === 'READY') {
                            noteText = 'Ekstraksi teks, chunking, & embedding selesai'
                          } else if (normStatus === 'PROCESSING') {
                            noteText = 'Mengekstrak teks & pembuatan embedding...'
                          } else if (normStatus === 'RECEIVED') {
                            noteText = 'Diterima di antrean, menunggu giliran worker...'
                          } else if (normStatus === 'REJECTED') {
                            noteText = 'Gagal parsing format atau berkas ditolak'
                          } else if (normStatus === 'DUPLICATE') {
                            noteText = file.duplicate_of
                              ? `Identik dengan ${file.duplicate_of}`
                              : 'Dokumen SHA-256 sama telah terdaftar'
                          } else if (normStatus === 'NEEDS_REVIEW') {
                            noteText = 'Kualitas teks memerlukan verifikasi manual'
                          }
                        }

                        return (
                          <tr
                            key={file.id || idx}
                            className="hover:bg-[#EBF1EE]/50 transition-colors"
                          >
                            <td className="py-2 px-3 font-semibold text-[#13221C]">
                              <div className="flex items-center space-x-2">
                                <IconComponent className="w-3.5 h-3.5 shrink-0 text-[#1B4938]" />
                                <span className="truncate max-w-xs sm:max-w-sm" title={file.name}>
                                  {file.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-[#2D4439] font-mono tabular-nums text-[11px]">
                              {file.size}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] inline-flex items-center space-x-1 ${badgeClass}`}
                              >
                                <StatusIcon
                                  className={`w-3 h-3 shrink-0 ${
                                    normStatus === 'PROCESSING' ? 'animate-spin' : ''
                                  }`}
                                />
                                <span>{statusLabel}</span>
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[#2D4439] text-[11px] font-mono">
                              <div className="flex items-center space-x-1.5">
                                <span className="truncate max-w-xs sm:max-w-md" title={noteText}>
                                  {noteText}
                                </span>
                                {file.flags && file.flags.length > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7] shrink-0 font-sans">
                                    {file.flags.length} flag
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleRefreshFile(file)}
                                  disabled={isRowRefreshing}
                                  className={`p-1 rounded-lg border transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] disabled:cursor-not-allowed ${
                                    isRowRefreshing
                                      ? 'bg-[#EBF1EE] text-[#1B4938] border-[#BBE5CD]'
                                      : 'bg-[#FCFDFC] hover:bg-[#EBF1EE] text-[#2D4439] hover:text-[#13221C] border-[#D5DFD9]'
                                  }`}
                                  title="Segarkan status berkas"
                                  aria-label={`Segarkan status berkas ${file.name}`}
                                >
                                  <RotateCcw
                                    className={`w-3 h-3 ${
                                      isRowRefreshing ? 'animate-spin text-[#1B4938]' : ''
                                    }`}
                                  />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRemoveFile?.(file.name || file.id || '')}
                                  className="p-1 rounded-lg border border-[#D5DFD9] bg-[#FCFDFC] text-[#2D4439] hover:text-[#8C1819] hover:bg-[#FCEBEB] hover:border-[#F6C1C1] transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1819]"
                                  title="Hapus dari daftar"
                                  aria-label={`Hapus ${file.name} dari daftar`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Workflow Navigation Footer */}
          <footer className="h-14 border-t border-[#D5DFD9] bg-[#FCFDFC] px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
            <button
              type="button"
              onClick={onBack}
              className="h-9 px-3.5 text-xs font-semibold text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-[#D5DFD9] rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali ke Kriteria</span>
            </button>

            <div className="hidden sm:flex items-center space-x-3 text-xs font-mono">
              <span className="text-[#2D4439]">
                Berkas Terdaftar:{' '}
                <strong className="text-[#13221C] tabular-nums">{totalCount} file</strong>
              </span>
              <span className="text-[#D5DFD9]">|</span>
              <span className="text-[#2D4439]">
                Siap Dinilai:{' '}
                <strong className="text-[#124B2E] tabular-nums">{readyFiles.length} berkas</strong>
              </span>
              {processingFiles.length > 0 && (
                <>
                  <span className="text-[#D5DFD9]">|</span>
                  <span className="text-[#7A3E02] animate-pulse">
                    Memproses:{' '}
                    <strong className="tabular-nums">{processingFiles.length} berkas</strong>
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleLaunchScreening}
              disabled={isScreening || (readyFiles.length === 0 && totalCount === 0)}
              className="h-9 px-5 bg-[#1B4938] hover:bg-[#265B46] text-[#FCFDFC] text-xs font-bold rounded-lg transition-all flex items-center space-x-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] shadow-tactile-sm"
            >
              {isScreening ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#BBE5CD]" />
                  <span>Mengevaluasi & Scoring...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#BBE5CD]" />
                  <span>
                    Mulai Skrining AI & Buka Workbench{' '}
                    {readyFiles.length > 0 ? `(${readyFiles.length} CV Siap)` : ''}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}
