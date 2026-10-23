import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import type { CandidateDetail, Requirement, WorkflowStep, UploadedCvFile } from './types'
import { MOCK_CANDIDATES } from './mockData'
import { Topbar } from './components/Topbar'
import { WorkflowStepper } from './components/WorkflowStepper'
import { JobSetupStep } from './components/JobSetupStep'
import { CriteriaStudio } from './components/CriteriaStudio'
import { UploadStep } from './components/UploadStep'
import { CandidateRoster } from './components/CandidateRoster'
import { ForensicCanvas } from './components/ForensicCanvas'
import { ForensicAuditDrawer } from './components/ForensicAuditDrawer'
import { UploadModal } from './components/UploadModal'

export default function App() {
  // Navigation & 4-Step Workflow state (with URL hash & localStorage persistence)
  const getInitialStep = (): WorkflowStep => {
    try {
      const hash = window.location.hash.replace(/^#/, '') as WorkflowStep
      if (['setup', 'criteria', 'upload', 'workbench'].includes(hash)) {
        return hash
      }
      const saved = localStorage.getItem('cv_screening_step') as WorkflowStep
      if (['setup', 'criteria', 'upload', 'workbench'].includes(saved)) {
        return saved
      }
    } catch {}
    return 'setup'
  }

  const [currentStep, setCurrentStepState] = useState<WorkflowStep>(getInitialStep)

  const setCurrentStep = useCallback((step: WorkflowStep) => {
    setCurrentStepState(step)
    try {
      localStorage.setItem('cv_screening_step', step)
      if (window.location.hash !== `#${step}`) {
        window.history.replaceState(null, '', `#${step}`)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '') as WorkflowStep
      if (['setup', 'criteria', 'upload', 'workbench'].includes(hash)) {
        setCurrentStepState(hash)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const [blindMode, setBlindMode] = useState<boolean>(true)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [isJobLoading, setIsJobLoading] = useState<boolean>(true)

  // Pure initial state helper — purges any legacy mock data from browser localStorage
  const getCleanCachedValue = (key: string, dummyValues: string[] = []): string => {
    try {
      const val = localStorage.getItem(key)
      if (!val) return ''
      if (
        dummyValues.includes(val) ||
        (key === 'cv_screening_job_description' && val.includes('Kami mencari Senior Backend Engineer'))
      ) {
        localStorage.removeItem(key)
        return ''
      }
      return val
    } catch {
      return ''
    }
  }

  // Job Setup state without dummy text fallbacks
  const [jobTitle, setJobTitleState] = useState(
    () => getCleanCachedValue('cv_screening_job_title', ['Senior Backend Engineer'])
  )
  const setJobTitle = useCallback((val: string) => {
    setJobTitleState(val)
    try {
      localStorage.setItem('cv_screening_job_title', val)
    } catch {}
  }, [])

  const [jobLocation, setJobLocationState] = useState(
    () => getCleanCachedValue('cv_screening_job_location', ['Jakarta / Hybrid'])
  )
  const setJobLocation = useCallback((val: string) => {
    setJobLocationState(val)
    try {
      localStorage.setItem('cv_screening_job_location', val)
    } catch {}
  }, [])

  const [jobType, setJobTypeState] = useState(
    () => getCleanCachedValue('cv_screening_job_type', ['Penuh Waktu (Full-time)'])
  )
  const setJobType = useCallback((val: string) => {
    setJobTypeState(val)
    try {
      localStorage.setItem('cv_screening_job_type', val)
    } catch {}
  }, [])

  const [jobDescription, setJobDescriptionState] = useState(
    () => getCleanCachedValue('cv_screening_job_description')
  )
  const setJobDescription = useCallback((val: string) => {
    setJobDescriptionState(val)
    try {
      localStorage.setItem('cv_screening_job_description', val)
    } catch {}
  }, [])

  // Requirements & Studio state
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [categoryWeights, setCategoryWeights] = useState<Record<string, number>>({
    EXPERIENCE: 40,
    HARD_SKILLS: 30,
    EDUCATION_CERT: 15,
    ACHIEVEMENT: 15,
  })
  const [criteriaApproved, setCriteriaApproved] = useState<boolean>(false)
  const [criteriaVersion, setCriteriaVersion] = useState<number>(1)
  const [isCompiling, setIsCompiling] = useState<boolean>(false)

  // Auth & Backend Jobs state with instant stale-while-revalidate cache
  const [authToken, setAuthTokenState] = useState<string | null>(() =>
    localStorage.getItem('cv_screening_token')
  )
  const setAuthToken = useCallback((tok: string | null) => {
    setAuthTokenState(tok)
    try {
      if (tok) {
        localStorage.setItem('cv_screening_token', tok)
      } else {
        localStorage.removeItem('cv_screening_token')
      }
    } catch {}
  }, [])

  const [currentJobId, setCurrentJobIdState] = useState<string | null>(() =>
    localStorage.getItem('cv_screening_job_id')
  )
  const setCurrentJobId = useCallback((id: string | null) => {
    setCurrentJobIdState(id)
    try {
      if (id) {
        localStorage.setItem('cv_screening_job_id', id)
      } else {
        localStorage.removeItem('cv_screening_job_id')
      }
    } catch {}
  }, [])

  const [currentJobTitle, setCurrentJobTitleState] = useState<string>(
    () => getCleanCachedValue('cv_screening_job_title', ['Senior Backend Engineer'])
  )
  const setCurrentJobTitle = useCallback((title: string) => {
    setCurrentJobTitleState(title)
    try {
      localStorage.setItem('cv_screening_job_title', title)
    } catch {}
  }, [])

  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [availableJobs, setAvailableJobs] = useState<
    Array<{ id: string; title: string; cv_count: number }>
  >(() => {
    try {
      const saved = localStorage.getItem('cv_screening_available_jobs')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Upload & Screening execution state
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [isScreening, setIsScreening] = useState<boolean>(false)
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string>('')
  const pollTimerRef = useRef<any>(null)
  const isPollingRef = useRef<boolean>(false)

  // Uploaded files list
  const [uploadedFiles, setUploadedFiles] = useState<UploadedCvFile[]>([])

  // Candidates & Leaderboard state (pure initial empty state, mock only loaded on explicit Golden Sample button)
  const [candidates, setCandidates] = useState<CandidateDetail[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetail | null>(null)

  // Executive Studio (Option A): Slide-over Audit Drawer state
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState<boolean>(false)
  const [auditDrawerInitialTab, setAuditDrawerInitialTab] = useState<'trajectory' | 'grounding'>('trajectory')
  const [auditDrawerHighlightQuote, setAuditDrawerHighlightQuote] = useState<string | null>(null)

  const handleOpenAuditDrawer = useCallback(
    (tab: 'trajectory' | 'grounding' = 'trajectory', quote?: string) => {
      setAuditDrawerInitialTab(tab)
      setAuditDrawerHighlightQuote(quote || null)
      setIsAuditDrawerOpen(true)
    },
    []
  )

  const handleToggleAuditDrawer = useCallback(() => {
    setIsAuditDrawerOpen((prev) => !prev)
  }, [])

  // Non-blocking Toast notification state
  const [toast, setToast] = useState<{
    message: string
    type: 'info' | 'warning' | 'success'
  } | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback(
    (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
      setToast({ message, type })
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null)
      }, 4000)
    },
    []
  )

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const t = authToken || localStorage.getItem('cv_screening_token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }, [authToken])

  // Auto-login recruiter on mount
  const loginRecruiter = useCallback(async (): Promise<string | null> => {
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
  }, [])

  const stopPollingJobCvs = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    isPollingRef.current = false
  }, [])

  const fetchJobCvsStatus = useCallback(
    async (jId: string): Promise<boolean> => {
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
              reason: f.reasons && f.reasons.length > 0 ? f.reasons.join(', ') : '',
            }))
            setUploadedFiles(mapped)
            return rawDocs.every(
              (f: any) => f.status !== 'RECEIVED' && f.status !== 'PROCESSING'
            )
          }
        }
      } catch (e) {
        console.warn('Error polling status:', e)
      }
      return false
    },
    [getAuthHeaders]
  )

  const startPollingJobCvs = useCallback(
    (jId: string) => {
      if (!jId) return
      stopPollingJobCvs()
      isPollingRef.current = true
      let attempts = 0
      const maxAttempts = 150

      const tick = async () => {
        attempts++
        const allDone = await fetchJobCvsStatus(jId)
        if (allDone || attempts >= maxAttempts) {
          stopPollingJobCvs()
        }
      }

      tick()
      pollTimerRef.current = setInterval(tick, 2000)
    },
    [fetchJobCvsStatus, stopPollingJobCvs]
  )

  const ensureJobExists = useCallback(async (): Promise<string> => {
    if (currentJobId) return currentJobId
    try {
      const listRes = await fetch('/api/v1/jobs', { headers: { ...getAuthHeaders() } })
      if (listRes.ok) {
        const jobs = await listRes.json()
        if (jobs && jobs.length > 0) {
          const bestJob = jobs
            .slice()
            .sort((a: any, b: any) => (b.cv_count || 0) - (a.cv_count || 0))[0]
          return bestJob.id
        }
      }
    } catch (e) {
      console.warn('Job listing error:', e)
    }
    return ''
  }, [currentJobId, getAuthHeaders])

  const fetchLatestLeaderboard = useCallback(
    async (jId?: string, maxAttempts = 1) => {
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
              const mappedCandidates: CandidateDetail[] = data.rankings.map(
                (r: any, idx: number) => ({
                  rank: r.rank || idx + 1,
                  cv_id: r.cv_id || r.candidate_id,
                  file_name: r.file_name,
                  blind_id: `C-${String(idx + 1).padStart(4, '0')}`,
                  real_name: r.file_name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                  revealed: false,
                  final_score:
                    typeof r.final_score === 'number'
                      ? r.final_score
                      : parseFloat(r.final_score) || 0,
                  raw_score:
                    typeof r.raw_score === 'number'
                      ? r.raw_score
                      : parseFloat(r.raw_score) || 0,
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
                    final_score:
                      typeof r.final_score === 'number'
                        ? r.final_score
                        : parseFloat(r.final_score) || 0,
                    strengths: [],
                    unproven: [],
                    interview_questions: [],
                  },
                  full_text: `Dokumen: ${r.file_name}\nStatus Ingestion: ${
                    r.quality_status || 'READY'
                  }\nSkor Evaluasi: ${r.final_score}`,
                })
              )
              setCandidates(mappedCandidates)
              if (mappedCandidates.length > 0) {
                setSelectedCandidate(mappedCandidates[0])
              }
              return
            }
          }
          if (attempt < maxAttempts) {
            await new Promise((res) => setTimeout(res, 800))
          }
        }
      } catch (e) {
        console.warn('Leaderboard fetch note:', e)
      }
    },
    [ensureJobExists, getAuthHeaders]
  )

  const selectJob = useCallback(
    async (jId: string, title?: string) => {
      setIsJobLoading(true)
      setCurrentJobId(jId)
      if (title) {
        setJobTitle(title)
        setCurrentJobTitle(title)
      }

      try {
        const headers = { ...getAuthHeaders() }
        const [resJob, resReq] = await Promise.all([
          fetch(`/api/v1/jobs/${jId}`, { headers }),
          fetch(`/api/v1/jobs/${jId}/requirements`, { headers }),
        ])

        if (resJob.ok) {
          const data = await resJob.json()
          if (data.title) {
            setJobTitle(data.title)
            setCurrentJobTitle(data.title)
          }
          if (data.jd_text) setJobDescription(data.jd_text)
          if (data.location) setJobLocation(data.location)
          if (data.employment_type) setJobType(data.employment_type)
        }

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
          if (verHdr) setCriteriaVersion(parseInt(verHdr) || 1)
          if (Array.isArray(reqList) && reqList.length > 0) {
            setRequirements(reqList)
            setCriteriaApproved(true)
          } else {
            setCriteriaApproved(false)
          }
        }
      } catch (e) {
        console.warn('Error fetching job details:', e)
      } finally {
        setIsJobLoading(false)
      }

      // Concurrently poll CVs status and initial leaderboard without blocking delays
      await Promise.all([
        fetchJobCvsStatus(jId),
        fetchLatestLeaderboard(jId, 1),
      ])
    },
    [
      fetchJobCvsStatus,
      fetchLatestLeaderboard,
      getAuthHeaders,
      setCurrentJobId,
      setCurrentJobTitle,
      setJobDescription,
      setJobLocation,
      setJobTitle,
      setJobType,
    ]
  )

  const fetchJobsList = useCallback(
    async (tokenOverride?: string) => {
      try {
        const headers = tokenOverride
          ? { Authorization: `Bearer ${tokenOverride}` }
          : { ...getAuthHeaders() }
        let res = await fetch('/api/v1/jobs', { headers })
        if (res.status === 401) {
          const freshToken = await loginRecruiter()
          if (freshToken) {
            res = await fetch('/api/v1/jobs', {
              headers: { Authorization: `Bearer ${freshToken}` },
            })
          }
        }
        if (res.ok) {
          const jobs = await res.json()
          if (Array.isArray(jobs) && jobs.length > 0) {
            const mapped = jobs.map((j: any) => ({
              id: j.id,
              title: j.title,
              cv_count: j.cv_count || 0,
            }))
            setAvailableJobs(mapped)
            try {
              localStorage.setItem('cv_screening_available_jobs', JSON.stringify(mapped))
            } catch {}

            const savedId = localStorage.getItem('cv_screening_job_id')
            const found = jobs.find((j: any) => j.id === savedId)
            if (found) {
              await selectJob(found.id, found.title)
            } else {
              const bestJob = jobs
                .slice()
                .sort((a: any, b: any) => (b.cv_count || 0) - (a.cv_count || 0))[0]
              if (bestJob) {
                await selectJob(bestJob.id, bestJob.title)
              } else {
                setIsJobLoading(false)
              }
            }
          } else {
            setIsJobLoading(false)
          }
        } else {
          setIsJobLoading(false)
        }
      } catch (e) {
        console.warn('Error fetching jobs:', e)
        setIsJobLoading(false)
      } finally {
        setIsJobLoading(false)
      }
    },
    [getAuthHeaders, loginRecruiter, selectJob]
  )

  const handleRenameJob = async () => {
    if (!currentJobId) return
    const newTitle = window.prompt('Ubah nama lowongan:', currentJobTitle || jobTitle)
    if (!newTitle || !newTitle.trim() || newTitle.trim() === (currentJobTitle || jobTitle))
      return
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
        setAvailableJobs((prev) => {
          const next = prev.map((j) => (j.id === currentJobId ? { ...j, title: updated.title } : j))
          try {
            localStorage.setItem('cv_screening_available_jobs', JSON.stringify(next))
          } catch {}
          return next
        })
        showToast('Nama lowongan berhasil diperbarui.', 'success')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteJob = async () => {
    if (!currentJobId) return
    const title = currentJobTitle || jobTitle || 'Lowongan ini'
    if (
      !window.confirm(
        `Hapus lowongan "${title}"?\n\nSemua berkas CV dan hasil evaluasi lowongan ini akan dihapus permanen.`
      )
    )
      return
    try {
      const res = await fetch(`/api/v1/jobs/${currentJobId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
      })
      if (res.ok) {
        showToast(`Lowongan "${title}" berhasil dihapus.`, 'info')
        const remaining = availableJobs.filter((j) => j.id !== currentJobId)
        setAvailableJobs(remaining)
        try {
          localStorage.setItem('cv_screening_available_jobs', JSON.stringify(remaining))
        } catch {}
        if (remaining.length > 0) {
          await selectJob(remaining[0].id, remaining[0].title)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateJob = async () => {
    const title = window.prompt('Masukkan judul lowongan baru:', '')
    if (!title || !title.trim()) return
    try {
      const res = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          title: title.trim(),
          jd_text: jobDescription,
          location: jobLocation || 'Jakarta / Hybrid',
          employment_type: jobType || 'Full-time',
          external_ref: `JD-${Date.now().toString().slice(-6)}`,
        }),
      })
      if (res.ok) {
        const newJob = await res.json()
        setAvailableJobs((prev) => {
          const next = [{ id: newJob.id, title: newJob.title, cv_count: 0 }, ...prev]
          try {
            localStorage.setItem('cv_screening_available_jobs', JSON.stringify(next))
          } catch {}
          return next
        })
        await selectJob(newJob.id, newJob.title)
        showToast(`Lowongan "${title.trim()}" berhasil dibuat.`, 'success')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSelectCandidate = useCallback(
    async (cand: CandidateDetail) => {
      setSelectedCandidate(cand)
      if (currentJobId && currentRunId) {
        try {
          const res = await fetch(
            `/api/v1/jobs/${currentJobId}/screenings/${currentRunId}/candidates/${cand.cv_id}`,
            { headers: { ...getAuthHeaders() } }
          )
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
    },
    [currentJobId, currentRunId, getAuthHeaders]
  )

  const handleDecision = useCallback(
    (cv_id: string, decision: 'SHORTLIST' | 'HOLD' | 'TIDAK_LANJUT') => {
      setCandidates((prev) =>
        prev.map((c) => (c.cv_id === cv_id ? { ...c, decision } : c))
      )
      setSelectedCandidate((prev) =>
        prev && prev.cv_id === cv_id ? { ...prev, decision } : prev
      )
      showToast(`Status kandidat diperbarui -> ${decision}`, 'success')
    },
    [showToast]
  )

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

  const handleLoadGoldenSample = () => {
    setCandidates(MOCK_CANDIDATES)
    setSelectedCandidate(MOCK_CANDIDATES[0])
    setUploadedFiles([
      { name: 'S1_senior_backend_id.pdf', size: '142 KB', status: 'ready' },
      { name: 'S2_backend_fintech_en.pdf', size: '128 KB', status: 'ready' },
      { name: 'S3_backend_mixed_lang.pdf', size: '156 KB', status: 'ready' },
      { name: 'S4_lead_backend_two_column.pdf', size: '185 KB', status: 'ready' },
      { name: 'S5_backend_healthtech_id.docx', size: '112 KB', status: 'ready' },
      { name: 'M1_nodejs_backend_two_column.pdf', size: '139 KB', status: 'ready' },
      { name: 'M2_data_analyst_id.pdf', size: '145 KB', status: 'ready' },
      { name: 'M3_fresh_graduate_scan_id.pdf', size: '210 KB', status: 'ready' },
      { name: 'M4_qa_automation_en.docx', size: '98 KB', status: 'ready' },
      { name: 'M5_php_fullstack_two_column_id.pdf', size: '140 KB', status: 'ready' },
      { name: 'I1_hr_generalist_id.pdf', size: '115 KB', status: 'ready' },
    ])
    showToast('15 Golden Dataset Kandidat & ReAct Trajectory berhasil dimuat!', 'success')
  }

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return
    setIsUploading(true)
    setUploadStatusMsg(`Mengunggah ${files.length} berkas CV...`)

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
      const res = await fetch(`/api/v1/jobs/${jId}/cvs`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: formData,
      })

      if (res.ok) {
        startPollingJobCvs(jId)
        showToast('Berkas CV berhasil diunggah ke pipeline verifikasi.', 'success')
      }
    } catch (e: any) {
      showToast(`Gagal mengunggah berkas: ${e.message}`, 'warning')
    } finally {
      setIsUploading(false)
    }
  }

  const handleStartScreening = async () => {
    setIsScreening(true)
    try {
      const jId = await ensureJobExists()
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
        await fetch(`/api/v1/jobs/${jId}/requirements/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        })
      } catch (e) {
        console.warn('Requirements import note:', e)
      }

      const res = await fetch(`/api/v1/jobs/${jId}/screenings?sync=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          use_agent: true,
          use_verifier: true,
          verifier_provider: 'JEV_TYPESAFE',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const runId = data.screening_run_id || data.run_id
        setCurrentRunId(runId)
        await fetchLatestLeaderboard(jId, 6)
        showToast('Screening CV berhasil diselesaikan.', 'success')
        setCurrentStep('workbench')
      } else {
        showToast('Skrining offline: Golden sample tetap aktif.', 'info')
        setCurrentStep('workbench')
      }
    } catch (e: any) {
      showToast(`Catatan evaluasi: ${e.message}`, 'info')
    } finally {
      setIsScreening(false)
    }
  }

  const handleManualRefresh = useCallback(async () => {
    if (!currentJobId) return
    setIsRefreshing(true)
    try {
      await fetchJobCvsStatus(currentJobId)
      await fetchLatestLeaderboard(currentJobId, 1)
      showToast('Status berkas CV dan hasil evaluasi diperbarui.', 'success')
    } catch (e) {
      console.warn('Manual refresh note:', e)
    } finally {
      setIsRefreshing(false)
    }
  }, [currentJobId, fetchJobCvsStatus, fetchLatestLeaderboard, showToast])

  const handleClearUploadedCvs = useCallback(async () => {
    if (uploadedFiles.length === 0) return
    if (!window.confirm('Kosongkan semua berkas CV yang telah diunggah untuk lowongan ini?')) return
    if (currentJobId) {
      try {
        await fetch(`/api/v1/jobs/${currentJobId}/cvs`, {
          method: 'DELETE',
          headers: { ...getAuthHeaders() },
        })
      } catch (e) {
        console.warn('Clear CVs backend note:', e)
      }
    }
    setUploadedFiles([])
    showToast('Daftar berkas CV berhasil dikosongkan.', 'info')
  }, [currentJobId, getAuthHeaders, showToast, uploadedFiles.length])

  const handleCompileFromJd = async () => {
    if (!jobDescription.trim()) return
    setIsCompiling(true)
    try {
      const res = await fetch('/api/v1/requirements/compile-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ jd_text: jobDescription }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.requirements && Array.isArray(data.requirements)) {
          setRequirements(data.requirements)
          if (data.category_weights) setCategoryWeights(data.category_weights)
          setCriteriaApproved(false)
          showToast('Kriteria berhasil diekstraksi dari JD!', 'success')
          return
        }
      }
    } catch (err) {
      console.warn('Compile note:', err)
    } finally {
      setIsCompiling(false)
    }
    showToast('Kompilasi kriteria siap diedit.', 'info')
  }

  const handleApproveCriteria = async () => {
    setCriteriaApproved(true)
    const nextVer = criteriaVersion + 1
    setCriteriaVersion(nextVer)
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
    showToast(`Kriteria v${nextVer} berhasil disetujui & dikunci!`, 'success')
  }

  // Keyboard shortcut listener for power navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return
      }

      if (e.key === 'Escape') {
        if (isAuditDrawerOpen) {
          e.preventDefault()
          setIsAuditDrawerOpen(false)
          return
        }
        if (isUploadModalOpen) setIsUploadModalOpen(false)
        return
      }

      if (currentStep !== 'workbench') return

      const currentIndex = candidates.findIndex(
        (c) => c.cv_id === selectedCandidate?.cv_id
      )

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (currentIndex < candidates.length - 1) {
          handleSelectCandidate(candidates[currentIndex + 1])
        }
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (currentIndex > 0) {
          handleSelectCandidate(candidates[currentIndex - 1])
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (selectedCandidate) {
          e.preventDefault()
          handleDecision(selectedCandidate.cv_id, 'SHORTLIST')
        }
      } else if (e.key === 'h' || e.key === 'H') {
        if (selectedCandidate) {
          e.preventDefault()
          handleDecision(selectedCandidate.cv_id, 'HOLD')
        }
      } else if (e.key === 'x' || e.key === 'X') {
        if (selectedCandidate) {
          e.preventDefault()
          handleDecision(selectedCandidate.cv_id, 'TIDAK_LANJUT')
        }
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        setBlindMode((prev) => !prev)
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        setIsAuditDrawerOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    candidates,
    selectedCandidate,
    blindMode,
    currentStep,
    isUploadModalOpen,
    isAuditDrawerOpen,
    handleDecision,
    handleSelectCandidate,
  ])

  // Lifecycle init — non-blocking concurrent hydration
  useEffect(() => {
    let isMounted = true
    const init = async () => {
      const existingToken = localStorage.getItem('cv_screening_token')
      if (existingToken) {
        // Parallel non-blocking init: run fetchJobsList and re-authenticate recruiter concurrently
        await Promise.all([
          fetchJobsList(existingToken),
          loginRecruiter(),
        ])
      } else {
        const freshToken = await loginRecruiter()
        if (isMounted) {
          await fetchJobsList(freshToken || undefined)
        }
      }
    }
    init()
    return () => {
      isMounted = false
      stopPollingJobCvs()
    }
  }, [fetchJobsList, loginRecruiter, stopPollingJobCvs])

  const mappedUploadFiles = useMemo(() => {
    return uploadedFiles.map((f, idx) => ({
      id: `${f.name}-${idx}`,
      name: f.name,
      size: f.size,
      status: (f.status === 'processing'
        ? 'processing'
        : f.status === 'ready'
        ? 'ready'
        : 'error') as 'ready' | 'processing' | 'error',
    }))
  }, [uploadedFiles])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#F2F5F3] text-[#13221C] font-sans antialiased">
      {/* 1. Topbar Utama */}
      <Topbar
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        blindMode={blindMode}
        onToggleBlindMode={() => setBlindMode((prev) => !prev)}
        onLoadGoldenSample={handleLoadGoldenSample}
        currentJobId={currentJobId}
        currentJobTitle={currentJobTitle}
        availableJobs={availableJobs}
        onSelectJob={selectJob}
        onRenameJob={handleRenameJob}
        onDeleteJob={handleDeleteJob}
        onCreateNewJob={handleCreateJob}
        readyCvCount={uploadedFiles.filter((f) => f.status === 'ready').length}
        isLoading={isJobLoading}
      />

      {/* 2. Dedicated Workflow Sub-Header */}
      <div className="h-[42px] bg-[#F7FAF8] border-b border-[#D5DFD9] flex items-center justify-center px-4 shrink-0 overflow-hidden z-20">
        <WorkflowStepper
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          criteriaCount={requirements.length}
          criteriaApproved={criteriaApproved}
          uploadedCount={uploadedFiles.length}
          readyCvCount={uploadedFiles.filter((f) => f.status === 'ready').length}
          candidatesCount={candidates.length}
        />
      </div>

      {/* 3. Main Body: 4-Step Progressive Workflow */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {currentStep === 'setup' && (
          <JobSetupStep
            jobTitle={jobTitle}
            setJobTitle={setJobTitle}
            jobLocation={jobLocation}
            setJobLocation={setJobLocation}
            jobType={jobType}
            setJobType={setJobType}
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            criteriaApproved={criteriaApproved}
            criteriaVersion={criteriaVersion}
            isCompiling={isCompiling}
            isLoading={isJobLoading}
            onCompileFromJd={handleCompileFromJd}
            onNext={() => setCurrentStep('criteria')}
          />
        )}

        {currentStep === 'criteria' && (
          <CriteriaStudio
            jobTitle={jobTitle}
            setJobTitle={setJobTitle}
            jobLocation={jobLocation}
            setJobLocation={setJobLocation}
            jobType={jobType}
            setJobType={setJobType}
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            requirements={requirements}
            setRequirements={setRequirements}
            categoryWeights={categoryWeights}
            setCategoryWeights={setCategoryWeights}
            criteriaApproved={criteriaApproved}
            criteriaVersion={criteriaVersion}
            isCompiling={isCompiling}
            onCompileFromJd={handleCompileFromJd}
            onApproveCriteria={handleApproveCriteria}
            onBack={() => setCurrentStep('setup')}
            onNext={() => setCurrentStep('upload')}
          />
        )}

        {currentStep === 'upload' && (
          <UploadStep
            uploadedFiles={uploadedFiles}
            isUploading={isUploading}
            uploadStatusMsg={uploadStatusMsg}
            isScreening={isScreening}
            onUploadFiles={handleUploadFiles}
            onLoadGoldenSample={handleLoadGoldenSample}
            onClearFiles={handleClearUploadedCvs}
            onRefreshStatus={handleManualRefresh}
            isRefreshing={isRefreshing}
            onStartScreening={handleStartScreening}
            onBack={() => setCurrentStep('criteria')}
            onNext={() => setCurrentStep('workbench')}
          />
        )}

        {currentStep === 'workbench' && (
          <div className="flex-1 flex overflow-hidden relative">
            {/* Panel Kiri (38%): Candidate Roster */}
            <CandidateRoster
              candidates={candidates}
              selectedCandidateId={selectedCandidate?.cv_id || null}
              onSelectCandidate={handleSelectCandidate}
              blindMode={blindMode}
              onToggleBlindMode={() => setBlindMode((prev) => !prev)}
              onDecision={handleDecision}
              onRevealCandidate={handleRevealCandidate}
              onToggleAuditDrawer={handleToggleAuditDrawer}
            />

            {/* Panel Kanan (62%): Forensic Canvas */}
            <ForensicCanvas
              candidate={selectedCandidate}
              requirements={requirements}
              blindMode={blindMode}
              onDecision={handleDecision}
              onRevealCandidate={handleRevealCandidate}
              onOpenAuditDrawer={handleOpenAuditDrawer}
            />

            {/* Slide-Over Audit Drawer (Option A: Executive Studio) */}
            <ForensicAuditDrawer
              isOpen={isAuditDrawerOpen}
              onClose={() => setIsAuditDrawerOpen(false)}
              candidate={selectedCandidate}
              initialTab={auditDrawerInitialTab}
              highlightedQuote={auditDrawerHighlightQuote}
              blindMode={blindMode}
            />
          </div>
        )}
      </main>

      {/* 3. Quick Upload Modal Dialog (if invoked) */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        uploadedFiles={mappedUploadFiles}
        isUploading={isUploading}
        uploadStatusMsg={uploadStatusMsg}
        onUploadFiles={handleUploadFiles}
        onStartScreening={handleStartScreening}
        isScreening={isScreening}
      />

      {/* 4. Non-blocking Tactile Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl border shadow-tactile-lg text-xs font-semibold flex items-center space-x-2 transition-all animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-[#EBF6EF] text-[#134E35] border-[#A5D6B6]'
              : toast.type === 'warning'
              ? 'bg-[#FEF6E8] text-[#8A4C05] border-[#F8D8A7]'
              : 'bg-[#FCFDFC] text-[#13221C] border-[#D5DFD9]'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
