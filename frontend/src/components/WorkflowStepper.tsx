import React from 'react'
import { Check, Lock } from 'lucide-react'
import type { WorkflowStep } from '../types'

export interface WorkflowStepperProps {
  currentStep: WorkflowStep
  onStepChange: (step: WorkflowStep) => void
  isSetupCompleted?: boolean
  criteriaCount?: number
  criteriaApproved?: boolean
  uploadedCount?: number
  readyCvCount?: number
  candidatesCount?: number
  className?: string
  showToast?: (msg: string, type?: 'info' | 'error' | 'warning' | 'success') => void
}

interface StepItem {
  id: WorkflowStep
  stepNum: number
  label: string
  sublabel: string
}

const STEPS: StepItem[] = [
  {
    id: 'setup',
    stepNum: 1,
    label: 'Setup Lowongan',
    sublabel: 'Peran & JD',
  },
  {
    id: 'criteria',
    stepNum: 2,
    label: 'Kriteria & Bobot',
    sublabel: 'Distribusi 100%',
  },
  {
    id: 'upload',
    stepNum: 3,
    label: 'Unggah Berkas CV',
    sublabel: 'Ingestion & Sanitasi',
  },
  {
    id: 'workbench',
    stepNum: 4,
    label: 'Workbench Screening',
    sublabel: 'Forensik & Ranking',
  },
]

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  onStepChange,
  isSetupCompleted = false,
  criteriaCount = 0,
  criteriaApproved = false,
  uploadedCount = 0,
  readyCvCount = 0,
  candidatesCount = 0,
  className = '',
  showToast,
}) => {
  const stepOrder: WorkflowStep[] = ['setup', 'criteria', 'upload', 'workbench']
  const currentIdx = stepOrder.indexOf(currentStep)

  // 1. Explicit Step Completion Status
  const isStepCompleted = (idx: number): boolean => {
    switch (idx) {
      case 0:
        return Boolean(isSetupCompleted)
      case 1:
        return Boolean(criteriaApproved)
      case 2:
        return readyCvCount > 0 || uploadedCount > 0
      case 3:
        return candidatesCount > 0
      default:
        return false
    }
  }

  // 2. Step Accessibility Rule:
  // - Accessible if: current step, or already completed, or all predecessors completed
  // - Locked if: any predecessor incomplete AND step itself is not completed
  const isStepAccessible = (targetIdx: number): boolean => {
    if (targetIdx === currentIdx) return true
    if (isStepCompleted(targetIdx)) return true
    for (let i = 0; i < targetIdx; i++) {
      if (!isStepCompleted(i)) {
        return false
      }
    }
    return true
  }

  const handleStepClick = (stepItem: StepItem, targetIdx: number) => {
    if (isStepAccessible(targetIdx)) {
      onStepChange(stepItem.id)
      return
    }

    // Actionable guidance for locked steps: identify the first unmet prerequisite
    for (let i = 0; i < targetIdx; i++) {
      if (!isStepCompleted(i)) {
        if (i === 0) {
          showToast?.(
            'Lengkapi Judul dan Deskripsi Pekerjaan di Langkah 1 terlebih dahulu!',
            'warning'
          )
        } else if (i === 1) {
          showToast?.(
            'Harap setujui kriteria di Langkah 2 terlebih dahulu sebelum masuk ke Unggah CV!',
            'warning'
          )
        } else if (i === 2) {
          showToast?.(
            'Unggah minimal 1 berkas CV di Langkah 3 terlebih dahulu!',
            'warning'
          )
        } else {
          showToast?.('Selesaikan langkah sebelumnya terlebih dahulu!', 'warning')
        }
        return
      }
    }

    showToast?.('Langkah ini belum dapat diakses.', 'warning')
  }

  const getStepBadge = (stepId: WorkflowStep): string | undefined => {
    if (stepId === 'criteria') {
      return criteriaCount > 0 ? `${criteriaCount}` : undefined
    }
    if (stepId === 'upload') {
      const count = readyCvCount > 0 ? readyCvCount : uploadedCount
      return count > 0 ? `${count} CV` : undefined
    }
    if (stepId === 'workbench') {
      return candidatesCount > 0 ? `${candidatesCount}` : undefined
    }
    return undefined
  }

  return (
    <nav
      aria-label="Workflow Stepper"
      className={`flex items-center justify-center ${className}`}
    >
      <ol className="flex items-center space-x-1 sm:space-x-1.5">
        {STEPS.map((step, idx) => {
          const isActive = currentStep === step.id
          const completed = isStepCompleted(idx)
          const accessible = isStepAccessible(idx)
          const isLocked = !accessible
          const badgeText = getStepBadge(step.id)

          let pillClasses =
            'relative h-8 px-2.5 sm:px-3 rounded-lg text-xs flex items-center space-x-1.5 sm:space-x-2 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] focus-visible:ring-offset-1'

          if (isActive) {
            pillClasses +=
              ' bg-[#EBF1EE] text-[#13221C] border border-[#1B4938] shadow-tactile-sm font-bold ring-1 ring-[#1B4938]/20 active:scale-[0.98]'
          } else if (completed) {
            pillClasses +=
              ' bg-[#DEF0E4] text-[#124B2E] border border-[#BBE5CD] hover:bg-[#DEF0E4]/80 font-semibold active:scale-[0.98]'
          } else if (isLocked) {
            pillClasses +=
              ' bg-[#F2F5F3] text-[#71877B] border border-[#D5DFD9] hover:bg-[#EAEFEA] hover:text-[#55695E] font-medium'
          } else {
            pillClasses +=
              ' bg-[#FCFDFC] text-[#2D4439] border border-[#D5DFD9] hover:bg-[#F2F5F3] hover:text-[#13221C] font-medium active:scale-[0.98]'
          }

          let stepTitle = `${step.stepNum}. ${step.label} (${step.sublabel})`
          if (isLocked) {
            stepTitle = `${step.stepNum}. ${step.label} (Terkunci - selesaikan langkah sebelumnya)`
          } else if (completed) {
            stepTitle = `${step.stepNum}. ${step.label} (Selesai)`
          }

          return (
            <li key={step.id} className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => handleStepClick(step, idx)}
                aria-current={isActive ? 'step' : undefined}
                aria-disabled={isLocked ? true : undefined}
                className={pillClasses}
                title={stepTitle}
              >
                {/* Single Status Circle (Number, Checkmark, or Lock) */}
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] tabular-nums font-bold shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#1B4938] text-[#FCFDFC]'
                      : completed
                      ? 'bg-[#124B2E] text-[#FCFDFC]'
                      : isLocked
                      ? 'bg-[#D5DFD9]/80 text-[#71877B]'
                      : 'bg-[#D5DFD9] text-[#2D4439]'
                  }`}
                >
                  {completed && !isActive ? (
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  ) : isLocked ? (
                    <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                  ) : (
                    step.stepNum
                  )}
                </span>

                {/* Step Label (Responsive: compact on mobile, full on tablet/desktop) */}
                <span className="tracking-tight whitespace-nowrap text-xs select-none hidden sm:inline">
                  {step.label}
                </span>
                <span className="tracking-tight whitespace-nowrap text-xs select-none sm:hidden">
                  {step.label.split(' ')[0]}
                </span>

                {/* Quantitative Badge with Non-wrapping Tabular Numerics */}
                {badgeText && (
                  <span
                    className={`whitespace-nowrap font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                      isActive
                        ? 'bg-[#1B4938]/12 text-[#1B4938] border border-[#1B4938]/20'
                        : completed
                        ? 'bg-[#DEF0E4] text-[#124B2E] border border-[#BBE5CD]'
                        : isLocked
                        ? 'bg-[#E5EAE7] text-[#71877B] border border-[#D5DFD9]'
                        : 'bg-[#EBF1EE] text-[#2D4439] border border-[#D5DFD9]'
                    }`}
                  >
                    {badgeText}
                  </span>
                )}
              </button>

              {/* Proportional Connector Line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`w-4 sm:w-8 h-[2px] mx-1 rounded-full transition-colors duration-150 shrink-0 ${
                    isStepCompleted(idx) ? 'bg-[#124B2E]' : 'bg-[#D5DFD9]'
                  }`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
