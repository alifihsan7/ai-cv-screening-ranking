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
  ArrowRight,
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
  isRefreshing?: boolean
  onStartScreening: () => void
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

interface PipelineStepProps {
  status: NormalizedStatus
}

const PipelineTracker: React.FC<PipelineStepProps> = ({ status }) => {
  if (status === 'REJECTED') {
    return (
      <div className="flex items-center space-x-1 text-[10px] text-[#8C1819] font-medium font-mono">
        <XCircle className="w-3 h-3 text-[#8C1819] shrink-0" />
        <span>Ditolak</span>
      </div>
    )
  }
  if (status === 'DUPLICATE') {
    return (
      <div className="flex items-center space-x-1 text-[10px] text-[#2D4439] font-medium font-mono">
        <Copy className="w-3 h-3 text-[#2D4439] shrink-0" />
        <span>Duplikat</span>
      </div>
    )
  }
  if (status === 'NEEDS_REVIEW') {
    return (
      <div className="flex items-center space-x-1 text-[10px] text-[#7A3E02] font-medium font-mono">
        <AlertTriangle className="w-3 h-3 text-[#7A3E02] shrink-0" />
        <span>Perlu Cek</span>
      </div>
    )
  }

  const isProcessingActive = status === 'PROCESSING'
  const isReadyDone = status === 'READY'

  return (
    <div className="flex items-center space-x-1 text-[10px] font-mono select-none">
      <span
        title="Tahap 1: Diterima (Antrean)"
        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded ${
          isProcessingActive || isReadyDone
            ? 'bg-[#EBF6EF] text-[#124B2E] font-bold border border-[#BBE5CD]'
            : 'bg-[#EBF1EE] text-[#13221C] font-semibold border border-[#D5DFD9]'
        }`}
      >
        {isProcessingActive || isReadyDone ? '✓ Antrean' : '● Antrean'}
      </span>
      <span className="text-[#2D4439]/40">›</span>
      <span
        title="Tahap 2: Memproses Teks & Embedding"
        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded ${
          isReadyDone
            ? 'bg-[#EBF6EF] text-[#124B2E] font-bold border border-[#BBE5CD]'
            : isProcessingActive
            ? 'bg-[#FEF6E8] text-[#7A3E02] font-bold border border-[#F8D8A7] animate-pulse'
            : 'bg-[#F2F5F3] text-[#2D4439]/60 border border-[#D5DFD9]/60'
        }`}
      >
        {isReadyDone ? (
          '✓ Memproses'
        ) : isProcessingActive ? (
          <span className="flex items-center space-x-0.5">
            <Loader2 className="w-2.5 h-2.5 animate-spin mr-0.5" />
            <span>Memproses</span>
          </span>
        ) : (
          '○ Memproses'
        )}
      </span>
      <span className="text-[#2D4439]/40">›</span>
      <span
        title="Tahap 3: Siap (READY)"
        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded ${
          isReadyDone
            ? 'bg-[#EBF6EF] text-[#124B2E] font-bold border border-[#BBE5CD]'
            : 'bg-[#F2F5F3] text-[#2D4439]/60 border border-[#D5DFD9]/60'
        }`}
      >
        {isReadyDone ? '✓ Siap' : '○ Siap'}
      </span>
    </div>
  )
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
  isRefreshing = false,
  onStartScreening,
  onBack,
  onNext,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

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
    if (onStartScreening) {
      await onStartScreening()
    }
    onNext()
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F2F5F3]">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header Card */}
          <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-sm p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E9E5]">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#EBF6EF] border border-[#BBE5CD] flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5 text-[#1B4938]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[11px] font-bold text-[#124B2E] uppercase tracking-wider bg-[#EBF6EF] px-2 py-0.5 rounded border border-[#BBE5CD]">
                      Tahap 3 dari 4
                    </span>
                    <h1 className="text-lg sm:text-xl font-bold text-[#13221C] tracking-tight">
                      Unggah Berkas CV & Pipeline Ingestion
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-[#2D4439] mt-1">
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
                    className="h-8 px-3 text-xs text-[#13221C] hover:bg-[#EBF1EE] bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg font-semibold transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938]"
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
                    className="h-8 px-3 text-xs text-[#8C1819] hover:bg-[#FCEBEB] bg-[#FCFDFC] border border-[#F6C1C1] rounded-lg font-bold transition-colors flex items-center space-x-1.5 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1819]"
                    title="Hapus semua berkas CV yang diunggah"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan Berkas</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onLoadGoldenSample}
                  className="h-8 px-3 text-xs text-[#124B2E] hover:bg-[#DEF0E4] bg-[#EBF6EF] border border-[#BBE5CD] rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#124B2E]" />
                  <span>🧪 Muat 15 Sampel Golden Dataset</span>
                </button>
              </div>
            </div>

            {/* Non-blocking Drag & Drop Zone */}
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
              className={`mt-6 border-2 border-dashed rounded-2xl p-7 sm:p-9 text-center transition-all duration-150 cursor-pointer ${
                isDragging
                  ? 'border-[#1B4938] bg-[#EBF6EF] scale-[1.01]'
                  : 'border-[#D5DFD9] bg-[#F5F8F6] hover:bg-[#EBF1EE]/60 hover:border-[#1B4938]/40'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-[#EBF6EF] border border-[#BBE5CD] flex items-center justify-center mx-auto mb-3">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-[#1B4938] animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-[#1B4938]" />
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#13221C]">
                {isUploading
                  ? uploadStatusMsg || 'Mengunggah dan mendaftarkan berkas CV...'
                  : 'Tarik & letakkan berkas CV ke sini, atau klik untuk memilih file'}
              </h3>
              <p className="text-xs text-[#2D4439] mt-1 font-medium">
                Pilih satu atau banyak berkas secara bersamaan tanpa mengunci halaman.
              </p>

              {/* Supported format badges */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#FCFDFC] border border-[#D5DFD9] text-[#13221C]">
                  <FileText className="w-3 h-3 text-[#1B4938]" />
                  <span>PDF (.pdf)</span>
                </span>
                <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#FCFDFC] border border-[#D5DFD9] text-[#13221C]">
                  <FileText className="w-3 h-3 text-[#1B4938]" />
                  <span>DOCX (.docx)</span>
                </span>
                <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#FCFDFC] border border-[#D5DFD9] text-[#13221C]">
                  <Archive className="w-3 h-3 text-[#1B4938]" />
                  <span>ZIP (.zip arsip batch)</span>
                </span>
              </div>

              {/* Status summary pill */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] bg-[#FCFDFC] border border-[#D5DFD9] px-2.5 py-1 rounded-md text-[#2D4439] font-mono font-semibold">
                  {totalCount > 0 ? `${totalCount} Berkas Terdaftar` : 'Belum ada berkas dipilih'}
                </span>
                <span className="text-[11px] bg-[#EBF6EF] border border-[#BBE5CD] px-2.5 py-1 rounded-md text-[#124B2E] font-mono font-bold">
                  {readyFiles.length} CV Siap Evaluasi
                </span>
                {processingFiles.length > 0 && (
                  <span className="text-[11px] bg-[#FEF6E8] border border-[#F8D8A7] px-2.5 py-1 rounded-md text-[#7A3E02] font-mono font-bold animate-pulse">
                    {processingFiles.length} Memproses Teks & Embedding
                  </span>
                )}
                {receivedFiles.length > 0 && (
                  <span className="text-[11px] bg-[#EBF1EE] border border-[#D5DFD9] px-2.5 py-1 rounded-md text-[#13221C] font-mono font-bold">
                    {receivedFiles.length} Dalam Antrean
                  </span>
                )}
              </div>
            </div>

            {/* Ingestion Progress Bar & Structured Progression Legend */}
            <div className="mt-6 bg-[#F5F8F6] border border-[#D5DFD9] rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 mb-2 font-medium">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#13221C]">Kemajuan Pipeline Ingestion:</span>
                  <strong className="font-mono tabular-nums text-[#1B4938]">
                    {processedCount}/{totalCount} Berkas Selesai
                  </strong>
                  {(processingFiles.length > 0 || receivedFiles.length > 0) && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#7A3E02] bg-[#FEF6E8] px-2 py-0.5 rounded border border-[#F8D8A7] font-semibold">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>
                        {receivedFiles.length > 0 ? `${receivedFiles.length} antre, ` : ''}
                        {processingFiles.length} aktif
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-xs font-mono">
                  <span className="text-[#124B2E] font-bold tabular-nums">
                    {totalCount > 0 ? `${progressPct}% Siap` : 'Menunggu Berkas'}
                  </span>
                </div>
              </div>
              <div className="w-full bg-[#EBF1EE] rounded-full h-2.5 overflow-hidden border border-[#D5DFD9]">
                <div
                  className="bg-[#1B4938] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Structured pipeline flow legend */}
              <div className="mt-3 pt-3 border-t border-[#E2E9E5] flex flex-col md:flex-row md:items-center justify-between gap-2 text-[11px] text-[#2D4439]">
                <div className="flex flex-wrap items-center gap-1.5 font-medium">
                  <span className="font-bold text-[#13221C]">Alur Terstruktur:</span>
                  <span className="inline-flex items-center gap-1 bg-[#EBF1EE] text-[#13221C] px-2 py-0.5 rounded border border-[#D5DFD9] font-mono text-[10px] font-semibold">
                    <Clock className="w-2.5 h-2.5 text-[#13221C]" />
                    <span>Diterima (Antrean)</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-[#2D4439]/60 shrink-0" />
                  <span className="inline-flex items-center gap-1 bg-[#FEF6E8] text-[#7A3E02] px-2 py-0.5 rounded border border-[#F8D8A7] font-mono text-[10px] font-semibold">
                    <Loader2 className="w-2.5 h-2.5 text-[#7A3E02] animate-spin" />
                    <span>Memproses Teks & Embedding</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-[#2D4439]/60 shrink-0" />
                  <span className="inline-flex items-center gap-1 bg-[#EBF6EF] text-[#124B2E] px-2 py-0.5 rounded border border-[#BBE5CD] font-mono text-[10px] font-bold">
                    <CheckCircle2 className="w-2.5 h-2.5 text-[#124B2E]" />
                    <span>Siap (READY)</span>
                  </span>
                </div>
                <div className="font-mono text-[10px] text-[#2D4439]">
                  {readyFiles.length} Siap • {receivedFiles.length} Antrean • {processingFiles.length} Proses • {rejectedFiles.length} Ditolak
                </div>
              </div>
            </div>

            {/* Filter Pills & Search Bar */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-[#E2E9E5]">
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
                    className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center space-x-1 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] ${
                      statusFilter === item.id
                        ? 'bg-[#1B4938] text-[#FCFDFC] font-bold'
                        : 'bg-[#FCFDFC] border border-[#D5DFD9] text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="font-mono text-[10px] tabular-nums opacity-85">
                      ({item.count})
                    </span>
                  </button>
                ))}
              </div>

              {/* Search box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#2D4439] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama berkas..."
                  className="h-8 pl-8 pr-3 bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg text-xs text-[#13221C] placeholder-[#2D4439]/60 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none w-full sm:w-48 font-medium transition-all"
                />
              </div>
            </div>

            {/* Files List Table */}
            <div className="mt-4 border border-[#D5DFD9] rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-[#EBF1EE] text-[#2D4439] font-bold uppercase tracking-wider border-b border-[#D5DFD9]">
                  <tr>
                    <th className="py-2.5 px-3">Nama Berkas</th>
                    <th className="py-2.5 px-3 w-28">Ukuran</th>
                    <th className="py-2.5 px-3 w-64">Status & Alur Pipeline</th>
                    <th className="py-2.5 px-3">Catatan / Detail Ingestion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9E5] bg-[#FCFDFC]">
                  {filteredFiles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-[#2D4439]">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-[#2D4439]/40" />
                        <p className="font-bold text-[#13221C]">
                          {uploadedFiles.length === 0
                            ? 'Belum ada berkas CV yang diunggah'
                            : 'Tidak ada berkas yang sesuai dengan filter'}
                        </p>
                        <p className="text-[11px] text-[#2D4439] mt-0.5">
                          Tarik berkas PDF, DOCX, atau ZIP ke kotak di atas atau klik tombol Muat Golden Dataset.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredFiles.map((file, idx) => {
                      const normStatus = normalizeStatus(file.status)
                      const IconComponent = getFileIcon(file.name)

                      let badgeClass = 'bg-[#EBF1EE] text-[#13221C] border border-[#D5DFD9]'
                      let statusLabel = 'Diterima (Antrean)'
                      let StatusIcon = Clock

                      if (normStatus === 'READY') {
                        badgeClass = 'bg-[#EBF6EF] text-[#124B2E] border border-[#BBE5CD] font-bold'
                        statusLabel = 'Siap (READY)'
                        StatusIcon = CheckCircle2
                      } else if (normStatus === 'PROCESSING') {
                        badgeClass =
                          'bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7] font-bold animate-pulse'
                        statusLabel = 'Memproses Teks & Embedding'
                        StatusIcon = Loader2
                      } else if (normStatus === 'RECEIVED') {
                        badgeClass = 'bg-[#EBF1EE] text-[#13221C] border border-[#D5DFD9] font-semibold'
                        statusLabel = 'Diterima (Antrean)'
                        StatusIcon = Clock
                      } else if (normStatus === 'REJECTED') {
                        badgeClass = 'bg-[#FCEBEB] text-[#8C1819] border border-[#F6C1C1] font-bold'
                        statusLabel = 'Ditolak'
                        StatusIcon = XCircle
                      } else if (normStatus === 'DUPLICATE') {
                        badgeClass = 'bg-[#EBF1EE] text-[#2D4439] border border-[#D5DFD9] font-medium'
                        statusLabel = 'Duplikat'
                        StatusIcon = Copy
                      } else if (normStatus === 'NEEDS_REVIEW') {
                        badgeClass = 'bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7] font-bold'
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
                        <tr key={file.id || idx} className="hover:bg-[#EBF1EE]/50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-[#13221C]">
                            <div className="flex items-center space-x-2">
                              <IconComponent className="w-4 h-4 shrink-0 text-[#1B4938]" />
                              <span className="truncate max-w-xs sm:max-w-sm" title={file.name}>
                                {file.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-[#2D4439] font-mono tabular-nums text-[11px]">
                            {file.size}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="space-y-1.5">
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
                              <PipelineTracker status={normStatus} />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-[#2D4439] text-[11px] font-mono">
                            <div className="flex items-center space-x-1.5">
                              <span className="truncate max-w-xs sm:max-w-md">{noteText}</span>
                              {file.flags && file.flags.length > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] bg-[#FEF6E8] text-[#7A3E02] border border-[#F8D8A7] shrink-0 font-sans">
                                  {file.flags.length} flag
                                </span>
                              )}
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
            Berkas Terdaftar: <strong className="text-[#13221C] tabular-nums">{totalCount} file</strong>
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
                Memproses: <strong className="tabular-nums">{processingFiles.length} berkas</strong>
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleLaunchScreening}
          disabled={isScreening || (readyFiles.length === 0 && totalCount === 0)}
          className="h-9 px-5 bg-[#1B4938] hover:bg-[#265B46] text-[#FCFDFC] text-xs font-bold rounded-lg transition-all flex items-center space-x-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938]"
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
  )
}
