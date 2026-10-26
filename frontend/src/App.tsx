import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import type { CandidateDetail, Requirement, WorkflowStep, UploadedCvFile } from './types'
import type { JobTemplate } from './jobTemplates'
import { MOCK_CANDIDATES } from './mockData'
import { Topbar } from './components/Topbar'
import { WorkflowStepper } from './components/WorkflowStepper'
import { JobSetupStep } from './components/JobSetupStep'
import { CriteriaStudio } from './components/CriteriaStudio'
import { UploadStep } from './components/UploadStep'
import { CandidateRoster } from './components/CandidateRoster'
import { CandidateInspector } from './components/CandidateInspector'
import { UploadModal } from './components/UploadModal'

// Snapshot creation helper for criteria dirty-checking
const createCriteriaSnapshot = (
  reqs: Requirement[],
  weights: Record<string, number>
): string => {
  return JSON.stringify({
    reqs: reqs.map((r) => ({
      id: r.requirement_id,
      desc: r.description || '',
      cat: r.category,
      imp: r.importance,
      w: Number(r.weight) || 0,
    })),
    weights: {
      EXPERIENCE: Number(weights?.EXPERIENCE) || 0,
      HARD_SKILLS: Number(weights?.HARD_SKILLS) || 0,
      EDUCATION_CERT: Number(weights?.EDUCATION_CERT) || 0,
      ACHIEVEMENT: Number(weights?.ACHIEVEMENT) || 0,
    },
  })
}

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
  const isJobLoadingRef = useRef<boolean>(true)
  useEffect(() => {
    isJobLoadingRef.current = isJobLoading
  }, [isJobLoading])
  const loadedJobIdRef = useRef<string | null>(null)
  const hasInitializedRef = useRef<boolean>(false)

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
  const jobTitleRef = useRef(jobTitle)
  useEffect(() => {
    jobTitleRef.current = jobTitle
  }, [jobTitle])

  const [jobLocation, setJobLocationState] = useState(
    () => getCleanCachedValue('cv_screening_job_location', ['Jakarta / Hybrid'])
  )
  const jobLocationRef = useRef(jobLocation)
  useEffect(() => {
    jobLocationRef.current = jobLocation
  }, [jobLocation])

  const setJobLocation = useCallback((val: string) => {
    setJobLocationState(val)
    try {
      localStorage.setItem('cv_screening_job_location', val)
    } catch {}
  }, [])

  const [jobType, setJobTypeState] = useState(
    () => getCleanCachedValue('cv_screening_job_type', ['Penuh Waktu (Full-time)'])
  )
  const jobTypeRef = useRef(jobType)
  useEffect(() => {
    jobTypeRef.current = jobType
  }, [jobType])

  const setJobType = useCallback((val: string) => {
    setJobTypeState(val)
    try {
      localStorage.setItem('cv_screening_job_type', val)
    } catch {}
  }, [])

  const [jobDescription, setJobDescriptionState] = useState(
    () => getCleanCachedValue('cv_screening_job_description')
  )
  const jobDescriptionRef = useRef(jobDescription)
  useEffect(() => {
    jobDescriptionRef.current = jobDescription
  }, [jobDescription])

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
  const [approvedSnapshot, setApprovedSnapshot] = useState<string | null>(null)
  const [criteriaVersion, setCriteriaVersion] = useState<number>(1)
  const [isCompiling, setIsCompiling] = useState<boolean>(false)

  // Dirty checking & Locked state
  const currentCriteriaSnapshot = useMemo(() => {
    return createCriteriaSnapshot(requirements, categoryWeights)
  }, [requirements, categoryWeights])

  const isCriteriaLocked = useMemo(() => {
    return Boolean(
      approvedSnapshot && requirements.length > 0 && currentCriteriaSnapshot === approvedSnapshot
    )
  }, [approvedSnapshot, requirements.length, currentCriteriaSnapshot])

  const isCriteriaDirty = useMemo(() => {
    return Boolean(
      approvedSnapshot && currentCriteriaSnapshot !== approvedSnapshot
    )
  }, [approvedSnapshot, currentCriteriaSnapshot])

  const criteriaApproved = isCriteriaLocked

  // Auth & Backend Jobs state with instant stale-while-revalidate cache
  const [authToken, setAuthTokenState] = useState<string | null>(() =>
    localStorage.getItem('cv_screening_token')
  )
  const setAuthToken = useCallback(
    (tokOrUpdater: string | null | ((prev: string | null) => string | null)) => {
      setAuthTokenState((prev) => {
        const next = typeof tokOrUpdater === 'function' ? tokOrUpdater(prev) : tokOrUpdater
        if (prev === next) return prev
        try {
          if (next) {
            localStorage.setItem('cv_screening_token', next)
          } else {
            localStorage.removeItem('cv_screening_token')
          }
        } catch {}
        return next
      })
    },
    []
  )

  const [currentJobId, setCurrentJobIdState] = useState<string | null>(() =>
    localStorage.getItem('cv_screening_job_id')
  )
  const currentJobIdRef = useRef<string | null>(currentJobId)
  useEffect(() => {
    currentJobIdRef.current = currentJobId
  }, [currentJobId])

  const debounceTitleTimerRef = useRef<any>(null)

  const setCurrentJobId = useCallback((id: string | null) => {
    setCurrentJobIdState(id)
    currentJobIdRef.current = id
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

  // Linear-Style Focused Candidate Inspector state (Option B)
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false)
  const [inspectorInitialTab, setInspectorInitialTab] = useState<'evaluation' | 'trajectory' | 'grounding'>('evaluation')

  const handleOpenInspector = useCallback(
    (cand?: CandidateDetail, tab: 'evaluation' | 'trajectory' | 'grounding' = 'evaluation') => {
      if (cand) setSelectedCandidate(cand)
      setInspectorInitialTab(tab)
      setIsInspectorOpen(true)
    },
    []
  )

  const handleCloseInspector = useCallback(() => {
    setIsInspectorOpen(false)
  }, [])

  // Non-blocking Toast notification state
  const [toast, setToast] = useState<{
    message: string
    type: 'info' | 'warning' | 'success' | 'error'
  } | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback(
    (arg1: string, arg2?: string) => {
      let type: 'info' | 'warning' | 'success' | 'error' = 'info'
      let message = arg1

      const validTypes = ['info', 'warning', 'success', 'error'] as const
      if (arg2 !== undefined) {
        if ((validTypes as readonly string[]).includes(arg1)) {
          type = arg1 as 'info' | 'warning' | 'success' | 'error'
          message = arg2
        } else if ((validTypes as readonly string[]).includes(arg2)) {
          type = arg2 as 'info' | 'warning' | 'success' | 'error'
          message = arg1
        } else {
          message = arg1
        }
      }

      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
      setToast({ message, type })
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null)
      }, 4000)
    },
    []
  )

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast(null)
  }, [])

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
          setAuthToken((prev) => (prev === data.access_token ? prev : data.access_token))
          localStorage.setItem('cv_screening_token', data.access_token)
          return data.access_token
        }
      }
    } catch (e) {
      console.warn('Auto-login error:', e)
    }
    return null
  }, [setAuthToken])

  const syncJobTitleToBackend = useCallback(
    async (titleOverride?: string) => {
      const jId = currentJobIdRef.current
      const t = (titleOverride !== undefined ? titleOverride : jobTitleRef.current).trim()
      if (!jId || !t) return

      try {
        let res = await fetch(`/api/v1/jobs/${jId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ title: t }),
        })
        if (res.status === 401) {
          const freshToken = await loginRecruiter()
          if (freshToken) {
            res = await fetch(`/api/v1/jobs/${jId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${freshToken}`,
              },
              body: JSON.stringify({ title: t }),
            })
          }
        }
        if (res.ok) {
          const updated = await res.json()
          if (updated && updated.title) {
            setCurrentJobTitleState(updated.title)
            setAvailableJobs((prev) => {
              const next = prev.map((j) => (j.id === jId ? { ...j, title: updated.title } : j))
              try {
                localStorage.setItem('cv_screening_available_jobs', JSON.stringify(next))
              } catch {}
              return next
            })
          }
        }
      } catch (err) {
        console.warn('Sync job title to backend note:', err)
      }
    },
    [getAuthHeaders, loginRecruiter]
  )

  const setJobTitle = useCallback(
    (val: string, syncBackend: boolean = true) => {
      setJobTitleState(val)
      try {
        localStorage.setItem('cv_screening_job_title', val)
      } catch {}

      const displayTitle = val.trim() || 'Lowongan Baru'
      setCurrentJobTitleState(displayTitle)

      const jId = currentJobIdRef.current
      if (jId) {
        setAvailableJobs((prev) => {
          const next = prev.map((j) => (j.id === jId ? { ...j, title: displayTitle } : j))
          try {
            localStorage.setItem('cv_screening_available_jobs', JSON.stringify(next))
          } catch {}
          return next
        })

        if (syncBackend) {
          if (debounceTitleTimerRef.current) {
            clearTimeout(debounceTitleTimerRef.current)
          }
          if (val.trim()) {
            debounceTitleTimerRef.current = setTimeout(() => {
              syncJobTitleToBackend(val.trim())
            }, 600)
          }
        }
      }
    },
    [syncJobTitleToBackend]
  )

  const handleBlurTitle = useCallback(() => {
    if (debounceTitleTimerRef.current) {
      clearTimeout(debounceTitleTimerRef.current)
    }
    if (jobTitleRef.current.trim() && currentJobIdRef.current) {
      syncJobTitleToBackend(jobTitleRef.current.trim())
    }
  }, [syncJobTitleToBackend])

  const stopPollingJobCvs = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    isPollingRef.current = false
  }, [])

  const fetchJobCvsStatus = useCallback(
    async (jId: string): Promise<boolean> => {
      if (!jId) {
        setUploadedFiles([])
        return true
      }
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
          } else {
            setUploadedFiles([])
            return true
          }
        } else {
          setUploadedFiles([])
        }
      } catch (e) {
        console.warn('Error polling status:', e)
        setUploadedFiles([])
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

  const syncJobDetailsToBackend = useCallback(async (loc: string, typ: string, jd: string) => {
    try {
      const jId = currentJobIdRef.current || (await ensureJobExists())
      if (jId) {
        await fetch(`/api/v1/jobs/${jId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            location: loc,
            employment_type: typ,
            jd_text: jd,
          }),
        })
      }
    } catch (err) {
      console.warn('Sync job details error:', err)
    }
  }, [ensureJobExists, getAuthHeaders])

  const handleBlurDetails = useCallback(() => {
    syncJobDetailsToBackend(
      jobLocationRef.current,
      jobTypeRef.current,
      jobDescriptionRef.current
    )
  }, [syncJobDetailsToBackend])

  const handleSelectTemplate = useCallback(
    async (tmpl: JobTemplate) => {
      // 1. Clear any pending title debouncer
      if (debounceTitleTimerRef.current) {
        clearTimeout(debounceTitleTimerRef.current)
      }

      // 2. Atomically update local form states & refs
      setJobTitle(tmpl.title, false)
      setJobLocation(tmpl.location)
      setJobType(tmpl.employmentType)
      setJobDescription(tmpl.jd_text)

      jobTitleRef.current = tmpl.title
      jobLocationRef.current = tmpl.location
      jobTypeRef.current = tmpl.employmentType
      jobDescriptionRef.current = tmpl.jd_text

      // 3. Atomically purge obsolete criteria & approved snapshots to guarantee determinism
      setRequirements([])
      setApprovedSnapshot(null)
      const targetVer = criteriaVersion || 1
      setCriteriaVersion(targetVer)
      setIsCompiling(true)

      try {
        const jId = currentJobIdRef.current || (await ensureJobExists())
        if (jId) {
          if (!currentJobIdRef.current) {
            setCurrentJobId(jId)
          }
          // Synchronize updated metadata directly to backend
          await fetch(`/api/v1/jobs/${jId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              title: tmpl.title,
              location: tmpl.location,
              employment_type: tmpl.employmentType,
              jd_text: tmpl.jd_text,
            }),
          })

          setCurrentJobTitleState(tmpl.title)
          setAvailableJobs((prev) => {
            const next = prev.map((j) => (j.id === jId ? { ...j, title: tmpl.title } : j))
            try {
              localStorage.setItem('cv_screening_available_jobs', JSON.stringify(next))
            } catch {}
            return next
          })
        }

        // 4. Compile criteria asynchronously from template JD text
        const res = await fetch('/api/v1/requirements/compile-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ jd_text: tmpl.jd_text }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.requirements && Array.isArray(data.requirements)) {
            setRequirements(data.requirements)
            const catWeights = data.category_weights || categoryWeights
            if (data.category_weights) {
              setCategoryWeights(data.category_weights)
            }
            setApprovedSnapshot(null)

            // 5. Import newly compiled requirements as DRAFT into backend
            if (jId) {
              await fetch(`/api/v1/jobs/${jId}/requirements/import-approved`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...getAuthHeaders(),
                },
                body: JSON.stringify({
                  requirement_set_version: targetVer,
                  category_weights: catWeights,
                  requirements: data.requirements,
                  status: 'DRAFT',
                }),
              })
            }

            showToast(
              `Template "${tmpl.role}" diterapkan & ${data.requirements.length} kriteria berhasil disusun!`,
              'success'
            )
            return
          }
        }
        showToast(`Template "${tmpl.role}" berhasil diterapkan.`, 'info')
      } catch (err) {
        console.warn('Apply template error:', err)
        showToast('Gagal menyusun kriteria template ke server.', 'warning')
      } finally {
        setIsCompiling(false)
      }
    },
    [
      categoryWeights,
      criteriaVersion,
      ensureJobExists,
      getAuthHeaders,
      setCurrentJobId,
      setJobDescription,
      setJobLocation,
      setJobTitle,
      setJobType,
      showToast,
    ]
  )

  const fetchLatestLeaderboard = useCallback(
    async (jId?: string, maxAttempts = 1) => {
      try {
        const targetJobId = jId || (await ensureJobExists())
        if (!targetJobId) {
          setCurrentRunId(null)
          setCandidates([])
          setSelectedCandidate(null)
          return
        }
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
                  evidence: r.evidence || {},
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
                  full_text:
                    r.full_text ||
                    `Dokumen: ${r.file_name}\nStatus Ingestion: ${
                      r.quality_status || 'READY'
                    }\nSkor Evaluasi: ${r.final_score}`,
                })
              )
              setCandidates(mappedCandidates)
              if (mappedCandidates.length > 0) {
                setSelectedCandidate(mappedCandidates[0])
              }
              return
            } else {
              setCurrentRunId(null)
              setCandidates([])
              setSelectedCandidate(null)
            }
          } else {
            setCurrentRunId(null)
            setCandidates([])
            setSelectedCandidate(null)
          }
          if (attempt < maxAttempts) {
            await new Promise((res) => setTimeout(res, 800))
          }
        }
      } catch (e) {
        console.warn('Leaderboard fetch note:', e)
        setCurrentRunId(null)
        setCandidates([])
        setSelectedCandidate(null)
      }
    },
    [ensureJobExists, getAuthHeaders]
  )

  const selectJob = useCallback(
    async (jId: string, title?: string) => {
      const isSameActiveJob = loadedJobIdRef.current === jId && !isJobLoadingRef.current

      if (isSameActiveJob) {
        // Data lowongan yang sama sudah aktif dan sedang ditampilkan.
        // Hindari mereset state ke loading skeleton total; cukup perbarui data status CV dan leaderboard di background.
        await Promise.all([
          fetchJobCvsStatus(jId),
          fetchLatestLeaderboard(jId, 1),
        ])
        return
      }

      stopPollingJobCvs()
      isJobLoadingRef.current = true
      setIsJobLoading(true)
      setCurrentJobId(jId)
      if (title) {
        setJobTitle(title, false)
        setCurrentJobTitle(title)
      }
      setUploadedFiles([])
      setCandidates([])
      setSelectedCandidate(null)
      setCurrentRunId(null)

      try {
        const headers = { ...getAuthHeaders() }
        const [resJob, resReq] = await Promise.all([
          fetch(`/api/v1/jobs/${jId}`, { headers }),
          fetch(`/api/v1/jobs/${jId}/requirements`, { headers }),
        ])

        if (resJob.ok) {
          const data = await resJob.json()
          if (data.title) {
            setJobTitle(data.title, false)
            setCurrentJobTitle(data.title)
          }
          setJobDescription(data.jd_text || '')
          setJobLocation(data.location || '')
          setJobType(data.employment_type || 'Full-time')
        }

        if (resReq.ok) {
          const reqList = await resReq.json()
          const catWeightsHdr = resReq.headers.get('X-Category-Weights')
          const verHdr = resReq.headers.get('X-Requirements-Version')
          const statusHdr = resReq.headers.get('X-Requirements-Status')
          let activeWeights = categoryWeights
          if (catWeightsHdr) {
            try {
              const parsedWeights = JSON.parse(catWeightsHdr)
              if (parsedWeights && typeof parsedWeights === 'object') {
                activeWeights = parsedWeights
                setCategoryWeights(parsedWeights)
              }
            } catch (e) {
              console.warn('Failed parsing category weights header:', e)
            }
          }
          if (verHdr) setCriteriaVersion(parseInt(verHdr) || 1)
          if (Array.isArray(reqList) && reqList.length > 0) {
            setRequirements(reqList)
            if (statusHdr === 'APPROVED') {
              setApprovedSnapshot(createCriteriaSnapshot(reqList, activeWeights))
            } else {
              setApprovedSnapshot(null)
            }
          } else {
            setRequirements([])
            setApprovedSnapshot(null)
          }
        } else {
          setRequirements([])
          setApprovedSnapshot(null)
        }
      } catch (e) {
        console.warn('Error fetching job details:', e)
      } finally {
        isJobLoadingRef.current = false
        setIsJobLoading(false)
        loadedJobIdRef.current = jId
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
      stopPollingJobCvs,
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
        setJobTitle(updated.title, false)
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
        } else {
          stopPollingJobCvs()
          loadedJobIdRef.current = null
          setCurrentJobId(null)
          setCurrentJobTitle('')
          setJobTitle('')
          setJobDescription('')
          setRequirements([])
          setCategoryWeights({
            EXPERIENCE: 40,
            HARD_SKILLS: 30,
            EDUCATION_CERT: 15,
            ACHIEVEMENT: 15,
          })
          setApprovedSnapshot(null)
          setCriteriaVersion(1)
          setUploadedFiles([])
          setCandidates([])
          setCurrentRunId(null)
          setSelectedCandidate(null)
          setIsInspectorOpen(false)
          setIsUploadModalOpen(false)
          setJobLocation('')
          setJobType('Full-time')
          setUploadStatusMsg('')
          setIsJobLoading(false)
          setCurrentStep('setup')
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateJob = async () => {
    try {
      let res = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          title: 'Lowongan Baru',
          jd_text: '',
          location: '',
          employment_type: 'Full-time',
          external_ref: `JD-${Date.now().toString().slice(-6)}`,
        }),
      })
      if (res.status === 401) {
        const freshToken = await loginRecruiter()
        if (freshToken) {
          res = await fetch('/api/v1/jobs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${freshToken}`,
            },
            body: JSON.stringify({
              title: 'Lowongan Baru',
              jd_text: '',
              location: '',
              employment_type: 'Full-time',
              external_ref: `JD-${Date.now().toString().slice(-6)}`,
            }),
          })
        }
      }
      if (res.ok) {
        const newJob = await res.json()
        const jobId = newJob.id
        const finalTitle = newJob.title || 'Lowongan Baru'

        // Stop background polling of previous job
        stopPollingJobCvs()

        // 1. Update available jobs dropdown list
        setAvailableJobs((prev) => {
          const next = [{ id: jobId, title: finalTitle, cv_count: 0 }, ...prev]
          try {
            localStorage.setItem('cv_screening_available_jobs', JSON.stringify(next))
          } catch {}
          return next
        })

        // 2. Direct clean purge of previous job state
        loadedJobIdRef.current = jobId
        setCurrentJobId(jobId)
        currentJobIdRef.current = jobId
        setJobTitleState('')
        try {
          localStorage.setItem('cv_screening_job_title', '')
        } catch {}
        setCurrentJobTitle(finalTitle)
        setJobDescription('')
        setRequirements([])
        setCategoryWeights({
          EXPERIENCE: 40,
          HARD_SKILLS: 30,
          EDUCATION_CERT: 15,
          ACHIEVEMENT: 15,
        })
        setApprovedSnapshot(null)
        setCriteriaVersion(1)
        setUploadedFiles([])
        setCandidates([])
        setCurrentRunId(null)
        setSelectedCandidate(null)
        setIsInspectorOpen(false)
        setIsUploadModalOpen(false)
        setJobLocation('')
        setJobType('Full-time')
        setUploadStatusMsg('')
        setIsJobLoading(false)

        // 3. Immediately direct navigation to Step 1 (Setup)
        setCurrentStep('setup')

        // 4. Tactile toast notification
        showToast('Lowongan baru dibuat. Silakan isi judul & deskripsi di form setup.', 'success')
      } else {
        showToast('Gagal membuat lowongan baru. Silakan coba lagi.', 'warning')
      }
    } catch (e) {
      console.error(e)
      showToast('Terjadi kesalahan saat membuat lowongan.', 'warning')
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
                full_text: detail.full_text || prev.full_text,
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
    (
      cv_id: string,
      decision?: 'SHORTLIST' | 'HOLD' | 'TIDAK_LANJUT' | 'NONE' | '' | null
    ) => {
      const normalizedDecision =
        !decision || decision === 'NONE' ? undefined : decision
      setCandidates((prev) =>
        prev.map((c) => (c.cv_id === cv_id ? { ...c, decision: normalizedDecision } : c))
      )
      setSelectedCandidate((prev) =>
        prev && prev.cv_id === cv_id ? { ...prev, decision: normalizedDecision } : prev
      )
      const labelMap: Record<string, string> = {
        SHORTLIST: 'Shortlist',
        HOLD: 'Hold',
        TIDAK_LANJUT: 'Tidak Lanjut',
      }
      const label = normalizedDecision
        ? labelMap[normalizedDecision] || normalizedDecision
        : 'Belum Diputuskan'
      showToast(`Status kandidat diperbarui -> ${label}`, 'success')
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
        const res = await fetch(`/api/v1/jobs/${currentJobId}/cvs`, {
          method: 'DELETE',
          headers: { ...getAuthHeaders() },
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          showToast(`Gagal mengosongkan berkas di server: ${errData.detail || res.statusText}`, 'error')
          return
        }
      } catch (e) {
        console.warn('Clear CVs backend note:', e)
        showToast('Koneksi jaringan terputus saat mengosongkan berkas.', 'error')
        return
      }
    }
    setUploadedFiles([])
    setCandidates([])
    setSelectedCandidate(null)
    setCurrentRunId(null)
    showToast('Daftar berkas CV dan hasil evaluasi berhasil dikosongkan.', 'info')
  }, [currentJobId, getAuthHeaders, showToast, uploadedFiles.length])

  const handleCompileFromJd = async () => {
    if (debounceTitleTimerRef.current) {
      clearTimeout(debounceTitleTimerRef.current)
    }
    if (jobTitleRef.current.trim() && currentJobIdRef.current) {
      await syncJobTitleToBackend(jobTitleRef.current.trim())
    }
    if (!jobDescription.trim()) return
    setIsCompiling(true)
    try {
      const jId = currentJobId || (await ensureJobExists())
      if (jId) {
        await fetch(`/api/v1/jobs/${jId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ jd_text: jobDescription }),
        })
      }

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
          setApprovedSnapshot(null)
          const targetVer = criteriaVersion || 1
          setCriteriaVersion(targetVer)

          if (jId) {
            await fetch(`/api/v1/jobs/${jId}/requirements/import-approved`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
              body: JSON.stringify({
                requirement_set_version: targetVer,
                category_weights: data.category_weights || categoryWeights,
                requirements: data.requirements,
                status: 'DRAFT',
              }),
            })
          }

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
    if (requirements.length === 0) {
      showToast('Tambahkan minimal 1 kriteria sebelum menyetujui.', 'warning')
      return
    }
    const nextVer = approvedSnapshot !== null ? criteriaVersion + 1 : criteriaVersion
    setCriteriaVersion(nextVer)
    const newSnapshot = createCriteriaSnapshot(requirements, categoryWeights)
    setApprovedSnapshot(newSnapshot)

    try {
      const jId = currentJobId || (await ensureJobExists())
      if (jId) {
        const importRes = await fetch(`/api/v1/jobs/${jId}/requirements/import-approved`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            requirement_set_version: nextVer,
            category_weights: categoryWeights,
            requirements: requirements,
            status: 'DRAFT',
          }),
        })
        if (!importRes.ok) {
          const errData = await importRes.json().catch(() => ({}))
          showToast(errData.detail?.message || 'Gagal menyimpan draf kriteria.', 'warning')
          return
        }
        const approveRes = await fetch(`/api/v1/jobs/${jId}/requirements/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        })
        if (!approveRes.ok) {
          const errData = await approveRes.json().catch(() => ({}))
          showToast(errData.detail?.message || 'Gagal menyetujui kriteria.', 'warning')
          return
        }
      }
      showToast(`Kriteria v${nextVer} berhasil disetujui & dikunci!`, 'success')
    } catch (e) {
      console.warn('Requirements persist error:', e)
      showToast(`Kriteria v${nextVer} berhasil disetujui!`, 'success')
    }
  }

  // Modal dismissal listener for Escape key (safe, standard dialog accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isInspectorOpen) {
          e.preventDefault()
          setIsInspectorOpen(false)
          return
        }
        if (isUploadModalOpen) {
          e.preventDefault()
          setIsUploadModalOpen(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isInspectorOpen, isUploadModalOpen])

  // Lifecycle init — non-blocking single execution on mount
  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    let isMounted = true
    const init = async () => {
      const existingToken = localStorage.getItem('cv_screening_token')
      if (existingToken) {
        // Gunakan token yang sudah ada secara langsung tanpa re-login paralel
        await fetchJobsList(existingToken)
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
          isSetupCompleted={Boolean(currentJobId || (jobTitle.trim() && jobDescription.trim()))}
          criteriaCount={requirements.length}
          criteriaApproved={criteriaApproved}
          uploadedCount={uploadedFiles.length}
          readyCvCount={uploadedFiles.filter((f) => f.status === 'ready').length}
          candidatesCount={candidates.length}
          showToast={showToast}
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
            requirementsCount={requirements.length}
            criteriaApproved={criteriaApproved}
            criteriaVersion={criteriaVersion}
            isCompiling={isCompiling}
            isLoading={isJobLoading}
            onCompileFromJd={handleCompileFromJd}
            onBlurTitle={handleBlurTitle}
            onBlurDetails={handleBlurDetails}
            onSelectTemplate={handleSelectTemplate}
            onNext={() => {
              if (debounceTitleTimerRef.current) {
                clearTimeout(debounceTitleTimerRef.current)
              }
              if (jobTitleRef.current.trim() && currentJobIdRef.current) {
                syncJobTitleToBackend(jobTitleRef.current.trim())
              }
              handleBlurDetails()
              setCurrentStep('criteria')
            }}
          />
        )}

        {currentStep === 'criteria' && (
          <div className="flex-1 flex flex-col overflow-hidden relative bg-[#F2F5F3]">
            {/* Ergonomic Centered Criteria Studio Container */}
            <div className="flex-1 flex flex-col overflow-hidden max-w-6xl 2xl:max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 min-h-0">
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
                isLocked={isCriteriaLocked}
                isDirty={isCriteriaDirty}
                approvedSnapshot={approvedSnapshot}
                showToast={showToast}
                onCompileFromJd={handleCompileFromJd}
                onApproveCriteria={handleApproveCriteria}
                onBack={() => setCurrentStep('setup')}
                onNext={() => setCurrentStep('upload')}
              />
            </div>
          </div>
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
          <div className="flex-1 flex flex-col overflow-hidden relative bg-[#F2F5F3]">
            {/* Ergonomic Centered Workbench Container */}
            <div className="flex-1 flex flex-col overflow-hidden max-w-6xl 2xl:max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 min-h-0">
              {/* Elevated Workbench Card */}
              <CandidateRoster
                candidates={candidates}
                requirements={requirements}
                selectedCandidateId={selectedCandidate?.cv_id || null}
                onSelectCandidate={handleSelectCandidate}
                blindMode={blindMode}
                onToggleBlindMode={() => setBlindMode((prev) => !prev)}
                onDecision={handleDecision}
                onRevealCandidate={handleRevealCandidate}
                onOpenInspector={handleOpenInspector}
              />
            </div>

            {/* Focused Candidate Inspector (Slide-over with Progressive Disclosure) */}
            <CandidateInspector
              isOpen={isInspectorOpen}
              onClose={handleCloseInspector}
              candidate={selectedCandidate}
              requirements={requirements}
              blindMode={blindMode}
              onDecision={handleDecision}
              onRevealCandidate={handleRevealCandidate}
              initialTab={inspectorInitialTab}
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
          onClick={dismissToast}
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[90vw] sm:max-w-md w-auto transition-all duration-200 animate-in fade-in slide-in-from-top-3 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center space-x-2.5 cursor-pointer shadow-tactile-lg ${
            toast.type === 'error'
              ? 'bg-[#FCEBEB] text-[#8C1819] border-[#F6C1C1]'
              : toast.type === 'success'
              ? 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD]'
              : toast.type === 'warning'
              ? 'bg-[#FEF6E8] text-[#7A3E02] border-[#F8D8A7]'
              : 'bg-[#FCFDFC] text-[#13221C] border-[#D5DFD9]'
          }`}
        >
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-[#8C1819]" />}
          {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0 text-[#7A3E02]" />}
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-[#124B2E]" />}
          {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-[#1B4938]" />}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              dismissToast()
            }}
            aria-label="Tutup notifikasi"
            className="p-0.5 -mr-1 rounded-md opacity-60 hover:opacity-100 transition-opacity focus:outline-none"
          >
            <X className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      )}
    </div>
  )
}
