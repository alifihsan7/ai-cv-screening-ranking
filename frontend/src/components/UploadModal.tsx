import React, { useRef, useState } from 'react'
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'

export interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  uploadedFiles: Array<{
    id: string
    name: string
    size: string
    status: 'ready' | 'processing' | 'error'
    pages?: number
  }>
  isUploading: boolean
  uploadStatusMsg: string
  onUploadFiles: (files: FileList | File[]) => void
  onStartScreening: () => void
  isScreening: boolean
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  uploadedFiles,
  isUploading,
  uploadStatusMsg,
  onUploadFiles,
  onStartScreening,
  isScreening,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files)
    }
  }

  const readyCount = uploadedFiles.filter((f) => f.status === 'ready').length
  const processingCount = uploadedFiles.filter((f) => f.status === 'processing').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#13221C]/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#D5DFD9] bg-[#FCFDFC] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF1EE] border border-[#D5DFD9] flex items-center justify-center text-[#1B4938] shadow-tactile-sm">
              <Upload className="w-5 h-5 text-[#1B4938]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#13221C] tracking-tight">
                Unggah Berkas Lamaran CV
              </h2>
              <p className="text-xs text-[#2D4439] mt-0.5">
                Mendukung format PDF, DOCX, DOC, atau ZIP arsip dokumen.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938]"
            aria-label="Tutup Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt,.zip"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Drag & Drop Target Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-[#1B4938] bg-[#EBF6EF] scale-[1.01]'
                : 'border-[#D5DFD9] bg-[#F5F8F6] hover:bg-[#EBF1EE]/70 hover:border-[#1B4938]/40 shadow-tactile-sm'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-[#EBF1EE] border border-[#D5DFD9] mx-auto mb-3 flex items-center justify-center text-[#1B4938] shadow-tactile-sm">
              <Upload
                className={`w-6 h-6 text-[#1B4938] ${
                  isUploading ? 'animate-bounce text-[#265B46]' : ''
                }`}
              />
            </div>
            <h3 className="text-sm font-bold text-[#13221C]">
              {isUploading
                ? uploadStatusMsg || 'Sedang mengunggah berkas...'
                : 'Tarik & letakkan berkas CV ke sini, atau klik untuk memilih'}
            </h3>
            <p className="text-xs text-[#2D4439] mt-1 max-w-md mx-auto">
              Dokumen akan diproses melalui pipeline docling, verifikasi integritas teks, dan
              ekstraksi tipe-aman.
            </p>
          </div>

          {/* Uploaded Files Queue */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#13221C] uppercase tracking-wider text-[11px]">
                  Antrean Berkas ({uploadedFiles.length})
                </span>
                <span className="font-mono text-[#2D4439] text-[11px] tabular-nums font-semibold">
                  {readyCount} Siap • {processingCount} Memproses
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 border border-[#D5DFD9] rounded-xl p-2 bg-[#F5F8F6]">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#FCFDFC] border border-[#D5DFD9] text-xs"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-[#1B4938] shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-[#13221C] truncate">{file.name}</div>
                        <div className="font-mono text-[10px] text-[#2D4439]">{file.size}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {file.status === 'processing' && (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-[#7A3E02] bg-[#FEF6E8] px-2 py-0.5 rounded font-mono font-bold border border-[#F8D8A7]">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Memproses</span>
                        </span>
                      )}
                      {file.status === 'ready' && (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-[#124B2E] bg-[#EBF6EF] px-2 py-0.5 rounded font-mono font-bold border border-[#BBE5CD]">
                          <CheckCircle2 className="w-3 h-3 text-[#124B2E]" />
                          <span>Siap</span>
                        </span>
                      )}
                      {file.status === 'error' && (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-[#8C1819] bg-[#FCEBEB] px-2 py-0.5 rounded font-mono font-bold border border-[#F6C1C1]">
                          <AlertCircle className="w-3 h-3 text-[#8C1819]" />
                          <span>Gagal</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#D5DFD9] bg-[#F5F8F6] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl text-xs font-semibold text-[#2D4439] hover:text-[#13221C] hover:bg-[#EBF1EE] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938]"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={() => {
              onStartScreening()
              onClose()
            }}
            disabled={uploadedFiles.length === 0 || isScreening}
            className="min-h-[44px] px-5 bg-[#1B4938] hover:bg-[#265B46] text-[#FCFDFC] text-xs font-bold rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-tactile disabled:opacity-40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938]"
          >
            {isScreening ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#FCFDFC]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#FCFDFC]" />
            )}
            <span>Jalankan Screening AI</span>
          </button>
        </div>
      </div>
    </div>
  )
}
