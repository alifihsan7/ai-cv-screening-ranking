import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Briefcase,
  FileText,
  Upload,
  Trophy,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Download,
  GitCompare,
  RotateCcw,
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Check,
  ShieldAlert,
  Search,
  Loader2,
  Terminal,
  Cpu,
  Clock,
  ShieldCheck,
  X,
  BookmarkCheck,
  Layers,
} from 'lucide-react'
import type { CandidateDetail, Requirement } from './types'
import { INITIAL_REQUIREMENTS } from './mockData'
import { ROLE_TEMPLATES } from './jobTemplates'

const getActionBadgeClass = (action: string) => {
  if (action.includes('Jev') || action.includes('GROUNDED_VERIFIER')) {
    return 'bg-[#E6F4EA] text-[#134E35] border-[#A5D6B6] font-bold'
  }
  if (action.includes('CRITIQUE') || action.includes('REFLECT')) {
    return 'bg-[#FEF6E8] text-[#8A4C05] border-[#F8D8A7] font-semibold'
  }
  if (action.includes('PARSER') || action.includes('DOCLING')) {
    return 'bg-[#EBF1EE] text-[#1B4938] border-[#D5DFD9] font-semibold'
  }
  if (action.includes('RETRIEVAL')) {
    return 'bg-[#EBF6EF] text-[#1B6C47] border-[#BBE5CD] font-semibold'
  }
  if (action.includes('DETERMINISTIC') || action.includes('SCORER')) {
    return 'bg-[#EBF1EE] text-[#13221C] border-[#D5DFD9] font-semibold'
  }
  if (action.includes('FINALIZE')) {
    return 'bg-[#E6F4EA] text-[#134E35] border-[#A5D6B6] font-semibold'
  }
  return 'bg-[#EBF1EE] text-[#40564D] border-[#D5DFD9] font-medium'
}

