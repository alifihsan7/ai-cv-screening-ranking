import React from 'react'
import { Check } from 'lucide-react'
import type { WorkflowStep } from '../types'

export interface WorkflowStepperProps {
  currentStep: WorkflowStep
  onStepChange: (step: WorkflowStep) => void
  criteriaCount?: number
  criteriaApproved?: boolean
  uploadedCount?: number
  readyCvCount?: number
  candidatesCount?: number
  className?: string
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
    label: 'Workbench Skrining',
    sublabel: 'Forensik & Ranking',
  },
]

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  onStepChange,
  criteriaCount = 0,
  uploadedCount = 0,
  readyCvCount = 0,
  candidatesCount = 0,
  className = '',
}) => {
  const stepOrder: WorkflowStep[] = ['setup', 'criteria', 'upload', 'workbench']
  const currentIdx = stepOrder.indexOf(currentStep)

  // Pure progressive funnel logic: only previous steps in sequence are completed
  const isCompleted = (idx: number): boolean => {
    return idx < currentIdx
  }

  const getStepBadge = (stepId: WorkflowStep): string | undefined => {
    if (stepId === 'criteria') {
      return criteriaCount > 0 ? `(${criteriaCount})` : undefined
    }
    if (stepId === 'upload') {
      const count = readyCvCount > 0 ? readyCvCount : uploadedCount
      return count > 0 ? `(${count} CV)` : undefined
    }
    if (stepId === 'workbench') {
      return candidatesCount > 0 ? `(${candidatesCount})` : undefined
    }
    return undefined
  }

  return (
    <nav
      aria-label="Workflow Stepper"
      className={`flex items-center justify-center ${className}`}
    >
      <ol className="flex items-center">
        {STEPS.map((step, idx) => {
          const isActive = currentStep === step.id
          const completed = isCompleted(idx)
          const isPassed = idx < currentIdx
          const badgeText = getStepBadge(step.id)

          let pillClasses =
            'relative h-8 px-2.5 sm:px-3 rounded-lg text-xs flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] focus-visible:ring-offset-1 select-none active:scale-[0.98] shrink-0'

          if (isActive) {
            pillClasses += ' bg-[#EBF1EE] text-[#13221C] border border-[#1B4938] shadow-tactile-sm font-bold'
          } else if (completed) {
            pillClasses += ' bg-[#EBF6EF] text-[#1B6C47] border border-[#BBE5CD] hover:bg-[#DEF0E4] font-semibold'
          } else {
            pillClasses += ' bg-[#FCFDFC] text-[#40564D] border border-[#D5DFD9] hover:bg-[#F2F5F3] hover:text-[#13221C] font-medium'
          }

          return (
            <li key={step.id} className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => onStepChange(step.id)}
                aria-current={isActive ? 'step' : undefined}
                className={pillClasses}
                title={`${step.stepNum}. ${step.label} (${step.sublabel})`}
              >
                {/* Single Status Circle (Number or Checkmark) */}
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] tabular-nums font-bold shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#1B4938] text-[#FCFDFC]'
                      : completed
                      ? 'bg-[#1B6C47] text-[#FCFDFC]'
                      : 'bg-[#D5DFD9] text-[#40564D]'
                  }`}
                >
                  {completed ? (
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
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
                    className={`whitespace-nowrap font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                      isActive
                        ? 'bg-[#1B4938]/12 text-[#1B4938] border border-[#1B4938]/20'
                        : completed
                        ? 'bg-[#DEF0E4] text-[#1B6C47] border border-[#BBE5CD]'
                        : 'bg-[#EBF1EE] text-[#40564D] border border-[#D5DFD9]'
                    }`}
                  >
                    {badgeText}
                  </span>
                )}
              </button>

              {/* Proportional Connector Line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`w-6 sm:w-10 h-[2px] mx-1 sm:mx-1.5 rounded-full transition-colors shrink-0 ${
                    isPassed ? 'bg-[#1B6C47]' : 'bg-[#D5DFD9]'
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
