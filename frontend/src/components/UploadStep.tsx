import React, { useState, useRef } from 'react'
import {
  Upload,
  FileText,
  FileCheck,
  RotateCcw,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Search,
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

  const readyFiles = uploadedFiles.filter((f) => f.status === 'ready')
  const processingFiles = uploadedFiles.filter((f) => f.status === 'processing')
  const duplicateFiles = uploadedFiles.filter((f) => f.status === 'duplicate')
  const reviewFiles = uploadedFiles.filter((f) => f.status === 'review')
  const unqualifiedFiles = uploadedFiles.filter((f) => f.status === 'unqualified')

  const processedCount = uploadedFiles.filter((f) => f.status !== 'processing').length
  const totalCount = uploadedFiles.length
  const progressPct = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0

  const filteredFiles = uploadedFiles.filter((file) => {
    if (statusFilter !== 'ALL' && file.status !== statusFilter) return false
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
          <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E9E5]">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#EBF6EF] border border-[#BBE5CD] flex items-center justify-center shrink-0 shadow-tactile-sm">
                  <Upload className="w-5 h-5 text-[#1B4938]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[11px] font-bold text-[#1B6C47] uppercase tracking-wider bg-[#EBF6EF] px-2 py-0.5 rounded border border-[#BBE5CD]">
                      Tahap 3 dari 4
                    </span>
                    <h1 className="text-lg sm:text-xl font-bold text-[#13221C] tracking-tight">
                      Unggah Berkas CV & Pipeline Ingestion
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-[#40564D] mt-1">
                    Unggah resume kandidat dalam format PDF, DOCX, scan dokumen, atau arsip ZIP. Sistem akan melakukan sanitasi, deteksi duplikasi hash, dan anonimisasi identitas (Blind Screening).
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
                    className="h-8 px-3 text-xs text-[#13221C] hover:bg-[#EBF1EE] bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg font-semibold transition-colors flex items-center space-x-1.5 shadow-tactile-sm disabled:opacity-50 cursor-pointer"
                    title="Segarkan status berkas dari server"
                  >
                    <RotateCcw
                      className={`w-3.5 h-3.5 ${
                        isRefreshing ? 'animate-spin text-[#1B4938]' : 'text-[#40564D]'
                      }`}
                    />
                    <span className="hidden sm:inline">Perbarui Status</span>
                  </button>
                )}

                {uploadedFiles.length > 0 && onClearFiles && (
                  <button
                    type="button"
                    onClick={onClearFiles}
                    className="h-8 px-3 text-xs text-[#9E2A2B] hover:bg-[#FCEBEB] bg-[#FCFDFC] border border-[#F6C1C1] rounded-lg font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-tactile-sm"
                    title="Hapus semua berkas CV yang diunggah"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan Berkas</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onLoadGoldenSample}
                  className="h-8 px-3 text-xs text-[#1B4938] hover:bg-[#DEF0E4] bg-[#EBF6EF] border border-[#BBE5CD] rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-tactile-sm active:scale-98"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#1B4938]" />
                  <span>🧪 Muat 15 Sampel Golden Dataset</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,.docx,.doc,.zip,.jpg,.jpeg,.png"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mt-6 border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-[#1B4938] bg-[#EBF6EF] scale-[1.01]'
                  : 'border-[#D5DFD9] bg-[#F5F8F6] hover:bg-[#EBF1EE]/60 hover:border-[#1B4938]/40'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-[#EBF6EF] border border-[#BBE5CD] flex items-center justify-center mx-auto mb-3 shadow-tactile-sm">
                <Upload
                  className={`w-6 h-6 text-[#1B4938] ${
                    isUploading ? 'animate-bounce text-[#2D6A4F]' : ''
                  }`}
                />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#13221C]">
                {isUploading
                  ? uploadStatusMsg || 'Sedang memproses upload berkas...'
                  : 'Tarik & letakkan berkas CV ke sini, atau klik untuk memilih file'}
              </h3>
              <p className="text-xs text-[#40564D] mt-1.5">
                Mendukung berkas PDF, DOCX, DOC, JPG, PNG, atau ZIP (Maksimal 10 MB per berkas)
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] bg-[#FCFDFC] border border-[#D5DFD9] px-2.5 py-1 rounded-md text-[#40564D] shadow-tactile-sm font-mono">
                  {totalCount > 0
                    ? `${totalCount} Berkas Terdeteksi`
                    : 'Belum ada berkas dipilih'}
                </span>
                <span className="text-[11px] bg-[#EBF6EF] border border-[#BBE5CD] px-2.5 py-1 rounded-md text-[#1B6C47] font-mono font-semibold">
                  {readyFiles.length} CV Siap Evaluasi
                </span>
              </div>
            </div>

            {/* Ingestion Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <span className="text-[#13221C] flex items-center space-x-1.5">
                  <span>Kemajuan Ingestion & Sanitizer:</span>
                  <strong className="font-mono tabular-nums text-[#1B4938]">
                    {processedCount}/{totalCount} CV Berhasil Diproses
                  </strong>
                </span>
                <span className="text-[#1B6C47] font-bold font-mono tabular-nums">
                  {totalCount > 0 ? `${progressPct}% Siap` : 'Menunggu Berkas'}
                </span>
              </div>
              <div className="w-full bg-[#EBF1EE] rounded-full h-2.5 overflow-hidden border border-[#D5DFD9]">
                <div
                  className="bg-[#1B4938] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Filter Pills & Search Bar */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-[#E2E9E5]">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'Semua', count: totalCount },
                  { id: 'ready', label: 'Siap', count: readyFiles.length },
                  { id: 'processing', label: 'Diproses', count: processingFiles.length },
                  { id: 'review', label: 'Perlu Cek', count: reviewFiles.length },
                  { id: 'duplicate', label: 'Duplikat', count: duplicateFiles.length },
                  { id: 'unqualified', label: 'Gagal', count: unqualifiedFiles.length },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStatusFilter(item.id)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                      statusFilter === item.id
                        ? 'bg-[#1B4938] text-[#FCFDFC] shadow-tactile-sm'
                        : 'bg-[#FCFDFC] border border-[#D5DFD9] text-[#40564D] hover:text-[#13221C] hover:bg-[#EBF1EE]'
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
                <Search className="w-3.5 h-3.5 text-[#40564D] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama berkas..."
                  className="h-8 pl-8 pr-3 bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg text-xs text-[#13221C] placeholder-[#40564D]/60 focus:border-[#1B4938] focus:outline-none w-full sm:w-48 shadow-tactile-sm font-medium"
                />
              </div>
            </div>

            {/* Files List Table */}
            <div className="mt-4 border border-[#D5DFD9] rounded-xl overflow-hidden overflow-x-auto shadow-tactile-sm">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className="bg-[#EBF1EE] text-[#40564D] font-semibold uppercase tracking-wider border-b border-[#D5DFD9]">
                  <tr>
                    <th className="py-2.5 px-3">Nama Berkas</th>
                    <th className="py-2.5 px-3 w-28">Ukuran</th>
                    <th className="py-2.5 px-3 w-36">Status</th>
                    <th className="py-2.5 px-3">Catatan / Sanitasi Ingestion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9E5] bg-[#FCFDFC]">
                  {filteredFiles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-[#40564D]">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-[#40564D]/40" />
                        <p className="font-bold text-[#13221C]">
                          {uploadedFiles.length === 0
                            ? 'Belum ada berkas CV yang diunggah'
                            : 'Tidak ada berkas yang sesuai dengan filter'}
                        </p>
                        <p className="text-[11px] text-[#40564D] mt-0.5">
                          Tarik berkas PDF ke kotak di atas atau klik tombol Muat Golden Dataset.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredFiles.map((file, idx) => {
                      let badgeClass = 'bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9]'
                      let statusLabel: string = file.status
                      let Icon = FileCheck

                      if (file.status === 'ready') {
                        badgeClass = 'bg-[#EBF6EF] text-[#1B6C47] border border-[#BBE5CD]'
                        statusLabel = 'Siap'
                      } else if (file.status === 'processing') {
                        badgeClass =
                          'bg-[#EBF1EE] text-[#1B4938] border border-[#D5DFD9] animate-pulse'
                        statusLabel = 'Diproses...'
                        Icon = Loader2
                      } else if (file.status === 'review') {
                        badgeClass = 'bg-[#FEF6E8] text-[#8A4C05] border border-[#F8D8A7]'
                        statusLabel = 'Perlu Cek'
                        Icon = AlertTriangle
                      } else if (file.status === 'duplicate') {
                        badgeClass = 'bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9]'
                        statusLabel = 'Duplikat'
                      } else if (file.status === 'unqualified') {
                        badgeClass = 'bg-[#FCEBEB] text-[#9E2A2B] border border-[#F6C1C1]'
                        statusLabel = 'Gagal Parsing'
                        Icon = AlertTriangle
                      }

                      return (
                        <tr key={idx} className="hover:bg-[#EBF1EE]/50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-[#13221C] flex items-center space-x-2">
                            <Icon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                file.status === 'processing'
                                  ? 'text-[#1B4938] animate-spin'
                                  : file.status === 'ready'
                                  ? 'text-[#1B6C47]'
                                  : file.status === 'review'
                                  ? 'text-[#8A4C05]'
                                  : file.status === 'unqualified'
                                  ? 'text-[#9E2A2B]'
                                  : 'text-[#40564D]'
                              }`}
                            />
                            <span className="truncate max-w-sm">{file.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-[#40564D] font-mono tabular-nums text-[11px]">
                            {file.size}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center space-x-1 ${badgeClass}`}
                            >
                              <span>{statusLabel}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#40564D] text-[11px] font-mono">
                            {file.reason || 'Ekstraksi identitas & keahlian terverifikasi'}
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

      {/* Tactile Workflow Navigation Footer */}
      <footer className="h-14 border-t border-[#D5DFD9] bg-[#FCFDFC] px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-tactile-sm z-10">
        <button
          type="button"
          onClick={onBack}
          className="h-9 px-3.5 text-xs font-semibold text-[#40564D] hover:text-[#13221C] hover:bg-[#EBF1EE] border border-[#D5DFD9] rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-tactile-sm active:scale-98"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Kriteria</span>
        </button>

        <div className="hidden sm:flex items-center space-x-3 text-xs font-mono">
          <span className="text-[#40564D]">
            Berkas Terunggah: <strong className="text-[#13221C]">{totalCount} file</strong>
          </span>
          <span className="text-[#D5DFD9]">|</span>
          <span className="text-[#40564D]">
            Siap Dinilai:{' '}
            <strong className="text-[#1B6C47]">{readyFiles.length} berkas</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={handleLaunchScreening}
          disabled={isScreening || (readyFiles.length === 0 && totalCount === 0)}
          className="h-9 px-5 bg-[#1B4938] hover:bg-[#2D6A4F] text-[#FCFDFC] text-xs font-bold rounded-lg transition-all flex items-center space-x-2 cursor-pointer shadow-tactile active:scale-98 disabled:opacity-50"
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