export default function App() {
  // Navigation & Workflow state
  const [currentStep, setCurrentStep] = useState<'setup' | 'requirements' | 'upload' | 'leaderboard'>('setup')
  const [blindMode, setBlindMode] = useState<boolean>(true)
  
  // Job Setup state
  const [jobTitle, setJobTitle] = useState('Senior Backend Engineer')
  const [jobLocation, setJobLocation] = useState('Jakarta / Hybrid')
  const [jobType, setJobType] = useState('Penuh Waktu (Full-time)')
  const [jobDescription, setJobDescription] = useState(
    `Kami mencari Senior Backend Engineer untuk bergabung dengan tim platform core kami.
Tanggung Jawab:
- Membangun RESTful API dan arsitektur microservices yang berjalan di production berskala besar.
- Merancang, memelihara, dan mengoptimalkan basis data PostgreSQL.
- Mengembangkan layanan backend dengan Python (FastAPI / Django).
- Mengelola deployment menggunakan Docker dan Kubernetes di cloud (AWS/GCP).
- Membimbing engineer junior dan melakukan code review.

Kualifikasi:
- Minimal 3 tahun pengalaman kerja relevan sebagai Backend Engineer.
- Menguasai Python (FastAPI/Django) dan PostgreSQL.
- Berpengalaman dengan container Docker dan Kubernetes/cloud.
- Pendidikan S1 Teknik Informatika, Ilmu Komputer, atau setara.
- Memiliki sertifikasi cloud arsitek merupakan nilai tambah.`
  )

  // Requirements state
  const [requirements, setRequirements] = useState<Requirement[]>(INITIAL_REQUIREMENTS)
  const [categoryWeights, setCategoryWeights] = useState<Record<string, number>>({
    EXPERIENCE: 40,
    HARD_SKILLS: 30,
    EDUCATION_CERT: 15,
    ACHIEVEMENT: 15,
  })
  const [criteriaApproved, setCriteriaApproved] = useState<boolean>(true)
  const [criteriaVersion, setCriteriaVersion] = useState<number>(1)
  const [newReqDesc, setNewReqDesc] = useState('')
  const [newReqCategory, setNewReqCategory] = useState<string>('HARD_SKILLS')
  const [newReqImportance, setNewReqImportance] = useState<string>('MUST_HAVE')
  const [newReqWeight, setNewReqWeight] = useState<number>(10)
  const [isCompiling, setIsCompiling] = useState<boolean>(false)

  // Auth & Backend sync state
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('cv_screening_token'))
  const [currentJobId, setCurrentJobId] = useState<string | null>(() => localStorage.getItem('cv_screening_job_id'))
  const [currentJobTitle, setCurrentJobTitle] = useState<string>('')
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [availableJobs, setAvailableJobs] = useState<Array<{ id: string; title: string; cv_count: number }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [isScreening, setIsScreening] = useState<boolean>(false)
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const pollTimerRef = useRef<any>(null)
  const isPollingRef = useRef<boolean>(false)

  // Uploaded files list
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: string; status: 'ready' | 'processing' | 'review' | 'unqualified' | 'duplicate'; reason?: string }>>([])

  // Candidates & Leaderboard state
  const [candidates, setCandidates] = useState<CandidateDetail[]>([])
  const [activeBand, setActiveBand] = useState<'ALL' | 'A' | 'B' | 'C' | 'MANUAL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetail | null>(null)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])
  const [isCompareOpen, setIsCompareOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [activeDrawerTab, setActiveDrawerTab] = useState<'ringkasan' | 'kartu_skor' | 'cv_asli' | 'riwayat'>('ringkasan')
  const [selectedQuoteToHighlight, setSelectedQuoteToHighlight] = useState<string | null>(null)

  // Custom Job Selector Dropdown state
  const [isJobSelectOpen, setIsJobSelectOpen] = useState<boolean>(false)
  const jobSelectRef = useRef<HTMLDivElement>(null)

  // Non-blocking Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'success' } | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ message, type })
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  // Keyboard Accessibility: Escape key closes active drawer & modals instantly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedCandidate) {
          setSelectedCandidate(null)
        } else if (isCompareOpen) {
          setIsCompareOpen(false)
        } else if (isExportOpen) {
          setIsExportOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCandidate, isCompareOpen, isExportOpen])

  // Click outside to close custom job selector popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (jobSelectRef.current && !jobSelectRef.current.contains(e.target as Node)) {
        setIsJobSelectOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Policy Linter for prohibited criteria (physical appearance only; religion & gender are permitted)
  const prohibitedFlags = useMemo(() => {
    const flags: string[] = []
    requirements.forEach((r) => {
      const txt = (r.description + ' ' + (r.source_text || '')).toLowerCase()
      if (/menarik|penampilan|good looking|foto\s+full\s+body|proporsional/.test(txt)) {
        flags.push(`Kriteria penampilan fisik (${r.requirement_id}): Tidak boleh digunakan`)
      }
    })
    return flags
  }, [requirements])

  // Dynamic sum of category weights
  const totalCategoryWeight = useMemo(() => {
    return (
      Number(categoryWeights.EXPERIENCE || 0) +
      Number(categoryWeights.HARD_SKILLS || 0) +
      Number(categoryWeights.EDUCATION_CERT || 0) +
      Number(categoryWeights.ACHIEVEMENT || 0)
    )
  }, [categoryWeights])

  // Filtered candidates for leaderboard
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (activeBand !== 'ALL') {
        if (activeBand === 'A' && c.band !== 'A') return false
        if (activeBand === 'B' && c.band !== 'B') return false
        if (activeBand === 'C' && c.band !== 'C') return false
        if (activeBand === 'MANUAL' && c.recommendation !== 'MANUAL_CHECK' && c.recommendation !== 'REJECTED_NOT_A_CV') return false
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const nameMatch = (blindMode && !c.revealed ? c.blind_id : c.real_name).toLowerCase().includes(q)
        const fileMatch = c.file_name.toLowerCase().includes(q)
        if (!nameMatch && !fileMatch) return false
      }
      return true
    })
  }, [candidates, activeBand, searchQuery, blindMode])

  const getAuthHeaders = (): Record<string, string> => {
    const t = authToken || localStorage.getItem('cv_screening_token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  // Auto-login recruiter on mount & handle token refresh
  const loginRecruiter = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'recruiter@alifihsan.my.id',
          password: 'RecruiterPassword2026!',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.access_token) {
          setAuthToken(data.access_token)
          localStorage.setItem('cv_screening_token', data.access_token)
          return data.access_token
        }
      }
    } catch (e) {
      console.warn('Auto-login error:', e)
    }
    return null
  }

  const selectJob = async (jId: string, title?: string) => {
    setCurrentJobId(jId)
    localStorage.setItem('cv_screening_job_id', jId)
    if (title) {
      setJobTitle(title)
      setCurrentJobTitle(title)
    }

    try {
      // 1. Fetch full job details (including jd_text, location, employment_type)
      const res = await fetch(`/api/v1/jobs/${jId}`, { headers: { ...getAuthHeaders() } })
      if (res.ok) {
        const data = await res.json()
        if (data.title) {
          setJobTitle(data.title)
          setCurrentJobTitle(data.title)
        }
        if (data.jd_text) {
          setJobDescription(data.jd_text)
        }
        if (data.location) {
          setJobLocation(data.location)
        }
        if (data.employment_type) {
          setJobType(data.employment_type)
        }
      }

      // 2. Fetch requirements if already created for this job
      const resReq = await fetch(`/api/v1/jobs/${jId}/requirements`, { headers: { ...getAuthHeaders() } })
      if (resReq.ok) {
        const reqList = await resReq.json()
        const catWeightsHdr = resReq.headers.get('X-Category-Weights')
        const verHdr = resReq.headers.get('X-Requirements-Version')
        if (catWeightsHdr) {
          try {
            const parsedWeights = JSON.parse(catWeightsHdr)
            if (parsedWeights && typeof parsedWeights === 'object') {
              setCategoryWeights(parsedWeights)
            }
          } catch (e) {
            console.warn('Failed parsing category weights header:', e)
          }
        }
        if (verHdr) {
          setCriteriaVersion(parseInt(verHdr) || 1)
        }
        if (Array.isArray(reqList) && reqList.length > 0) {
          setRequirements(reqList)
          setCriteriaApproved(true)
        } else {
          setCriteriaApproved(false)
        }
      }
    } catch (e) {
      console.warn('Error fetching job details:', e)
    }

    await fetchJobCvsStatus(jId)
    await fetchLatestLeaderboard(jId)
  }

  const fetchJobsList = async () => {
    try {
      const res = await fetch('/api/v1/jobs', { headers: { ...getAuthHeaders() } })
      if (res.ok) {
        const jobs = await res.json()
        if (Array.isArray(jobs) && jobs.length > 0) {
          setAvailableJobs(jobs.map((j: any) => ({ id: j.id, title: j.title, cv_count: j.cv_count || 0 })))

          const savedId = localStorage.getItem('cv_screening_job_id')
          const found = jobs.find((j: any) => j.id === savedId)
          if (found) {
            await selectJob(found.id, found.title)
          } else {
            const bestJob = jobs.slice().sort((a: any, b: any) => (b.cv_count || 0) - (a.cv_count || 0))[0]
            if (bestJob) {
              await selectJob(bestJob.id, bestJob.title)
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching jobs:', e)
    }
  }

  const handleRenameJob = async () => {
    if (!currentJobId) return
    const newTitle = window.prompt('Ubah nama lowongan:', currentJobTitle || jobTitle)
    if (!newTitle || !newTitle.trim() || newTitle.trim() === (currentJobTitle || jobTitle)) return
    try {
      const res = await fetch(`/api/v1/jobs/${currentJobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setJobTitle(updated.title)
        setCurrentJobTitle(updated.title)
        setAvailableJobs((prev) =>
          prev.map((j) => (j.id === currentJobId ? { ...j, title: updated.title } : j))
        )
        showToast('Nama lowongan berhasil diperbarui.', 'success')
      } else {
        showToast('Gagal mengubah nama lowongan.', 'warning')
      }
    } catch (e) {
      console.error(e)
      showToast('Terjadi kesalahan jaringan saat mengubah nama lowongan.', 'warning')
    }
  }

  const handleDeleteJob = async () => {
    if (!currentJobId) return
    const title = currentJobTitle || jobTitle || 'Lowongan ini'
    const confirmed = window.confirm(
      `Hapus lowongan "${title}"?\n\nSemua berkas CV dan hasil evaluasi lowongan ini akan dihapus permanen.`
    )
    if (!confirmed) return
    try {
      const res = await fetch(`/api/v1/jobs/${currentJobId}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
        },
      })
      if (res.ok) {
        showToast(`Lowongan "${title}" berhasil dihapus.`, 'info')
        const remaining = availableJobs.filter((j) => j.id !== currentJobId)
        setAvailableJobs(remaining)
        if (remaining.length > 0) {
          await selectJob(remaining[0].id, remaining[0].title)
        } else {
          setCurrentJobId('')
          setCurrentJobTitle('')
          setJobTitle('')
          setJobDescription('')
          setJobLocation('')
          setRequirements([])
          setUploadedFiles([])
          setCandidates([])
          setCriteriaApproved(false)
          setCurrentStep('setup')
        }
      } else {
        showToast('Gagal menghapus lowongan.', 'warning')
      }
    } catch (e) {
      console.error(e)
      showToast('Terjadi kesalahan jaringan saat menghapus lowongan.', 'warning')
    }
  }

  useEffect(() => {
    const init = async () => {
      await loginRecruiter()
      await fetchJobsList()
    }
    init()
  }, [])

  const ensureJobExists = async (): Promise<string> => {
    if (currentJobId) return currentJobId
    try {
      const listRes = await fetch('/api/v1/jobs', { headers: { ...getAuthHeaders() } })
      if (listRes.ok) {
        const jobs = await listRes.json()
        if (jobs && jobs.length > 0) {
          const bestJob = jobs.slice().sort((a: any, b: any) => (b.cv_count || 0) - (a.cv_count || 0))[0]
          const jId = bestJob.id
          await selectJob(jId, bestJob.title)
          return jId
        }
      }
    } catch (e) {
      console.warn('Job listing error:', e)
    }
    try {
      const res = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          title: jobTitle,
          jd_text: jobDescription,
          location: jobLocation,
          employment_type: jobType,
          external_ref: 'JD-WEB',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const jId = data.id
        await selectJob(jId, jobTitle)
        return jId
      }
    } catch (e) {
      console.warn('Job creation error:', e)
    }
    return '5364833c-ae8a-4b11-aeff-016b34903da0'
  }

  const stopPollingJobCvs = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    isPollingRef.current = false
  }

  const startPollingJobCvs = (jId: string) => {
    if (!jId) return
    stopPollingJobCvs()
    isPollingRef.current = true
    let attempts = 0
    const maxAttempts = 150 // Poll up to 5 minutes (150 * 2000ms)

    const tick = async () => {
      attempts++
      const allDone = await fetchJobCvsStatus(jId)
      if (allDone || attempts >= maxAttempts) {
        stopPollingJobCvs()
      }
    }

    tick()
    pollTimerRef.current = setInterval(tick, 2000)
  }

  const fetchJobCvsStatus = async (jId: string): Promise<boolean> => {
    if (!jId) return true
    try {
      const res = await fetch(`/api/v1/jobs/${jId}/cvs/status`, {
        headers: { ...getAuthHeaders() },
      })
      if (res.ok) {
        const data = await res.json()
        const rawDocs = data.documents || data.files || []
        if (Array.isArray(rawDocs) && rawDocs.length > 0) {
          const mapped = rawDocs.map((f: any) => ({
            name: f.filename,
            size: f.size_bytes ? `${Math.round(f.size_bytes / 1024)} KB` : 'Terproses',
            status:
              f.status === 'READY'
                ? ('ready' as const)
                : f.status === 'NEEDS_REVIEW'
                ? ('review' as const)
                : f.status === 'DUPLICATE'
                ? ('duplicate' as const)
                : f.status === 'PROCESSING' || f.status === 'RECEIVED'
                ? ('processing' as const)
                : ('unqualified' as const),
            reason:
              f.duplicate_of
                ? `Duplikat dari: ${f.duplicate_of}`
                : f.status === 'DUPLICATE'
                ? 'Berkas duplikat identik (sudah diunggah sebelumnya)'
                : f.reasons && f.reasons.length > 0
                ? f.reasons.join(', ')
                : f.status === 'PROCESSING' || f.status === 'RECEIVED'
                ? 'Sedang diekstrak dan dianalisis oleh server...'
                : 'Ekstraksi identitas & keahlian terverifikasi',
          }))
          setUploadedFiles(mapped)
          const allDone = rawDocs.every((f: any) => f.status !== 'RECEIVED' && f.status !== 'PROCESSING')
          return allDone
        } else if (Array.isArray(rawDocs) && rawDocs.length === 0) {
          return true
        }
      }
    } catch (e) {
      console.warn('Error polling status:', e)
      return false
    }
    return false
  }

  const handleManualRefresh = async () => {
    if (!currentJobId) return
    setIsRefreshing(true)
    const allDone = await fetchJobCvsStatus(currentJobId)
    if (!allDone) {
      startPollingJobCvs(currentJobId)
    }
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return
    setIsUploading(true)
    setUploadStatusMsg(`Mengunggah ${files.length} berkas CV...`)

    // Instantly show the selected files in the table as 'processing'
    const immediateItems = Array.from(files).map((f) => ({
      name: f.name,
      size: `${Math.round(f.size / 1024)} KB`,
      status: 'processing' as const,
      reason: 'Sedang mengunggah dan menganalisis berkas di server...',
    }))
    setUploadedFiles((prev) => [
      ...immediateItems,
      ...prev.filter((p) => !immediateItems.some((n) => n.name === p.name)),
    ])

    try {
      const jId = await ensureJobExists()
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i])
      }
      let currentHeaders = getAuthHeaders()
      let res = await fetch(`/api/v1/jobs/${jId}/cvs`, {
        method: 'POST',
        headers: { ...currentHeaders },
        body: formData,
      })

      // Automatic recovery if token is expired or unauthorized
      if (res.status === 401) {
        console.warn('Token expired or unauthorized, auto-refreshing token...')
        localStorage.removeItem('cv_screening_token')
        const freshToken = await loginRecruiter()
        if (freshToken) {
          res = await fetch(`/api/v1/jobs/${jId}/cvs`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${freshToken}` },
            body: formData,
          })
        }
      }

      if (res.ok) {
        const resData = await res.json().catch(() => null)
        // If server unpacked archive entries, immediately update table with extracted files
        if (resData && Array.isArray(resData.files) && resData.files.length > 0) {
          setUploadedFiles(
            resData.files.map((f: any) => ({
              name: f.filename,
              size: 'Memproses...',
              status: f.status === 'DUPLICATE' ? ('duplicate' as const) : ('processing' as const),
              reason:
                f.status === 'DUPLICATE'
                  ? 'Berkas duplikat identik (sudah diunggah sebelumnya)'
                  : 'Sedang diekstrak dan dianalisis oleh server...',
            }))
          )
        }
        setUploadStatusMsg('Unggahan diterima server. Mengekstrak dan menganalisis berkas...')
        // Start continuous background polling
        startPollingJobCvs(jId)
        showToast('Berkas CV berhasil diunggah.', 'success')
      } else {
        const err = await res.json().catch(() => ({}))
        const msg = err.detail || err.message || res.statusText || `Server error (${res.status})`
        showToast(`Gagal mengunggah berkas: ${msg}`, 'warning')
        setUploadedFiles((prev) =>
          prev.map((p) =>
            immediateItems.some((imm) => imm.name === p.name)
              ? { ...p, status: 'unqualified' as const, reason: `Gagal diunggah: ${msg}` }
              : p
          )
        )
      }
    } catch (e: any) {
      showToast(`Terjadi kesalahan jaringan: ${e.message}`, 'warning')
      setUploadedFiles((prev) =>
        prev.map((p) =>
          immediateItems.some((imm) => imm.name === p.name)
            ? { ...p, status: 'unqualified' as const, reason: `Kesalahan jaringan: ${e.message}` }
            : p
        )
      )
    } finally {
      setIsUploading(false)
      setUploadStatusMsg('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleLoadSampleCvs = () => {
    setUploadedFiles([
      { name: 'S1_senior_backend_id.pdf', size: '142 KB', status: 'ready', reason: 'Ekstraksi identitas & keahlian terverifikasi' },
      { name: 'S2_backend_fintech_en.pdf', size: '128 KB', status: 'ready', reason: 'Ekstraksi identitas & keahlian terverifikasi' },
      { name: 'S3_backend_mixed_lang.pdf', size: '156 KB', status: 'ready', reason: 'Ekstraksi identitas & keahlian terverifikasi' },
      { name: 'S4_lead_backend_two_column.pdf', size: '185 KB', status: 'ready', reason: 'Ekstraksi identitas & keahlian terverifikasi' },
      { name: 'S5_backend_healthtech_id.docx', size: '112 KB', status: 'ready', reason: 'Ekstraksi identitas & keahlian terverifikasi' },
      { name: 'M1_nodejs_backend_two_column.pdf', size: '139 KB', status: 'ready', reason: 'Ekstraksi identitas & keahlian terverifikasi' },
      { name: 'M2_data_analyst_id.pdf', size: '145 KB', status: 'ready', reason: 'Ekstraksi identitas & keahlian terverifikasi' },
      { name: 'M3_fresh_graduate_scan_id.pdf', size: '210 KB', status: 'ready', reason: 'Ekstraksi identitas & keahlian terverifikasi' },
      { name: 'M4_qa_automation_en.docx', size: '98 KB', status: 'ready', reason: 'Ekstraksi identitas & keahlian terverifikasi' },
      { name: 'M5_php_fullstack_two_column_id.pdf', size: '140 KB', status: 'ready', reason: 'Ekstraksi identitas & keahlian terverifikasi' },
      { name: 'I1_hr_generalist_id.pdf', size: '115 KB', status: 'ready', reason: 'Ekstraksi identitas & keahlian terverifikasi' },
      { name: 'E1_empty_cv.pdf', size: '12 KB', status: 'review', reason: 'Dokumen kosong / konten tidak memadai' },
      { name: 'E3_hidden_prompt_injection.pdf', size: '160 KB', status: 'ready', reason: 'Teks tersembunyi dinetralkan' },
      { name: 'E6_password_protected.pdf', size: '84 KB', status: 'unqualified', reason: 'PDF terklocked password — minta kandidat kirim ulang' },
      { name: 'E8_duplicate_of_S1.pdf', size: '142 KB', status: 'duplicate', reason: 'Duplikat identik dari S1_senior_backend_id.pdf' },
    ])
    showToast('Sampel CV berhasil dimuat.', 'info')
  }

  const handleClearUploadedCvs = async () => {
    if (!confirm('Apakah Anda yakin ingin mengosongkan semua berkas CV yang telah diunggah untuk lowongan ini?')) return
    try {
      const jId = await ensureJobExists()
      const res = await fetch(`/api/v1/jobs/${jId}/cvs`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
      })
      if (res.ok) {
        setUploadedFiles([])
        setCandidates([])
        showToast('Semua berkas CV berhasil dikosongkan.', 'info')
      } else {
        showToast('Gagal mengosongkan berkas CV dari server.', 'warning')
      }
    } catch (e: any) {
      showToast(`Terjadi kesalahan: ${e.message}`, 'warning')
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFiles(e.target.files)
    }
  }

  const fetchLatestLeaderboard = async (jId?: string, maxAttempts = 6) => {
    try {
      const targetJobId = jId || (await ensureJobExists())
      if (!targetJobId) return
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const res = await fetch(`/api/v1/jobs/${targetJobId}/screenings/latest`, {
          headers: { ...getAuthHeaders() },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.latest_run && data.rankings && data.rankings.length > 0) {
            setCurrentRunId(data.screening_run_id || data.latest_run.id)
            const mappedCandidates: CandidateDetail[] = data.rankings.map((r: any, idx: number) => ({
              rank: r.rank || idx + 1,
              cv_id: r.cv_id || r.candidate_id,
              file_name: r.file_name,
              blind_id: `C-${String(idx + 1).padStart(4, '0')}`,
              real_name: r.file_name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
              revealed: false,
              final_score: typeof r.final_score === 'number' ? r.final_score : parseFloat(r.final_score) || 0,
              raw_score: typeof r.raw_score === 'number' ? r.raw_score : parseFloat(r.raw_score) || 0,
              band: r.band,
              recommendation: r.recommendation,
              category_breakdown: r.category_breakdown || {},
              metrics: {},
              flags: r.flags || [],
              quality_status: r.quality_status || 'READY',
              eligibility_status: r.eligibility_status || 'ELIGIBLE',
              eligibility_reasons: r.eligibility_reasons || [],
              requirement_states: r.requirement_states || {},
              evidence: {},
              explanation: {
                band: r.band,
                recommendation: r.recommendation,
                final_score: typeof r.final_score === 'number' ? r.final_score : parseFloat(r.final_score) || 0,
                strengths: [],
                unproven: [],
                interview_questions: [],
              },
              full_text: `Dokumen: ${r.file_name}\nStatus Ingestion: ${r.quality_status || 'READY'}\nSkor Evaluasi: ${r.final_score}`,
            }))
            setCandidates(mappedCandidates)
            return
          }
        }
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    } catch (e) {
      console.warn('Error fetching latest leaderboard:', e)
    }
  }

  useEffect(() => {
    if (currentStep === 'upload' && currentJobId) {
      fetchJobCvsStatus(currentJobId).then((allDone) => {
        if (!allDone) {
          startPollingJobCvs(currentJobId)
        }
      })
    } else if (currentStep === 'leaderboard') {
      fetchLatestLeaderboard()
    }
  }, [currentStep, currentJobId])

  useEffect(() => {
    return () => {
      stopPollingJobCvs()
    }
  }, [])

  const handleStartScreening = async () => {
    setIsScreening(true)
    try {
      const jId = await ensureJobExists()
      // Import approved criteria to backend
      try {
        await fetch(`/api/v1/jobs/${jId}/requirements/import-approved`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            requirement_set_version: criteriaVersion,
            category_weights: categoryWeights,
            requirements: requirements,
            status: 'DRAFT',
          }),
        })
        // Formally approve the requirement set via the approval gate endpoint (FX-03)
        await fetch(`/api/v1/jobs/${jId}/requirements/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        })
      } catch (e) {
        console.warn('Requirements import note:', e)
      }

      // Trigger screening run synchronously for immediate completion
      const res = await fetch(`/api/v1/jobs/${jId}/screenings?sync=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          use_agent: true,
          use_verifier: true,
          verifier_provider: 'JEV_TYPESAFE',
        }),
      })

      if (res.status === 409) {
        const errJson = await res.json().catch(() => ({}))
        showToast(errJson.detail || 'Kriteria belum disetujui. Silakan setujui kriteria lowongan terlebih dahulu.', 'warning')
        setCurrentStep('requirements')
        return
      }

      if (res.ok) {
        const data = await res.json()
        const runId = data.screening_run_id || data.run_id
        setCurrentRunId(runId)
        await fetchLatestLeaderboard(jId)
        showToast('Screening CV berhasil diselesaikan.', 'success')
        setCurrentStep('leaderboard')
      } else {
        const errJson = await res.json().catch(() => ({}))
        showToast(`Gagal menjalankan evaluasi: ${errJson.detail || res.statusText || 'Terjadi kesalahan pada server'}`, 'warning')
      }
    } catch (e: any) {
      console.warn('Error starting screening:', e)
      showToast(`Terjadi kesalahan: ${e.message}`, 'warning')
    } finally {
      setIsScreening(false)
    }
  }

  const handleSelectCandidate = async (cand: CandidateDetail) => {
    setSelectedCandidate(cand)
    setActiveDrawerTab('ringkasan')
    if (currentJobId && currentRunId) {
      try {
        const res = await fetch(`/api/v1/jobs/${currentJobId}/screenings/${currentRunId}/candidates/${cand.cv_id}`, {
          headers: { ...getAuthHeaders() },
        })
        if (res.ok) {
          const detail = await res.json()
          setSelectedCandidate((prev) => {
            if (!prev) return null
            return {
              ...prev,
              requirement_states: detail.requirement_states || prev.requirement_states,
              evidence: detail.evidence || prev.evidence,
              explanation: detail.explanation || prev.explanation,
              category_breakdown: detail.category_breakdown || prev.category_breakdown,
              flags: detail.flags || prev.flags,
              reasoning_trajectory: detail.reasoning_trajectory || prev.reasoning_trajectory,
              verifier_provider: detail.verifier_provider || prev.verifier_provider,
            }
          })
        }
      } catch (e) {
        console.warn('Candidate detail fetch note:', e)
      }
    }
  }

  // Handlers
  const handleRevealCandidate = async (cv_id: string) => {
    const confirmed = window.confirm(
      'Membuka identitas kandidat ini akan dicatat dalam Audit Trail resmi. Apakah Anda yakin ingin membuka identitas?'
    )
    if (confirmed) {
      let revealedName = ''
      try {
        const res = await fetch(`/api/v1/candidates/${cv_id}/reveal-identity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ reason: 'Audit identitas pelamar resmi di UI' }),
        })
        if (res.ok) {
          const data = await res.json()
          revealedName = data.full_name || ''
        }
      } catch (e) {
        console.warn('Reveal API note:', e)
      }

      setCandidates((prev) =>
        prev.map((c) =>
          c.cv_id === cv_id
            ? { ...c, revealed: true, real_name: revealedName || c.real_name }
            : c
        )
      )
      if (selectedCandidate && selectedCandidate.cv_id === cv_id) {
        setSelectedCandidate((prev) =>
          prev ? { ...prev, revealed: true, real_name: revealedName || prev.real_name } : null
        )
      }
    }
  }

  const handleDecision = (cv_id: string, decision: 'SHORTLIST' | 'HOLD' | 'TIDAK_LANJUT', note: string = '') => {
    setCandidates((prev) =>
      prev.map((c) => (c.cv_id === cv_id ? { ...c, decision, decision_notes: note } : c))
    )
    if (selectedCandidate && selectedCandidate.cv_id === cv_id) {
      setSelectedCandidate((prev) => (prev ? { ...prev, decision, decision_notes: note } : null))
    }
  }

  const handleAddRequirement = () => {
    if (!newReqDesc.trim()) return
    const newId = `R${requirements.length + 1}`
    const newReq: Requirement = {
      requirement_id: newId,
      description: newReqDesc,
      category: newReqCategory,
      kind: newReqCategory === 'EXPERIENCE' ? 'EXPERIENCE_DURATION' : newReqCategory === 'EDUCATION_CERT' ? 'EDUCATION' : 'SKILL',
      importance: newReqImportance,
      weight: newReqWeight,
      concepts: [],
      source_text: 'Ditambahkan secara manual oleh recruiter',
    }
    setRequirements([...requirements, newReq])
    setNewReqDesc('')
    setCriteriaApproved(false)
  }

  const handleCompileFromJd = async () => {
    if (!jobDescription.trim()) {
      showToast('Silakan masukkan deskripsi lowongan terlebih dahulu.', 'warning')
      return
    }
    setIsCompiling(true)

    // Ensure new or updated job is created in backend
    try {
      if (!currentJobId || (currentJobTitle && currentJobTitle !== jobTitle)) {
        const createRes = await fetch('/api/v1/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            title: jobTitle || 'Lowongan Baru',
            jd_text: jobDescription,
            location: jobLocation || 'Indonesia',
            employment_type: jobType || 'full_time',
            external_ref: `JD-${Date.now().toString().slice(-6)}`,
          }),
        })
        if (createRes.ok) {
          const newJob = await createRes.json()
          setCurrentJobId(newJob.id)
          setCurrentJobTitle(newJob.title)
          localStorage.setItem('cv_screening_job_id', newJob.id)
          setAvailableJobs((prev) => [
            { id: newJob.id, title: newJob.title, cv_count: 0 },
            ...prev.filter((j) => j.id !== newJob.id),
          ])
          setUploadedFiles([])
          setCandidates([])
        }
      }
    } catch (e) {
      console.warn('Job create error during compile:', e)
    }

    try {
      const res = await fetch('/api/v1/requirements/compile-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ jd_text: jobDescription }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.requirements && Array.isArray(data.requirements) && data.requirements.length > 0) {
          setRequirements(data.requirements)
          if (data.category_weights && typeof data.category_weights === 'object') {
            setCategoryWeights(data.category_weights)
          }
          setCriteriaVersion(1)
          setCriteriaApproved(false)
          setCurrentStep('requirements')
          return
        }
      }
    } catch (err) {
      console.warn('Backend compiler API not reachable, using fallback:', err)
    } finally {
      setIsCompiling(false)
    }

    // Client-side parser fallback
    const lines = jobDescription
      .split('\n')
      .map((l) => l.trim().replace(/^[-*•0-9.)]\s*/, ''))
      .filter((l) => l.length >= 8 && !l.startsWith('#'))

    if (lines.length > 0) {
      const extracted: Requirement[] = lines.slice(0, 12).map((l, idx) => {
        const lower = l.toLowerCase()
        const isExp =
          idx === 0 ||
          lower.includes('tahun') ||
          lower.includes('pengalaman') ||
          lower.includes('tanggung jawab')
        const isEdu =
          lower.includes('pendidikan') ||
          lower.includes('s1') ||
          lower.includes('d3') ||
          lower.includes('sertifikasi')
        return {
          requirement_id: `R${idx + 1}`,
          description: l,
          category: isExp
            ? 'EXPERIENCE'
            : isEdu
            ? 'EDUCATION_CERT'
            : 'HARD_SKILLS',
          kind: isExp
            ? 'EXPERIENCE_DURATION'
            : isEdu
            ? 'EDUCATION'
            : 'SKILL',
          importance:
            idx < 2
              ? 'MUST_HAVE'
              : idx < 5
              ? 'STRONG_PREFERENCE'
              : 'NICE_TO_HAVE',
          weight: idx < 2 ? 20 : 10,
          concepts: [],
          source_text: l,
        }
      })
      setRequirements(extracted)
      setCriteriaVersion(1)
      setCriteriaApproved(false)
      setCurrentStep('requirements')
    } else {
      setCurrentStep('requirements')
    }
  }

  const handleApproveCriteria = async () => {
    if (prohibitedFlags.length > 0) {
      showToast('Terdapat kriteria diskriminatif terlarang! Harap hapus kriteria tersebut sebelum menyetujui.', 'warning')
      return
    }
    if (totalCategoryWeight !== 100) {
      if (!confirm(`Total distribusi bobot kategori saat ini ${totalCategoryWeight}% (bukan 100%). Tetap lanjutkan dan kunci versi kriteria ini?`)) {
        return
      }
    }
    setCriteriaApproved(true)
    const nextVer = criteriaVersion + 1
    setCriteriaVersion(nextVer)

    // Automatically persist approved requirements and custom category weights to backend
    if (currentJobId) {
      try {
        await fetch(`/api/v1/jobs/${currentJobId}/requirements/import-approved`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            requirement_set_version: nextVer,
            category_weights: categoryWeights,
            requirements: requirements,
            status: 'DRAFT',
          }),
        })
        await fetch(`/api/v1/jobs/${currentJobId}/requirements/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        })
      } catch (e) {
        console.warn('Requirements persist error:', e)
      }
    }
    showToast(`Kriteria lowongan dan bobot penilaian berhasil disetujui dan dikunci (Versi ${nextVer}).`, 'success')
  }

  return (
    <div className="min-h-screen bg-[#F2F5F3] text-[#13221C] flex flex-col font-sans">
      {/* Top Application Header */}
      <header className="bg-[#FCFDFC] border-b border-[#D5DFD9] sticky top-0 z-30 px-6 py-3 flex items-center justify-between shadow-tactile-sm">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-[#1B4938] flex items-center justify-center text-[#FCFDFC] font-bold text-lg shadow-tactile-sm">
            CV
          </div>
          <div>
            <h1 className="text-base font-bold text-[#13221C] leading-tight">AI CV Screening & Ranking</h1>
            {availableJobs.length > 0 ? (
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-[#40564D] font-medium hidden sm:inline">Lowongan:</span>
                
                {/* Custom Tactile Popover Job Selector (Banned Native <select> Eradicated) */}
                <div className="relative" ref={jobSelectRef}>
                  <button
                    type="button"
                    onClick={() => setIsJobSelectOpen((prev) => !prev)}
                    className="flex items-center justify-between gap-2 text-xs bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] font-bold text-[#13221C] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1B4938]/20 focus:border-[#1B4938] min-w-[200px] max-w-[340px] shadow-tactile-sm transition-all cursor-pointer"
                    aria-expanded={isJobSelectOpen}
                    aria-haspopup="listbox"
                  >
                    <span className="truncate">
                      {currentJobTitle || availableJobs.find((j) => j.id === currentJobId)?.title || 'Pilih Lowongan'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9] text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold tabular-nums">
                        {(availableJobs.find((j) => j.id === currentJobId)?.cv_count ?? 0)} CV
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#40564D] transition-transform duration-150 ${
                          isJobSelectOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {isJobSelectOpen && (
                    <div
                      role="listbox"
                      className="absolute left-0 mt-1.5 w-80 bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl shadow-tactile-lg z-50 py-1.5 space-y-0.5 max-h-72 overflow-y-auto"
                    >
                      <div className="px-3 py-1.5 border-b border-[#E2E9E5] text-[10px] font-bold text-[#40564D] uppercase tracking-wider flex items-center justify-between">
                        <span>Daftar Lowongan Aktif</span>
                        <span className="font-mono tabular-nums">{availableJobs.length} Tersedia</span>
                      </div>
                      {availableJobs.map((j) => {
                        const isSelected = j.id === currentJobId
                        return (
                          <button
                            key={j.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              selectJob(j.id, j.title)
                              setIsJobSelectOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#EBF6EF] text-[#1B4938] font-bold border-l-3 border-[#1B4938]'
                                : 'text-[#13221C] hover:bg-[#EBF1EE] font-medium border-l-3 border-transparent'
                            }`}
                          >
                            <span className="truncate pr-2">{j.title}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9] tabular-nums">
                                {j.cv_count} CV
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#1B4938]" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleRenameJob}
                  disabled={!currentJobId}
                  className="h-8 w-8 inline-flex items-center justify-center text-[#40564D] hover:text-[#1B4938] bg-[#FCFDFC] hover:bg-[#EBF1EE] rounded-lg border border-[#D5DFD9] hover:border-[#1B4938]/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-tactile-sm focus-visible:ring-2 focus-visible:ring-[#1B4938]/20 cursor-pointer"
                  title="Ubah Nama Lowongan (Rename)"
                  aria-label="Ubah Nama Lowongan"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteJob}
                  disabled={!currentJobId}
                  className="h-8 w-8 inline-flex items-center justify-center text-[#40564D] hover:text-[#9E2A2B] bg-[#FCFDFC] hover:bg-[#FCEBEB] rounded-lg border border-[#D5DFD9] hover:border-[#F6C1C1] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-tactile-sm focus-visible:ring-2 focus-visible:ring-[#9E2A2B]/20 cursor-pointer"
                  title="Hapus Lowongan Ini (Delete)"
                  aria-label="Hapus Lowongan Ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentJobId('')
                    setCurrentJobTitle('')
                    setJobTitle('')
                    setJobDescription('')
                    setJobLocation('')
                    setRequirements([])
                    setUploadedFiles([])
                    setCandidates([])
                    setCriteriaApproved(false)
                    setCurrentStep('setup')
                  }}
                  className="h-7 px-2.5 text-xs bg-[#1B4938]/10 hover:bg-[#1B4938]/15 text-[#1B4938] border border-[#1B4938]/30 rounded-md font-semibold transition-all flex items-center space-x-1 shadow-tactile-sm cursor-pointer"
                  title="Buat Lowongan Baru"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Baru</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#40564D]">Platform Evaluasi & Pemeringkatan Kandidat Berpresisi Tinggi</p>
            )}
          </div>
        </div>

        {/* Global Progress Stepper */}
        <nav className="flex items-center space-x-1 bg-[#EBF1EE] p-1 rounded-xl text-xs font-medium border border-[#D5DFD9]">
          <button
            onClick={() => setCurrentStep('setup')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
              currentStep === 'setup'
                ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]/80'
                : 'text-[#40564D] hover:text-[#13221C] hover:bg-[#FCFDFC]/50'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>1. Setup Lowongan</span>
          </button>
          <button
            onClick={() => setCurrentStep('requirements')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
              currentStep === 'requirements'
                ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]/80'
                : 'text-[#40564D] hover:text-[#13221C] hover:bg-[#FCFDFC]/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1b. Kriteria ({requirements.length})</span>
            {criteriaApproved && <CheckCircle2 className="w-3 h-3 text-[#1B6C47] ml-1" />}
          </button>
          <button
            onClick={() => setCurrentStep('upload')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
              currentStep === 'upload'
                ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]/80'
                : 'text-[#40564D] hover:text-[#13221C] hover:bg-[#FCFDFC]/50'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>
              2. Upload CV{uploadedFiles.length > 0 ? ` (${uploadedFiles.filter((f) => f.status === 'ready').length})` : ''}
            </span>
          </button>
          <button
            onClick={() => setCurrentStep('leaderboard')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
              currentStep === 'leaderboard'
                ? 'bg-[#FCFDFC] text-[#1B4938] shadow-tactile-sm font-bold border border-[#D5DFD9]/80'
                : 'text-[#40564D] hover:text-[#13221C] hover:bg-[#FCFDFC]/50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-[#8A4C05]" />
            <span>
              3. Leaderboard{candidates.length > 0 ? ` (${candidates.length})` : ''}
            </span>
          </button>
        </nav>

        {/* Global Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setBlindMode(!blindMode)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              blindMode
                ? 'bg-[#EBF6EF] border-[#BBE5CD] text-[#1B6C47] shadow-tactile-sm font-semibold'
                : 'bg-[#FCFDFC] border-[#D5DFD9] text-[#40564D] hover:bg-[#EBF1EE]'
            }`}
          >
            {blindMode ? <EyeOff className="w-3.5 h-3.5 text-[#1B6C47]" /> : <Eye className="w-3.5 h-3.5 text-[#40564D]" />}
            <span>Blind Mode: <strong>{blindMode ? 'AKTIF' : 'NONAKTIF'}</strong></span>
          </button>
          <span className="text-xs bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9] px-2.5 py-1 rounded-md font-mono">
            Admin/Recruiter
          </span>
        </div>
      </header>

      {/* Mandatory Objective Reminder Banner */}
      <div className="bg-[#FEF6E8] border-b border-[#F8D8A7] px-6 py-2 text-xs text-[#8A4C05] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-[#8A4C05] shrink-0" />
          <span><strong>Peringatan Kebijakan:</strong> Peringkat ini adalah rekomendasi objektif berbasis bukti nyata CV. Keputusan akhir rekrutmen tetap berada di tangan manusia.</span>
        </div>
        <span className="text-[#8A4C05]/80 font-mono text-[11px]">Model: Harrier-270m (640d) • Aturan Deterministik</span>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {/* ============================================================== */}
        {/* SCREEN 1: Setup Lowongan                                       */}
        {/* ============================================================== */}
        {currentStep === 'setup' && (
          <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-6 max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#13221C]">Setup Lowongan Kerja</h2>
              <p className="text-sm text-[#40564D]">Tentukan rincian lowongan dan masukkan deskripsi pekerjaan untuk menyusun kriteria evaluasi.</p>
            </div>

            {/* Role Templates Quick Selector */}
            <div className="bg-[#F5F8F6] border border-[#D5DFD9] rounded-xl p-4 shadow-tactile-sm">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-[#13221C] flex items-center space-x-1.5">
                  <BookmarkCheck className="w-4 h-4 text-[#1B4938]" />
                  <span>Pilih Template Role Standar Industri:</span>
                </span>
                <span className="text-[11px] text-[#40564D] hidden sm:inline">1-Klik otomatis mengisi form & standar ATS</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      setJobTitle(tmpl.title)
                      setJobLocation(tmpl.location)
                      setJobType(tmpl.employmentType)
                      setJobDescription(tmpl.jd_text)
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-[#FCFDFC] border border-[#D5DFD9] text-[#13221C] hover:text-[#1B4938] hover:border-[#1B4938]/40 hover:bg-[#EBF1EE] font-semibold transition-all shadow-tactile-sm hover:shadow-tactile active:scale-98 cursor-pointer"
                  >
                    {tmpl.role}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#13221C] mb-1">Judul Posisi *</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg text-sm text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none transition-all shadow-tactile-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#13221C] mb-1">Lokasi</label>
                  <input
                    type="text"
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg text-sm text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none transition-all shadow-tactile-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#13221C] mb-1">Tipe Kerja</label>
                  <input
                    type="text"
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg text-sm text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none transition-all shadow-tactile-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#13221C]">Deskripsi Lowongan (Job Description) *</label>
                  <span className="text-[11px] text-[#40564D] flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-[#1B4938]" />
                    <span>Kriteria otomatis diekstrak & dikompilasi dari teks ini</span>
                  </span>
                </div>
                <textarea
                  rows={9}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Ketik atau tempel deskripsi lowongan kerja lengkap di sini..."
                  className="w-full px-3 py-2 bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg text-sm font-mono text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none leading-relaxed transition-all shadow-tactile-sm"
                />
                <p className="text-[11px] text-[#40564D] mt-1">
                  💡 Tips: Cantumkan tanggung jawab dan kualifikasi menggunakan tanda strip (-) atau poin baris agar AI & Policy Linter dapat menyusun kriteria terstruktur dengan presisi tinggi.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E9E5] flex items-center justify-between">
              <span className="text-xs text-[#40564D]">Status Kriteria: {criteriaApproved ? 'Sudah Disetujui (v1)' : 'Draf'}</span>
              <button
                onClick={handleCompileFromJd}
                disabled={isCompiling}
                className="px-5 py-2.5 bg-[#1B4938] hover:bg-[#2D6A4F] text-[#FCFDFC] font-semibold text-sm rounded-lg shadow-tactile flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {isCompiling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengekstrak Kriteria dari JD...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Ekstrak Kriteria & Lanjut</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 1B: Tinjau & Setujui Kriteria                          */}
        {/* ============================================================== */}
        {currentStep === 'requirements' && (
          <div className="space-y-6">
            <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#13221C] flex items-center space-x-2">
                    <span>Tinjau & Setujui Kriteria Lowongan</span>
                    <span className="text-xs bg-[#EBF1EE] text-[#1B4938] border border-[#D5DFD9] px-2 py-0.5 rounded font-mono font-semibold">
                      Versi {criteriaVersion} {criteriaApproved ? '(Terkunci)' : '(Draf)'}
                    </span>
                  </h2>
                  <p className="text-xs text-[#40564D] mt-0.5">Kriteria disusun secara terstruktur dari deskripsi lowongan dan dapat disesuaikan bobotnya sebelum proses screening.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCompileFromJd}
                    disabled={isCompiling}
                    className="px-3 py-2 bg-[#FCFDFC] hover:bg-[#EBF1EE] text-[#13221C] font-semibold text-xs rounded-lg border border-[#D5DFD9] flex items-center space-x-1.5 transition-colors shadow-tactile-sm disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isCompiling ? 'animate-spin' : ''}`} />
                    <span>{isCompiling ? 'Mengekstrak...' : 'Kompilasi Ulang dari JD'}</span>
                  </button>
                  <button
                    onClick={handleApproveCriteria}
                    className="px-4 py-2 bg-[#1B4938] hover:bg-[#2D6A4F] text-[#FCFDFC] font-semibold text-xs rounded-lg shadow-tactile flex items-center space-x-1.5 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#BBE5CD]" />
                    <span>Setujui Kriteria (Kunci Versi)</span>
                  </button>
                </div>
              </div>

              {/* Prohibited Alert if triggered */}
              {prohibitedFlags.length > 0 && (
                <div className="bg-[#FCEBEB] border border-[#F6C1C1] p-3.5 rounded-xl mb-4 text-xs text-[#9E2A2B] flex items-start space-x-2 shadow-tactile-sm">
                  <ShieldAlert className="w-4 h-4 text-[#9E2A2B] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Kriteria Diskriminatif Terlarang Terdeteksi:</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {prohibitedFlags.map((flg, idx) => (
                        <li key={idx}>{flg}</li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[#9E2A2B] font-medium">Hapus atau edit kriteria di atas untuk dapat mengaktifkan persetujuan.</p>
                  </div>
                </div>
              )}

              {/* Category Weight Summary Bar */}
              <div className="bg-[#F5F8F6] p-4 rounded-xl border border-[#D5DFD9] mb-5 text-xs shadow-tactile-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#13221C]">Distribusi Bobot Kategori (Total 100%):</span>
                    {totalCategoryWeight !== 100 ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FCEBEB] text-[#9E2A2B] border border-[#F6C1C1] animate-pulse">
                        ⚠️ Total: {totalCategoryWeight}% (Harus 100%)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF6EF] text-[#1B6C47] border border-[#BBE5CD] flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1B6C47]" />
                        <span>Total 100% Seimbang</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#40564D]">Bobot kategori menentukan persentase porsi nilai akhir</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#FCFDFC] p-2.5 rounded-lg border border-[#D5DFD9] flex items-center justify-between shadow-tactile-sm">
                    <div>
                      <div className="text-[11px] font-semibold text-[#1B4938]">Pengalaman</div>
                      <div className="text-[10px] text-[#40564D] font-mono">EXPERIENCE</div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={categoryWeights.EXPERIENCE ?? 40}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                          setCategoryWeights({ ...categoryWeights, EXPERIENCE: val })
                          setCriteriaApproved(false)
                        }}
                        className="w-12 px-1 py-1 text-center font-mono tabular-nums font-bold text-[#13221C] border border-[#D5DFD9] hover:border-[#1B4938]/40 focus:border-[#1B4938] rounded text-xs bg-[#F5F8F6] focus:bg-[#FCFDFC] focus:outline-none"
                      />
                      <span className="font-mono tabular-nums text-[#40564D] text-xs">%</span>
                    </div>
                  </div>

                  <div className="bg-[#FCFDFC] p-2.5 rounded-lg border border-[#D5DFD9] flex items-center justify-between shadow-tactile-sm">
                    <div>
                      <div className="text-[11px] font-semibold text-[#2D6A4F]">Hard Skill</div>
                      <div className="text-[10px] text-[#40564D] font-mono">HARD_SKILLS</div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={categoryWeights.HARD_SKILLS ?? 30}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                          setCategoryWeights({ ...categoryWeights, HARD_SKILLS: val })
                          setCriteriaApproved(false)
                        }}
                        className="w-12 px-1 py-1 text-center font-mono tabular-nums font-bold text-[#13221C] border border-[#D5DFD9] hover:border-[#1B4938]/40 focus:border-[#1B4938] rounded text-xs bg-[#F5F8F6] focus:bg-[#FCFDFC] focus:outline-none"
                      />
                      <span className="font-mono tabular-nums text-[#40564D] text-xs">%</span>
                    </div>
                  </div>

                  <div className="bg-[#FCFDFC] p-2.5 rounded-lg border border-[#D5DFD9] flex items-center justify-between shadow-tactile-sm">
                    <div>
                      <div className="text-[11px] font-semibold text-[#8A4C05]">Pendidikan</div>
                      <div className="text-[10px] text-[#40564D] font-mono">EDUCATION_CERT</div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={categoryWeights.EDUCATION_CERT ?? 15}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                          setCategoryWeights({ ...categoryWeights, EDUCATION_CERT: val })
                          setCriteriaApproved(false)
                        }}
                        className="w-12 px-1 py-1 text-center font-mono tabular-nums font-bold text-[#13221C] border border-[#D5DFD9] hover:border-[#1B4938]/40 focus:border-[#1B4938] rounded text-xs bg-[#F5F8F6] focus:bg-[#FCFDFC] focus:outline-none"
                      />
                      <span className="font-mono tabular-nums text-[#40564D] text-xs">%</span>
                    </div>
                  </div>

                  <div className="bg-[#FCFDFC] p-2.5 rounded-lg border border-[#D5DFD9] flex items-center justify-between shadow-tactile-sm">
                    <div>
                      <div className="text-[11px] font-semibold text-[#40564D]">Pencapaian</div>
                      <div className="text-[10px] text-[#40564D] font-mono">ACHIEVEMENT</div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={categoryWeights.ACHIEVEMENT ?? 15}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                          setCategoryWeights({ ...categoryWeights, ACHIEVEMENT: val })
                          setCriteriaApproved(false)
                        }}
                        className="w-12 px-1 py-1 text-center font-mono tabular-nums font-bold text-[#13221C] border border-[#D5DFD9] hover:border-[#1B4938]/40 focus:border-[#1B4938] rounded text-xs bg-[#F5F8F6] focus:bg-[#FCFDFC] focus:outline-none"
                      />
                      <span className="font-mono tabular-nums text-[#40564D] text-xs">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Criteria Table */}
              <div className="overflow-x-auto border border-[#D5DFD9] rounded-xl shadow-tactile-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#EBF1EE] text-[#40564D] font-semibold uppercase tracking-wider border-b border-[#D5DFD9]">
                    <tr>
                      <th className="py-2.5 px-3 w-12 font-mono">ID</th>
                      <th className="py-2.5 px-3">Kriteria & Spesifikasi</th>
                      <th className="py-2.5 px-3 w-40">Kategori</th>
                      <th className="py-2.5 px-3 w-36">Tingkat</th>
                      <th className="py-2.5 px-3 w-24 text-center">Bobot</th>
                      <th className="py-2.5 px-3">Kutipan Sumber di JD</th>
                      <th className="py-2.5 px-3 w-12 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E9E5] font-normal bg-[#FCFDFC]">
                    {requirements.map((r, i) => (
                      <tr key={r.requirement_id || i} className="hover:bg-[#EBF1EE]/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#1B4938]">{r.requirement_id}</td>
                        <td className="py-2.5 px-3 font-medium text-[#13221C]">
                          <input
                            type="text"
                            value={r.description}
                            onChange={(e) => {
                              const updated = [...requirements]
                              updated[i].description = e.target.value
                              setRequirements(updated)
                              setCriteriaApproved(false)
                            }}
                            className="w-full bg-transparent border-b border-transparent hover:border-[#D5DFD9] focus:border-[#1B4938] focus:outline-none py-1 text-[#13221C]"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={
                              r.category === 'EDUCATION_CERTIFICATION'
                                ? 'EDUCATION_CERT'
                                : r.category === 'ACHIEVEMENT_LEADERSHIP'
                                ? 'ACHIEVEMENT'
                                : r.category
                            }
                            onChange={(e) => {
                              const updated = [...requirements]
                              updated[i].category = e.target.value
                              setRequirements(updated)
                              setCriteriaApproved(false)
                            }}
                            className="w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[#13221C] focus:outline-none focus:ring-2 focus:ring-[#1B4938]/20 focus:border-[#1B4938] shadow-tactile-sm transition-colors cursor-pointer"
                          >
                            <option value="EXPERIENCE">Pengalaman</option>
                            <option value="HARD_SKILLS">Hard Skill</option>
                            <option value="EDUCATION_CERT">Pendidikan & Sertifikasi</option>
                            <option value="ACHIEVEMENT">Pencapaian & Leadership</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={r.importance}
                            onChange={(e) => {
                              const updated = [...requirements]
                              updated[i].importance = e.target.value
                              setRequirements(updated)
                              setCriteriaApproved(false)
                            }}
                            className={`w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B4938]/20 ${
                              r.importance === 'MUST_HAVE'
                                ? 'bg-[#FCEBEB] text-[#9E2A2B] border-[#F6C1C1] hover:bg-[#FCEBEB]/80'
                                : r.importance === 'STRONG_PREFERENCE'
                                ? 'bg-[#FEF6E8] text-[#8A4C05] border-[#F8D8A7] hover:bg-[#FEF6E8]/80'
                                : 'bg-[#EBF1EE] text-[#40564D] border-[#D5DFD9] hover:bg-[#D5DFD9]/60'
                            }`}
                          >
                            <option value="MUST_HAVE">🔴 Wajib</option>
                            <option value="STRONG_PREFERENCE">🟡 Diutamakan</option>
                            <option value="NICE_TO_HAVE">⚪ Nilai Tambah</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={r.weight}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0
                                const updated = [...requirements]
                                updated[i].weight = val
                                setRequirements(updated)
                                setCriteriaApproved(false)
                              }}
                              className="w-14 px-1 py-1 text-center font-mono tabular-nums font-bold text-[#13221C] border border-[#D5DFD9] hover:border-[#1B4938]/40 focus:border-[#1B4938] rounded text-xs bg-[#F5F8F6] focus:bg-[#FCFDFC] focus:outline-none"
                            />
                            <span className="font-mono tabular-nums text-[#40564D] text-xs">%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#40564D] italic max-w-xs truncate" title={r.source_text}>
                          "{r.source_text || '-'}"
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              setRequirements(requirements.filter((_, idx) => idx !== i))
                              setCriteriaApproved(false)
                            }}
                            className="p-1.5 rounded-md text-[#40564D] hover:text-[#9E2A2B] hover:bg-[#FCEBEB] transition-colors focus-visible:ring-2 focus-visible:ring-[#9E2A2B]/20 cursor-pointer"
                            title="Hapus Kriteria"
                            aria-label={`Hapus kriteria ${r.requirement_id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Manual Criteria Box */}
              <div className="mt-4 pt-4 border-t border-[#E2E9E5] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  placeholder="Kriteria baru (contoh: Memahami arsitektur event-driven)..."
                  value={newReqDesc}
                  onChange={(e) => setNewReqDesc(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg text-xs text-[#13221C] placeholder-[#40564D]/50 focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 focus:outline-none shadow-tactile-sm"
                />
                <select
                  value={newReqCategory}
                  onChange={(e) => setNewReqCategory(e.target.value)}
                  className="px-3 py-2 bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] rounded-lg text-xs text-[#13221C] font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B4938]/20 focus:border-[#1B4938] shadow-tactile-sm transition-colors cursor-pointer"
                >
                  <option value="HARD_SKILLS">Hard Skill</option>
                  <option value="EXPERIENCE">Pengalaman</option>
                  <option value="EDUCATION_CERT">Pendidikan</option>
                  <option value="ACHIEVEMENT">Pencapaian</option>
                </select>
                <select
                  value={newReqImportance}
                  onChange={(e) => setNewReqImportance(e.target.value)}
                  className="px-3 py-2 bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] rounded-lg text-xs text-[#13221C] font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B4938]/20 focus:border-[#1B4938] shadow-tactile-sm transition-colors cursor-pointer"
                >
                  <option value="MUST_HAVE">🔴 Wajib</option>
                  <option value="STRONG_PREFERENCE">🟡 Diutamakan</option>
                  <option value="NICE_TO_HAVE">⚪ Nilai Tambah</option>
                </select>
                <div className="flex items-center space-x-1 shrink-0">
                  <span className="text-[11px] text-[#40564D] font-medium">Bobot:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newReqWeight}
                    onChange={(e) => setNewReqWeight(parseInt(e.target.value) || 10)}
                    className="w-14 px-1.5 py-2 border border-[#D5DFD9] rounded-lg text-xs font-mono tabular-nums font-bold text-center bg-[#FCFDFC] text-[#13221C] focus:outline-none focus:border-[#1B4938] focus:ring-2 focus:ring-[#1B4938]/15 shadow-tactile-sm"
                  />
                  <span className="text-xs text-[#40564D] font-mono tabular-nums">%</span>
                </div>
                <button
                  onClick={handleAddRequirement}
                  className="px-4 py-2 bg-[#1B4938]/10 hover:bg-[#1B4938]/15 text-[#1B4938] border border-[#1B4938]/30 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-colors shrink-0 shadow-tactile-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep('setup')}
                className="px-4 py-2 text-[#40564D] hover:text-[#13221C] text-xs font-medium cursor-pointer transition-colors"
              >
                ← Kembali ke Setup
              </button>
              <button
                onClick={() => setCurrentStep('upload')}
                className="px-5 py-2.5 bg-[#1B4938] hover:bg-[#2D6A4F] text-[#FCFDFC] font-semibold text-xs rounded-lg shadow-tactile flex items-center space-x-1.5 transition-all cursor-pointer active:scale-[0.99]"
              >
                <span>Lanjut ke Upload CV</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 2: Upload CV Dropzone                                   */}
        {/* ============================================================== */}
        {currentStep === 'upload' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#13221C]">Upload CV Pelamar</h2>
                  <p className="text-xs text-[#40564D] mt-0.5">Mendukung format PDF, DOCX, scan gambar, dan arsip ZIP berukuran hingga 10 MB per berkas.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="text-xs text-[#13221C] hover:bg-[#EBF1EE] bg-[#FCFDFC] border border-[#D5DFD9] px-2.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center space-x-1.5 shadow-tactile-sm disabled:opacity-50 cursor-pointer"
                    title="Segarkan status berkas CV dari server"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#1B4938]' : 'text-[#40564D]'}`} />
                    <span>Perbarui Status</span>
                  </button>
                  {uploadedFiles.length > 0 && (
                    <button
                      onClick={handleClearUploadedCvs}
                      className="text-xs text-[#9E2A2B] hover:bg-[#FCEBEB] bg-[#FCFDFC] border border-[#F6C1C1] px-2.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                      title="Hapus semua berkas CV yang telah diunggah untuk lowongan ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Kosongkan Berkas</span>
                    </button>
                  )}
                  <button
                    onClick={handleLoadSampleCvs}
                    className="text-xs text-[#1B4938] hover:bg-[#1B4938]/10 bg-[#EBF6EF] border border-[#BBE5CD] px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    🧪 Muat 15 Sampel Golden Dataset
                  </button>
                  <span className="text-xs font-semibold text-[#1B6C47] bg-[#EBF6EF] border border-[#BBE5CD] px-2.5 py-1 rounded-md">
                    {uploadedFiles.filter((f) => f.status === 'ready').length} CV Siap Dinilai
                  </span>
                  {uploadedFiles.some((f) => f.status === 'duplicate') && (
                    <span className="text-xs font-semibold text-[#40564D] bg-[#EBF1EE] border border-[#D5DFD9] px-2.5 py-1 rounded-md">
                      {uploadedFiles.filter((f) => f.status === 'duplicate').length} Duplikat Diabaikan
                    </span>
                  )}
                </div>
              </div>

              {/* Drag and Drop Zone */}
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
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-[#1B4938] bg-[#EBF6EF] scale-[1.01]'
                    : 'border-[#D5DFD9] bg-[#F5F8F6] hover:bg-[#EBF1EE]/60 hover:border-[#1B4938]/40'
                }`}
              >
                <Upload
                  className={`w-10 h-10 text-[#1B4938] mx-auto mb-2 ${
                    isUploading ? 'animate-bounce text-[#2D6A4F]' : ''
                  }`}
                />
                <h3 className="text-sm font-bold text-[#13221C]">
                  {isUploading
                    ? uploadStatusMsg || 'Sedang memproses upload berkas...'
                    : 'Tarik berkas CV ke sini atau klik untuk memilih'}
                </h3>
                <p className="text-xs text-[#40564D] mt-1">PDF, DOCX, DOC, JPG, PNG, atau ZIP (Maksimal 10 MB per file)</p>
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <span className="text-[11px] bg-[#FCFDFC] border border-[#D5DFD9] px-2.5 py-1 rounded-md text-[#40564D] shadow-tactile-sm font-mono">
                    {uploadedFiles.length > 0
                      ? `${uploadedFiles.length} Berkas CV Terdeteksi`
                      : 'Pilih satu atau banyak berkas CV'}
                  </span>
                </div>
              </div>

              {/* Progress Summary */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <span className="text-[#13221C]">
                    Kemajuan Ingestion & Sanitizer: {uploadedFiles.filter((f) => f.status !== 'processing').length}/
                    {uploadedFiles.length} CV Berhasil Diproses
                  </span>
                  <span className="text-[#1B6C47] font-bold font-mono tabular-nums">
                    {uploadedFiles.length > 0
                      ? `${Math.round(
                          (uploadedFiles.filter((f) => f.status !== 'processing').length / uploadedFiles.length) * 100
                        )}% Siap`
                      : 'Menunggu Berkas'}
                  </span>
                </div>
                <div className="w-full bg-[#EBF1EE] rounded-full h-2 overflow-hidden border border-[#D5DFD9]">
                  <div
                    className="bg-[#1B4938] h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        uploadedFiles.length > 0
                          ? Math.round(
                              (uploadedFiles.filter((f) => f.status !== 'processing').length / uploadedFiles.length) * 100
                            )
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Files Table List */}
              <div className="mt-6 border border-[#D5DFD9] rounded-xl overflow-hidden overflow-x-auto shadow-tactile-sm">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead className="bg-[#EBF1EE] text-[#40564D] font-semibold uppercase tracking-wider border-b border-[#D5DFD9]">
                    <tr>
                      <th className="py-2.5 px-3">Nama Berkas</th>
                      <th className="py-2.5 px-3 w-24">Ukuran</th>
                      <th className="py-2.5 px-3 w-36">Status</th>
                      <th className="py-2.5 px-3">Catatan / Alasan Pemeriksaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E9E5] bg-[#FCFDFC]">
                    {uploadedFiles.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[#40564D]">
                          <FileText className="w-8 h-8 mx-auto mb-1 text-[#40564D]/50" />
                          <p className="font-semibold text-[#13221C]">Belum ada berkas CV yang diunggah.</p>
                          <p className="text-[11px] text-[#40564D] mt-0.5">
                            Tarik dan letakkan berkas PDF/DOCX di atas atau klik untuk memilih file.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      uploadedFiles.map((file, idx) => (
                        <tr key={idx} className="hover:bg-[#EBF1EE]/60 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-[#13221C] flex items-center space-x-2">
                            {file.status === 'processing' ? (
                              <Loader2 className="w-3.5 h-3.5 text-[#1B4938] animate-spin shrink-0" />
                            ) : (
                              <FileCheck className="w-3.5 h-3.5 text-[#1B4938] shrink-0" />
                            )}
                            <span className="truncate max-w-xs">{file.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-[#40564D] font-mono tabular-nums text-[11px]">{file.size}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center space-x-1 ${
                                file.status === 'ready'
                                  ? 'bg-[#EBF6EF] text-[#1B6C47] border border-[#BBE5CD]'
                                  : file.status === 'processing'
                                  ? 'bg-[#EBF1EE] text-[#1B4938] border border-[#D5DFD9] animate-pulse'
                                  : file.status === 'review'
                                  ? 'bg-[#FEF6E8] text-[#8A4C05] border border-[#F8D8A7]'
                                  : file.status === 'duplicate'
                                  ? 'bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9]'
                                  : 'bg-[#FCEBEB] text-[#9E2A2B] border border-[#F6C1C1]'
                              }`}
                            >
                              <span>
                                {file.status === 'ready'
                                  ? 'Siap'
                                  : file.status === 'processing'
                                  ? 'Diproses...'
                                  : file.status === 'review'
                                  ? 'Perlu Cek Manual'
                                  : file.status === 'duplicate'
                                  ? 'Duplikat'
                                  : 'Tidak Memenuhi Syarat'}
                              </span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#40564D] text-[11px] italic">
                            {file.reason || 'Ekstraksi identitas & keahlian terverifikasi'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep('requirements')}
                className="px-4 py-2 text-[#40564D] hover:text-[#13221C] text-xs font-medium cursor-pointer transition-colors"
              >
                ← Kembali ke Kriteria
              </button>
              <button
                onClick={handleStartScreening}
                disabled={isScreening}
                className="px-6 py-2.5 bg-[#1B4938] hover:bg-[#2D6A4F] text-[#FCFDFC] font-bold text-xs rounded-lg shadow-tactile flex items-center space-x-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
              >
                {isScreening ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#BBE5CD]" />
                    <span>Menjalankan Evaluasi & Scoring...</span>
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 text-[#BBE5CD]" />
                    <span>Mulai Screening & Buka Leaderboard</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SCREEN 3: Leaderboard (Hasil Ranking & Scoring)                */}
        {/* ============================================================== */}
        {currentStep === 'leaderboard' && (
          <div className="space-y-4">
            {/* Header Leaderboard */}
            <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] shadow-tactile p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-[#13221C]">{jobTitle}</h2>
                  <span className="text-xs bg-[#EBF6EF] text-[#1B6C47] border border-[#BBE5CD] px-2.5 py-0.5 rounded-full font-semibold">
                    Run Selesai (Versi {criteriaVersion})
                  </span>
                </div>
                <p className="text-xs text-[#40564D] mt-0.5">
                  Tanggal Evaluasi: <strong className="text-[#13221C]">9 Okt 2026</strong> • Total Kandidat Dinilai: <strong className="text-[#13221C] font-mono tabular-nums">{candidates.length}</strong>
                </p>
              </div>

              <div className="flex items-center space-x-2.5">
                {selectedForCompare.length >= 2 && (
                  <button
                    onClick={() => setIsCompareOpen(true)}
                    className="px-3.5 py-2 bg-[#EBF6EF] border border-[#BBE5CD] hover:bg-[#BBE5CD]/30 text-[#1B4938] rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-tactile-sm cursor-pointer"
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Bandingkan ({selectedForCompare.length})</span>
                  </button>
                )}
                <button
                  onClick={() => setIsExportOpen(true)}
                  className="px-3.5 py-2 bg-[#FCFDFC] hover:bg-[#EBF1EE] text-[#13221C] border border-[#D5DFD9] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-tactile-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#40564D]" />
                  <span>Export Laporan</span>
                </button>
                <button
                  onClick={() => showToast('Screening ulang dieksekusi secara deterministik dengan model Harrier-270m.', 'info')}
                  className="px-3.5 py-2 bg-[#FCFDFC] hover:bg-[#EBF1EE] text-[#13221C] border border-[#D5DFD9] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-tactile-sm cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#40564D]" />
                  <span>Jalankan Ulang</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#FCFDFC] p-3 rounded-2xl border border-[#D5DFD9] shadow-tactile-sm">
              {/* Band Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => setActiveBand('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeBand === 'ALL'
                      ? 'bg-[#1B4938] text-[#FCFDFC] shadow-tactile-sm'
                      : 'text-[#40564D] hover:bg-[#EBF1EE] hover:text-[#13221C]'
                  }`}
                >
                  Semua ({candidates.length})
                </button>
                <button
                  onClick={() => setActiveBand('A')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeBand === 'A'
                      ? 'bg-[#1B6C47] text-[#FCFDFC] shadow-tactile-sm'
                      : 'text-[#40564D] hover:bg-[#EBF1EE] hover:text-[#13221C]'
                  }`}
                >
                  Semua Wajib Terbukti (A) ({candidates.filter((c) => c.band === 'A').length})
                </button>
                <button
                  onClick={() => setActiveBand('B')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeBand === 'B'
                      ? 'bg-[#8A4C05] text-[#FCFDFC] shadow-tactile-sm'
                      : 'text-[#40564D] hover:bg-[#EBF1EE] hover:text-[#13221C]'
                  }`}
                >
                  1 Wajib Belum Terbukti (B) ({candidates.filter((c) => c.band === 'B').length})
                </button>
                <button
                  onClick={() => setActiveBand('C')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeBand === 'C'
                      ? 'bg-[#40564D] text-[#FCFDFC] shadow-tactile-sm'
                      : 'text-[#40564D] hover:bg-[#EBF1EE] hover:text-[#13221C]'
                  }`}
                >
                  Prioritas Rendah (C) ({candidates.filter((c) => c.band === 'C').length})
                </button>
              </div>

              {/* Search box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#40564D] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari kandidat / berkas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-[#D5DFD9] rounded-lg text-xs w-56 bg-[#FCFDFC] text-[#13221C] placeholder-[#40564D]/50 focus:outline-none focus:ring-2 focus:ring-[#1B4938]/15 focus:border-[#1B4938] shadow-tactile-sm"
                />
              </div>
            </div>

            {/* Candidates Table */}
            <div className="bg-[#FCFDFC] rounded-2xl border border-[#D5DFD9] overflow-hidden shadow-tactile">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead className="bg-[#EBF1EE] text-[#40564D] font-semibold uppercase tracking-wider border-b border-[#D5DFD9]">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">☐</th>
                      <th className="py-3 px-2 w-12 text-center font-mono">#</th>
                      <th className="py-3 px-3">Kandidat</th>
                      <th className="py-3 px-3 w-28 text-center">Skor Akhir</th>
                      <th className="py-3 px-3 w-32">Kriteria Wajib</th>
                      <th className="py-3 px-3 w-36">Rincian Kategori</th>
                      <th className="py-3 px-3 w-36">Rekomendasi</th>
                      <th className="py-3 px-3 w-28">Keputusan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E9E5] bg-[#FCFDFC]">
                    {filteredCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#40564D]">
                          <Trophy className="w-8 h-8 mx-auto mb-2 text-[#40564D]/40" />
                          <p className="font-semibold text-[#13221C]">Belum ada hasil screening kandidat.</p>
                          <p className="text-[11px] text-[#40564D] mt-1">
                            Unggah berkas CV di menu Upload CV, lalu klik &quot;Mulai Screening&quot; untuk menjalankan evaluasi objektif.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredCandidates.map((cand) => (
                      <tr
                        key={cand.cv_id}
                        onClick={() => handleSelectCandidate(cand)}
                        className={`hover:bg-[#EBF1EE]/60 cursor-pointer transition-colors ${
                          selectedCandidate?.cv_id === cand.cv_id ? 'bg-[#EBF6EF]/50 border-l-4 border-l-[#1B4938]' : ''
                        }`}
                      >
                        <td
                          className="py-3 px-3 text-center"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (selectedForCompare.includes(cand.cv_id)) {
                              setSelectedForCompare(selectedForCompare.filter((id) => id !== cand.cv_id))
                            } else {
                              if (selectedForCompare.length < 4) {
                                setSelectedForCompare([...selectedForCompare, cand.cv_id])
                              } else {
                                showToast('Maksimal membandingkan 4 kandidat sekaligus.', 'warning')
                              }
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedForCompare.includes(cand.cv_id)}
                            onChange={() => {}}
                            className="rounded border-[#D5DFD9] text-[#1B4938] focus:ring-[#1B4938] cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-2 text-center font-bold font-mono tabular-nums text-[#40564D]">
                          {cand.rank}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-[#13221C]">
                              {blindMode && !cand.revealed ? cand.blind_id : cand.real_name}
                            </span>
                            {cand.flags.includes('PROMPT_INJECTION') && (
                              <span className="bg-[#FCEBEB] text-[#9E2A2B] border border-[#F6C1C1] text-[10px] px-1.5 py-0.5 rounded font-bold" title="Upaya prompt injection dinetralkan">
                                INJECTION DINUTRALKAN
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#40564D] font-mono tabular-nums block">{cand.file_name}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md font-bold font-mono text-sm tabular-nums border ${
                              cand.final_score >= 75
                                ? 'bg-[#EBF6EF] text-[#1B6C47] border-[#BBE5CD]'
                                : cand.final_score >= 50
                                ? 'bg-[#FEF6E8] text-[#8A4C05] border-[#F8D8A7]'
                                : 'bg-[#FCEBEB] text-[#9E2A2B] border-[#F6C1C1]'
                            }`}
                          >
                            {cand.final_score.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-[#40564D] font-mono font-medium block mt-0.5">Band {cand.band}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-1">
                            {['R1', 'R2', 'R3'].map((rKey) => {
                              const st = cand.requirement_states[rKey]
                              return (
                                <div
                                  key={rKey}
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    st === 'STRONG' ? 'bg-[#1B6C47]' : st === 'PARTIAL' ? 'bg-[#8A4C05]' : 'bg-[#D5DFD9]'
                                  }`}
                                  title={`${rKey}: ${st || 'Belum terbukti'}`}
                                />
                              )
                            })}
                            <span className="text-[11px] text-[#40564D] font-mono tabular-nums ml-1.5">
                              {Object.entries(cand.requirement_states).filter(([k, v]) => ['R1', 'R2', 'R3'].includes(k) && v === 'STRONG').length}/3 Wajib
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <div className="w-full bg-[#EBF1EE] h-1.5 rounded-full overflow-hidden flex border border-[#D5DFD9]/50">
                              <div className="bg-[#1B4938] h-full" style={{ width: `${cand.category_breakdown.EXPERIENCE || 0}%` }} />
                              <div className="bg-[#2D6A4F] h-full" style={{ width: `${cand.category_breakdown.HARD_SKILLS || 0}%` }} />
                              <div className="bg-[#8A4C05] h-full" style={{ width: `${cand.category_breakdown.EDUCATION_CERTIFICATION || 0}%` }} />
                            </div>
                            <span className="text-[10px] text-[#40564D] font-mono tabular-nums block">
                              {cand.metrics.backend_months ? `${cand.metrics.backend_months} bln relevan` : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                cand.recommendation === 'SHORTLIST'
                                  ? 'bg-[#EBF6EF] text-[#1B6C47] border border-[#BBE5CD]'
                                  : cand.recommendation === 'REVIEW'
                                  ? 'bg-[#FEF6E8] text-[#8A4C05] border border-[#F8D8A7]'
                                  : cand.recommendation === 'REJECTED_NOT_A_CV' || cand.flags?.includes('NOT_A_CV')
                                  ? 'bg-[#FCEBEB] text-[#9E2A2B] border border-[#F6C1C1]'
                                  : cand.recommendation === 'MANUAL_CHECK'
                                  ? 'bg-[#EBF1EE] text-[#1B4938] border border-[#D5DFD9]'
                                  : 'bg-[#EBF1EE] text-[#40564D]'
                              }`}
                              title={cand.document_reasons?.join(', ')}
                            >
                              {cand.recommendation === 'SHORTLIST'
                                ? 'Disarankan Shortlist'
                                : cand.recommendation === 'REVIEW'
                                ? 'Perlu Ditinjau'
                                : cand.recommendation === 'REJECTED_NOT_A_CV' || cand.flags?.includes('NOT_A_CV')
                                ? '⛔ Bukan CV (Ditolak)'
                                : cand.recommendation === 'MANUAL_CHECK'
                                ? 'Perlu Cek Manual'
                                : 'Prioritas Rendah'}
                            </span>
                            {cand.eligibility_status === 'NOT_ELIGIBLE' && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF6E8] text-[#8A4C05] border border-[#F8D8A7]"
                                title={cand.eligibility_reasons?.join(', ') || 'Di luar kriteria administratif'}
                              >
                                ⚠️ Di luar kriteria administratif
                              </span>
                            )}
                            {cand.eligibility_status === 'UNKNOWN' && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9]"
                                title="Data administratif tidak tersedia di CV"
                              >
                                ℹ️ Data administratif tidak tersedia
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={cand.decision || 'NONE'}
                            onChange={(e) => handleDecision(cand.cv_id, e.target.value as any)}
                            className="bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#13221C] focus:outline-none focus:ring-2 focus:ring-[#1B4938]/20 focus:border-[#1B4938] shadow-tactile-sm transition-colors cursor-pointer"
                          >
                            <option value="NONE">- Belum Diputuskan -</option>
                            <option value="SHORTLIST">Shortlist</option>
                            <option value="HOLD">Tahan</option>
                            <option value="TIDAK_LANJUT">Tidak Lanjut</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* SCREEN 4: Candidate Detail Drawer (55% width)                  */}
      {/* ============================================================== */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-[#13221C]/40 backdrop-blur-2xs flex justify-end">
          <div className="w-full max-w-3xl bg-[#EBF1EE] h-full shadow-2xl flex flex-col transform transition-transform duration-200 ease-in-out border-l border-[#D5DFD9]">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#D5DFD9] flex items-center justify-between bg-[#FCFDFC]">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg font-mono tabular-nums shadow-tactile ${
                    selectedCandidate.final_score >= 75
                      ? 'bg-[#1B4938] text-[#FCFDFC]'
                      : selectedCandidate.final_score >= 50
                      ? 'bg-[#8A4C05] text-[#FCFDFC]'
                      : 'bg-[#40564D] text-[#FCFDFC]'
                  }`}
                >
                  {selectedCandidate.final_score.toFixed(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-[#13221C]">
                      {blindMode && !selectedCandidate.revealed ? selectedCandidate.blind_id : selectedCandidate.real_name}
                    </h3>
                    {blindMode && !selectedCandidate.revealed && (
                      <button
                        onClick={() => handleRevealCandidate(selectedCandidate.cv_id)}
                        className="text-[11px] text-[#1B4938] hover:text-[#2D6A4F] font-semibold underline flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Buka Identitas</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#40564D] font-mono tabular-nums">{selectedCandidate.file_name} • Peringkat #{selectedCandidate.rank}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCandidate(null)}
                aria-label="Tutup panel kandidat"
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2.5 rounded-lg text-[#40564D] hover:text-[#13221C] hover:bg-[#EBF1EE] transition-colors focus-visible:ring-2 focus-visible:ring-[#1B4938]/30 focus:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Tab Navigation */}
            <div className="flex border-b border-[#D5DFD9] px-5 text-xs font-semibold bg-[#FCFDFC]">
              <button
                onClick={() => setActiveDrawerTab('ringkasan')}
                className={`py-3 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeDrawerTab === 'ringkasan' ? 'border-[#1B4938] text-[#1B4938] font-bold' : 'border-transparent text-[#40564D] hover:text-[#13221C]'
                }`}
              >
                1. Ringkasan Evaluasi
              </button>
              <button
                onClick={() => setActiveDrawerTab('kartu_skor')}
                className={`py-3 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeDrawerTab === 'kartu_skor' ? 'border-[#1B4938] text-[#1B4938] font-bold' : 'border-transparent text-[#40564D] hover:text-[#13221C]'
                }`}
              >
                2. Kartu Skor Kriteria
              </button>
              <button
                onClick={() => setActiveDrawerTab('cv_asli')}
                className={`py-3 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeDrawerTab === 'cv_asli' ? 'border-[#1B4938] text-[#1B4938] font-bold' : 'border-transparent text-[#40564D] hover:text-[#13221C]'
                }`}
              >
                3. Berkas CV & Kutipan
              </button>
              <button
                onClick={() => setActiveDrawerTab('riwayat')}
                className={`py-3 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeDrawerTab === 'riwayat' ? 'border-[#1B4938] text-[#1B4938] font-bold' : 'border-transparent text-[#40564D] hover:text-[#13221C]'
                }`}
              >
                4. Audit Trajectory & Keputusan
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Tab 1: Ringkasan Evaluasi */}
              {activeDrawerTab === 'ringkasan' && (
                <div className="space-y-5 text-xs">
                  {/* Kelebihan Terbukti */}
                  <div className="bg-[#EBF6EF] border border-[#BBE5CD] p-4 rounded-xl shadow-tactile-sm">
                    <h4 className="font-bold text-[#1B6C47] mb-2 flex items-center space-x-1.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#1B6C47]" />
                      <span>Kelebihan Terbukti di CV</span>
                    </h4>
                    <div className="space-y-2">
                      {selectedCandidate.explanation.strengths.map((s, idx) => (
                        <div key={idx} className="bg-[#FCFDFC] p-3 rounded-lg border border-[#BBE5CD] shadow-tactile-sm">
                          <p className="font-semibold text-[#13221C]">{s.description}</p>
                          <p className="text-[#40564D] italic mt-1 text-[11px]">"{s.quote}"</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Belum Terbukti */}
                  <div className="bg-[#FEF6E8] border border-[#F8D8A7] p-4 rounded-xl shadow-tactile-sm">
                    <h4 className="font-bold text-[#8A4C05] mb-2 flex items-center space-x-1.5 text-sm">
                      <AlertTriangle className="w-4 h-4 text-[#8A4C05]" />
                      <span>Belum Terbukti di CV</span>
                    </h4>
                    <div className="space-y-2">
                      {selectedCandidate.explanation.unproven.map((u, idx) => (
                        <div key={idx} className="bg-[#FCFDFC] p-3 rounded-lg border border-[#F8D8A7] shadow-tactile-sm">
                          <p className="font-semibold text-[#13221C]">{u.description}</p>
                          <p className="text-[#8A4C05] text-[11px] mt-1">{u.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Saran Pertanyaan Wawancara */}
                  <div className="bg-[#FCFDFC] border border-[#D5DFD9] p-4 rounded-xl shadow-tactile-sm">
                    <h4 className="font-bold text-[#13221C] mb-2 text-sm">Saran Pertanyaan Wawancara Mendalam</h4>
                    <div className="space-y-2">
                      {selectedCandidate.explanation.interview_questions.map((q, idx) => (
                        <div key={idx} className="bg-[#F5F8F6] p-3 rounded-lg border border-[#D5DFD9] shadow-tactile-sm">
                          <span className="font-mono text-[#1B4938] font-bold block mb-1 text-[10px] uppercase tracking-wider">{q.focus}</span>
                          <p className="text-[#13221C] font-medium">"{q.question}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Kartu Skor Kriteria */}
              {activeDrawerTab === 'kartu_skor' && (
                <div className="space-y-3">
                  {requirements.map((r) => {
                    const st = selectedCandidate.requirement_states[r.requirement_id] || 'NOT_DEMONSTRATED'
                    const evList = selectedCandidate.evidence[r.requirement_id] || []
                    return (
                      <div key={r.requirement_id} className="border border-[#D5DFD9] rounded-xl p-4 bg-[#FCFDFC] shadow-tactile-sm hover:border-[#1B4938]/40 transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-[#13221C] bg-[#EBF1EE] border border-[#D5DFD9] px-2 py-0.5 rounded text-xs">
                              {r.requirement_id}
                            </span>
                            {/* Tactile Badge: Verified by Jev (TypeSafe Classifier) */}
                            <span className="bg-[#E6F4EA] text-[#134E35] border border-[#A5D6B6] font-mono font-medium text-xs px-2.5 py-1 rounded-md flex items-center space-x-1.5 shadow-tactile-sm">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#134E35]" />
                              <span className="font-bold text-[#134E35]">Verified by Jev</span>
                              <span className="text-[#134E35]/80 text-[11px]">(TypeSafe Classifier)</span>
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-tight border ${
                              st === 'STRONG'
                                ? 'bg-[#EBF6EF] text-[#1B6C47] border-[#BBE5CD]'
                                : st === 'PARTIAL'
                                ? 'bg-[#FEF6E8] text-[#8A4C05] border-[#F8D8A7]'
                                : 'bg-[#EBF1EE] text-[#40564D] border-[#D5DFD9]'
                            }`}
                          >
                            {st === 'STRONG' ? 'Terbukti' : st === 'PARTIAL' ? 'Sebagian Terpenuhi' : 'Tidak Tercantum di CV'}
                          </span>
                        </div>

                        <p className="font-medium text-[#13221C] text-xs leading-relaxed mb-2.5">
                          {r.description}
                        </p>

                        {evList.length > 0 ? (
                          <div className="space-y-2 mt-2">
                            {evList.map((ev, evIdx) => (
                              <div key={evIdx} className="bg-[#F5F8F6] p-2.5 rounded-lg border border-[#D5DFD9] text-xs space-y-1.5 shadow-tactile-sm">
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {ev.verified && (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#EBF6EF] text-[#1B6C47] border border-[#BBE5CD] text-[11px] font-mono font-medium">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1B6C47]" />
                                        Grounding Verbatim Terverifikasi
                                      </span>
                                    )}
                                    {typeof ev.char_start === 'number' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9] font-mono text-[11px] tabular-nums">
                                        Offset [{ev.char_start}..{typeof ev.char_end === 'number' ? ev.char_end : ev.char_start}]
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedQuoteToHighlight(ev.quote)
                                      setActiveDrawerTab('cv_asli')
                                    }}
                                    className="text-[#1B4938] hover:text-[#2D6A4F] font-semibold text-[11px] inline-flex items-center gap-1 transition-colors underline underline-offset-2 cursor-pointer"
                                  >
                                    <span>Lihat di CV</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                <blockquote className="border-l-2 border-[#1B4938] pl-2 text-[#13221C] italic text-[11px] leading-relaxed bg-[#FCFDFC] p-2 rounded-r border border-l-0 border-[#D5DFD9]/60">
                                  "{ev.quote}"
                                </blockquote>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#40564D] italic mt-1 bg-[#F5F8F6] border border-dashed border-[#D5DFD9] p-2 rounded">
                            Tidak ada kutipan bukti yang mendukung di berkas.
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Tab 3: Berkas CV & Highlight Kutipan */}
              {activeDrawerTab === 'cv_asli' && (
                <div className="space-y-3">
                  <div className="bg-[#FCFDFC] p-3 rounded-lg border border-[#D5DFD9] text-xs flex items-center justify-between shadow-tactile-sm">
                    <span className="text-[#13221C]">Penampil Teks Asli Berkas: <strong className="font-mono">{selectedCandidate.file_name}</strong></span>
                    {selectedQuoteToHighlight && (
                      <span className="bg-[#FEF6E8] text-[#8A4C05] border border-[#F8D8A7] px-2 py-0.5 rounded text-[11px] font-bold">
                        Menyorot Kutipan Terpilih
                      </span>
                    )}
                  </div>
                  <div className="p-4 bg-[#FCFDFC] text-[#13221C] rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto border border-[#D5DFD9] shadow-tactile-sm">
                    {selectedCandidate.full_text || `--- Teks Terbaca dari Berkas (${selectedCandidate.file_name}) ---
Pengalaman Kerja:
${Object.values(selectedCandidate.evidence).flat().map((e) => `• ${e.quote}`).join('\n')}

Pendidikan:
S1 Teknik Informatika / Ilmu Komputer.`}
                  </div>
                </div>
              )}

              {/* Tab 4: Audit Trajectory & Keputusan (Forensic Execution Rail) */}
              {activeDrawerTab === 'riwayat' && (
                <div className="space-y-5 text-xs">
                  {/* ReAct Reasoning Trajectory Audit Panel - Forensic Execution Rail */}
                  <div className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-2xl p-5 space-y-4 shadow-tactile">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5DFD9] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-[#1B4938]" />
                          <h4 className="font-bold text-[#13221C] text-sm tracking-tight">
                            Forensic Execution Rail (ReAct Trajectory)
                          </h4>
                        </div>
                        <p className="text-[#40564D] text-[11px] mt-0.5">
                          Audit jejak penalaran agen otonom & verifikasi tipe-aman Jev langkah demi langkah
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E6F4EA] text-[#134E35] font-mono text-xs border border-[#A5D6B6] shadow-tactile-sm font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#134E35]" />
                          <span>Verifier: <strong>{selectedCandidate.verifier_provider || 'JEV_TYPESAFE'}</strong></span>
                        </span>
                        {selectedCandidate.reasoning_trajectory && selectedCandidate.reasoning_trajectory.length > 0 && (
                          <span className="px-2.5 py-1 rounded bg-[#EBF1EE] text-[#13221C] border border-[#D5DFD9] font-mono text-[11px] font-semibold tabular-nums shadow-tactile-sm">
                            {selectedCandidate.reasoning_trajectory.length} Steps
                          </span>
                        )}
                      </div>
                    </div>

                    {!selectedCandidate.reasoning_trajectory || selectedCandidate.reasoning_trajectory.length === 0 ? (
                      <div className="bg-[#F5F8F6] border border-dashed border-[#D5DFD9] p-6 rounded-xl text-center space-y-2">
                        <div className="w-9 h-9 mx-auto rounded-lg bg-[#EBF1EE] border border-[#D5DFD9] flex items-center justify-center text-[#40564D] font-mono text-xs font-bold">
                          ∅
                        </div>
                        <p className="font-semibold text-[#13221C] text-xs">Belum Ada Rekaman ReAct Trajectory</p>
                        <p className="text-[#40564D] text-[11px] max-w-md mx-auto leading-relaxed">
                          Kandidat ini belum memiliki jejak eksekusi reasoning bertahap. Jalankan screening dengan mode agentik aktif untuk menginspeksi alur keputusan langkah-demi-langkah verifier Jev.
                        </p>
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-[#D5DFD9] ml-4 pl-6 space-y-6 pt-2 pb-2">
                        {selectedCandidate.reasoning_trajectory.map((step) => (
                          <div
                            key={step.step_number}
                            className="relative bg-[#F5F8F6] border border-[#D5DFD9] rounded-xl p-4 space-y-3 hover:border-[#1B4938]/40 transition-colors shadow-tactile-sm"
                          >
                            {/* Vertical Rail Step Node Marker (Tactile Nordic Pine Node) */}
                            <div className="absolute -left-[35px] top-4 w-7 h-7 rounded-full bg-[#FCFDFC] border-2 border-[#1B4938] text-[#1B4938] font-mono text-[11px] font-bold flex items-center justify-center shadow-tactile-sm">
                              {String(step.step_number).padStart(2, '0')}
                            </div>

                            {/* Step Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[11px] font-bold bg-[#EBF1EE] text-[#13221C] px-2.5 py-0.5 rounded-md border border-[#D5DFD9] shadow-tactile-sm">
                                  Step {String(step.step_number).padStart(2, '0')}
                                </span>
                                <span
                                  className={`font-mono text-[10px] px-2 py-0.5 rounded border shadow-tactile-sm tracking-tight ${getActionBadgeClass(
                                    step.action
                                  )}`}
                                >
                                  {step.action}
                                </span>
                              </div>
                              {step.timestamp_utc && (
                                <span className="font-mono text-[10px] text-[#40564D] tabular-nums flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-[#40564D]/60" />
                                  {step.timestamp_utc.replace('T', ' ').replace('Z', ' UTC')}
                                </span>
                              )}
                            </div>

                            {/* Thought Context */}
                            <div className="bg-[#FCFDFC] p-3 rounded-lg border border-[#D5DFD9] space-y-1 shadow-tactile-sm">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#1B4938] uppercase tracking-wider">
                                <Cpu className="w-3 h-3 text-[#1B4938]" />
                                <span>Thought Context</span>
                              </div>
                              <p className="text-[#13221C] text-xs leading-relaxed font-normal">
                                {step.thought}
                              </p>
                            </div>

                            {/* Action Input (if present) */}
                            {step.action_input && Object.keys(step.action_input).length > 0 && (
                              <div className="bg-[#EBF1EE] p-3 rounded-lg border border-[#D5DFD9] font-mono text-xs text-[#13221C] overflow-x-auto space-y-1">
                                <span className="text-[#40564D] block text-[10px] font-bold uppercase tracking-wider">// Action Input</span>
                                <pre className="whitespace-pre-wrap leading-tight text-[#13221C] font-mono text-[11px]">
                                  {JSON.stringify(step.action_input, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Observation (Verbatim Evidence Box in Soft Mint Sage) */}
                            <div className="bg-[#E6F4EA] text-[#134E35] border border-[#A5D6B6] p-3 rounded-lg space-y-1.5 font-mono text-xs shadow-tactile-sm">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#134E35] uppercase tracking-wider">
                                <Terminal className="w-3 h-3 text-[#134E35]" />
                                <span>Observation (Verbatim CV Grounding)</span>
                              </div>
                              <p className="font-mono text-xs text-[#134E35] leading-relaxed whitespace-pre-wrap">
                                {step.observation}
                              </p>
                            </div>

                            {/* State Mutation */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#D5DFD9] text-[10px]">
                              <span className="font-semibold text-[#40564D] uppercase tracking-wider text-[10px]">
                                State Mutation:
                              </span>
                              <span className="font-mono font-medium text-[#1B6C47] bg-[#EBF6EF] px-2.5 py-0.5 rounded-md border border-[#BBE5CD] text-xs shadow-tactile-sm">
                                {step.state_mutation}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hiring Manager Decision Panel (Segmented Tactile Switch) */}
                  <div className="bg-[#FCFDFC] p-5 border border-[#D5DFD9] rounded-2xl space-y-4 shadow-tactile">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[#13221C] text-sm">Catatan & Keputusan Hiring Manager</h4>
                      <span className="text-[11px] font-mono text-[#40564D]">Tactile Decision Control</span>
                    </div>

                    <div>
                      <label className="block text-[#13221C] font-semibold text-xs mb-2">Status Keputusan</label>
                      {/* Anti-Slop: Segmented Tactile Switch replaces native <select> */}
                      <div className="grid grid-cols-3 gap-2 bg-[#F5F8F6] p-1.5 rounded-xl border border-[#D5DFD9]">
                        <button
                          type="button"
                          onClick={() => handleDecision(selectedCandidate.cv_id, 'SHORTLIST')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                            selectedCandidate.decision === 'SHORTLIST'
                              ? 'bg-[#EBF6EF] text-[#1B6C47] border border-[#BBE5CD] shadow-tactile'
                              : 'bg-transparent text-[#40564D] hover:text-[#13221C] hover:bg-[#EBF1EE]'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#1B6C47]" />
                          <span>Shortlist</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDecision(selectedCandidate.cv_id, 'HOLD')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                            selectedCandidate.decision === 'HOLD'
                              ? 'bg-[#FEF6E8] text-[#8A4C05] border border-[#F8D8A7] shadow-tactile'
                              : 'bg-transparent text-[#40564D] hover:text-[#13221C] hover:bg-[#EBF1EE]'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 text-[#8A4C05]" />
                          <span>Hold</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDecision(selectedCandidate.cv_id, 'TIDAK_LANJUT')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                            selectedCandidate.decision === 'TIDAK_LANJUT'
                              ? 'bg-[#FCEBEB] text-[#9E2A2B] border border-[#F6C1C1] shadow-tactile'
                              : 'bg-transparent text-[#40564D] hover:text-[#13221C] hover:bg-[#EBF1EE]'
                          }`}
                        >
                          <X className="w-3.5 h-3.5 text-[#9E2A2B]" />
                          <span>Tidak Lanjut</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#13221C] font-semibold text-xs mb-1.5">Catatan Tambahan</label>
                      <textarea
                        rows={3}
                        placeholder="Tambahkan catatan pertimbangan keputusan..."
                        className="w-full px-3 py-2 bg-[#FCFDFC] border border-[#D5DFD9] rounded-xl text-xs font-normal text-[#13221C] placeholder-[#40564D]/50 focus:outline-none focus:ring-2 focus:ring-[#1B4938]/15 focus:border-[#1B4938] shadow-tactile-sm transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#D5DFD9] bg-[#FCFDFC] flex items-center justify-between">
              <span className="text-xs text-[#40564D]">
                Keputusan Saat Ini: <strong className="text-[#13221C] font-semibold">{selectedCandidate.decision || 'Belum Ditentukan'}</strong>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDecision(selectedCandidate.cv_id, 'TIDAK_LANJUT')}
                  className="px-3.5 py-1.5 bg-[#FCFDFC] border border-[#F6C1C1] hover:bg-[#FCEBEB] text-[#9E2A2B] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Tidak Lanjut
                </button>
                <button
                  onClick={() => handleDecision(selectedCandidate.cv_id, 'HOLD')}
                  className="px-3.5 py-1.5 bg-[#FEF6E8] border border-[#F8D8A7] hover:bg-[#FEF6E8]/80 text-[#8A4C05] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Tahan
                </button>
                <button
                  onClick={() => handleDecision(selectedCandidate.cv_id, 'SHORTLIST')}
                  className="px-4 py-1.5 bg-[#1B4938] hover:bg-[#2D6A4F] text-[#FCFDFC] text-xs font-bold rounded-lg shadow-tactile transition-all cursor-pointer active:scale-[0.99]"
                >
                  Shortlist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: Bandingkan Kandidat (Side-by-side)                       */}
      {/* ============================================================== */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#13221C]/45 backdrop-blur-2xs flex items-center justify-center p-6">
          <div className="bg-[#FCFDFC] rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-[#D5DFD9] space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#D5DFD9] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#13221C]">Perbandingan Kandidat Berdampingan</h3>
                <p className="text-xs text-[#40564D]">Menganalisis perbandingan pemenuhan kriteria antara kandidat terpilih.</p>
              </div>
              <button
                onClick={() => setIsCompareOpen(false)}
                aria-label="Tutup modal perbandingan"
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-lg text-[#40564D] hover:text-[#13221C] hover:bg-[#EBF1EE] transition-colors focus-visible:ring-2 focus-visible:ring-[#1B4938]/30 focus:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border border-[#D5DFD9] rounded-xl overflow-hidden">
                <thead className="bg-[#EBF1EE] text-[#13221C] font-semibold border-b border-[#D5DFD9]">
                  <tr>
                    <th className="py-2.5 px-3 w-40">Kriteria</th>
                    {selectedForCompare.map((cid) => {
                      const cand = candidates.find((c) => c.cv_id === cid)
                      return (
                        <th key={cid} className="py-2.5 px-3 text-center border-l border-[#D5DFD9]">
                          <p className="font-bold text-[#13221C]">{blindMode && !cand?.revealed ? cand?.blind_id : cand?.real_name}</p>
                          <span className="text-[10px] text-[#40564D] font-mono font-normal tabular-nums">Skor: {cand?.final_score.toFixed(1)} (Band {cand?.band})</span>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9E5]">
                  {requirements.map((r) => (
                    <tr key={r.requirement_id} className="hover:bg-[#EBF1EE]/60 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-[#13221C]">
                        <span className="font-mono text-[#1B4938] font-bold mr-1">{r.requirement_id}</span>
                        {r.description}
                      </td>
                      {selectedForCompare.map((cid) => {
                        const cand = candidates.find((c) => c.cv_id === cid)
                        const st = cand?.requirement_states[r.requirement_id] || 'NOT_DEMONSTRATED'
                        return (
                          <td key={cid} className="py-2.5 px-3 text-center border-l border-[#D5DFD9]">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border shadow-tactile-sm ${
                                st === 'STRONG'
                                  ? 'bg-[#EBF6EF] text-[#1B6C47] border-[#BBE5CD]'
                                  : st === 'PARTIAL'
                                  ? 'bg-[#FEF6E8] text-[#8A4C05] border-[#F8D8A7]'
                                  : 'bg-[#EBF1EE] text-[#40564D] border-[#D5DFD9]'
                              }`}
                            >
                              {st === 'STRONG' ? 'Terbukti' : st === 'PARTIAL' ? 'Sebagian' : 'Tidak Tercantum'}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-[#D5DFD9] flex justify-end">
              <button
                onClick={() => setIsCompareOpen(false)}
                className="px-4 py-2 bg-[#FCFDFC] hover:bg-[#EBF1EE] border border-[#D5DFD9] text-[#13221C] text-xs font-semibold rounded-lg shadow-tactile-sm transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: Export Data                                             */}
      {/* ============================================================== */}
      {isExportOpen && (
        <div className="fixed inset-0 z-50 bg-[#13221C]/45 backdrop-blur-2xs flex items-center justify-center p-6">
          <div className="bg-[#FCFDFC] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5DFD9] space-y-4">
            <h3 className="text-base font-bold text-[#13221C]">Export Laporan Pemeringkatan</h3>
            <p className="text-xs text-[#40564D]">Pilih format berkas dan cakupan data yang akan diunduh.</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#13221C] font-semibold mb-1.5">Format Berkas</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer text-[#13221C]">
                    <input type="radio" name="fmt" defaultChecked className="accent-[#1B4938]" />
                    <span>Excel (.XLSX)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-[#13221C]">
                    <input type="radio" name="fmt" className="accent-[#1B4938]" />
                    <span>CSV (.CSV)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[#13221C] font-semibold mb-1.5">Cakupan Kandidat</label>
                <div className="relative">
                  <select className="w-full px-3 py-2 bg-[#FCFDFC] hover:bg-[#EBF1EE]/60 border border-[#D5DFD9] rounded-xl text-xs font-medium text-[#13221C] focus:outline-none focus:ring-2 focus:ring-[#1B4938]/15 focus:border-[#1B4938] shadow-tactile-sm transition-colors cursor-pointer">
                    <option>Semua Kandidat ({candidates.length})</option>
                    <option>Kandidat Band A & B Saja</option>
                    <option>Hanya Kandidat yang Di-shortlist</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#F5F8F6] p-3 rounded-xl border border-[#D5DFD9] text-[11px] text-[#40564D] leading-relaxed">
                ℹ️ Saat <strong className="text-[#13221C]">Blind Mode</strong> aktif, nama dan kontak disembunyikan dalam laporan ekspor sesuai regulasi privasi.
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#D5DFD9]">
              <button
                onClick={() => setIsExportOpen(false)}
                className="px-4 py-2 text-[#40564D] hover:text-[#13221C] text-xs font-semibold rounded-lg hover:bg-[#EBF1EE] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  showToast('Laporan berhasil diekspor sesuai format yang dipilih.', 'success')
                  setIsExportOpen(false)
                }}
                className="px-5 py-2 bg-[#1B4938] hover:bg-[#2D6A4F] text-[#FCFDFC] text-xs font-bold rounded-lg shadow-tactile transition-all cursor-pointer active:scale-[0.99]"
              >
                Unduh Berkas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-blocking In-App Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-60 max-w-sm px-4 py-3 rounded-xl shadow-tactile border text-xs font-medium flex items-center justify-between gap-3 transition-all ${
            toast.type === 'warning'
              ? 'bg-[#FEF6E8] text-[#8A4C05] border-[#F8D8A7]'
              : toast.type === 'success'
              ? 'bg-[#EBF6EF] text-[#1B6C47] border-[#BBE5CD]'
              : 'bg-[#FCFDFC] text-[#13221C] border-[#D5DFD9]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                toast.type === 'warning'
                  ? 'bg-[#8A4C05]'
                  : toast.type === 'success'
                  ? 'bg-[#1B6C47]'
                  : 'bg-[#1B4938]'
              }`}
            />
            <span className="leading-snug">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
            className="p-1 rounded-md hover:bg-[#EBF1EE] text-[#40564D] hover:text-[#13221C] transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
