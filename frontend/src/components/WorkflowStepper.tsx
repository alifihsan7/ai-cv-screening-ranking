import React from 'react'
import { Briefcase, Sliders, Upload, Trophy, Check } from 'lucide-react'
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
  icon: React.ComponentType<{ className?: string }>
}

const STEPS: StepItem[] = [
  {
    id: 'setup',
    stepNum: 1,
    label: 'Setup Lowongan',
    sublabel: 'Peran & JD',
    icon: Briefcase,
  },
  {
    id: 'criteria',
    stepNum: 2,
    label: 'Kriteria & Bobot',
    sublabel: 'Distribusi 100%',
    icon: Sliders,
  },
  {
    id: 'upload',
    stepNum: 3,
    label: 'Unggah Berkas CV',
    sublabel: 'Ingestion & Sanitasi',
    icon: Upload,
  },
  {
    id: 'workbench',
    stepNum: 4,
    label: 'Workbench Skrining',
    sublabel: 'Forensik & Ranking',
    icon: Trophy,
  },
]

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  onStepChange,
  criteriaCount = 0,
  criteriaApproved = false,
  uploadedCount = 0,
  readyCvCount = 0,
  candidatesCount = 0,
  className = '',
}) => {
  const stepOrder: WorkflowStep[] = ['setup', 'criteria', 'upload', 'workbench']
  const currentIdx = stepOrder.indexOf(currentStep)

  const isCompleted = (stepId: WorkflowStep): boolean => {
    if (stepId === currentStep) return false
    if (stepId === 'setup') return currentIdx > 0
    if (stepId === 'criteria') return currentIdx > 1 || (criteriaApproved && criteriaCount > 0)
    if (stepId === 'upload') return currentIdx > 2 || readyCvCount > 0 || uploadedCount > 0
    if (stepId === 'workbench') return candidatesCount > 0
    return false
  }

  const getStepBadge = (step: StepItem) => {
    if (step.id === 'criteria') {
      return `(${criteriaCount})`
    }
    if (step.id === 'upload') {
      const count = readyCvCount > 0 ? readyCvCount : uploadedCount
      return count > 0 ? `(${count} CV)` : undefined
    }
    if (step.id === 'workbench') {
      return candidatesCount > 0 ? `(${candidatesCount})` : undefined
    }
    return undefined
  }

  return (
    <nav
      aria-label="Workflow Stepper"
      className={`inline-flex items-center bg-[#EBF1EE] p-1 rounded-xl border border-[#D5DFD9] shadow-tactile-sm ${className}`}
    >
      <ol className="flex items-center space-x-1">
        {STEPS.map((step, idx) => {
          const isActive = currentStep === step.id
          const completed = isCompleted(step.id)
          const badgeText = getStepBadge(step)
          const Icon = step.icon

          let buttonClasses =
            'relative h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4938] select-none active:scale-[0.98]'

          if (isActive) {
            buttonClasses += ' bg-[#1B4938] text-[#FCFDFC] shadow-tactile-sm font-bold'
          } else if (completed) {
            buttonClasses += ' bg-[#EBF6EF] text-[#1B6C47] hover:bg-[#DEF0E4] border border-[#BBE5CD]'
          } else {
            buttonClasses += ' text-[#40564D] hover:text-[#13221C] hover:bg-[#FCFDFC]'
          }

          return (
            <li key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => onStepChange(step.id)}
                aria-current={isActive ? 'step' : undefined}
                className={buttonClasses}
                title={`${step.stepNum}. ${step.label} (${step.sublabel})`}
              >
                {/* Number Badge or Checkmark */}
                <span
                  className={`w-4.5 h-4.5 rounded-full flex items-center justify-center font-mono text-[10px] tabular-nums font-bold shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#FCFDFC] text-[#1B4938]'
                      : completed
                      ? 'bg-[#1B6C47] text-[#FCFDFC]'
                      : 'bg-[#D5DFD9] text-[#40564D]'
                  }`}
                >
                  {completed ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.stepNum}
                </span>

                {/* Step Label */}
                <div className="flex items-center space-x-1.5">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive
                        ? 'text-[#FCFDFC]'
                        : completed
                        ? 'text-[#1B6C47]'
                        : 'text-[#40564D]'
                    }`}
                  />
                  <span className="tracking-tight whitespace-nowrap hidden sm:inline">
                    {step.label}
                  </span>
                  <span className="tracking-tight whitespace-nowrap sm:hidden">
                    {step.stepNum}
                  </span>
                </div>

                {/* Quantitative Badge */}
                {badgeText && (
                  <span
                    className={`font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded font-semibold ${
                      isActive
                        ? 'bg-[#2D6A4F] text-[#FCFDFC]'
                        : completed
                        ? 'bg-[#DEF0E4] text-[#1B6C47]'
                        : 'bg-[#EBF1EE] text-[#40564D]'
                    }`}
                  >
                    {badgeText}
                  </span>
                )}
              </button>

              {/* Step Connector line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`w-2 h-0.5 mx-0.5 rounded transition-colors hidden md:block ${
                    idx < currentIdx ? 'bg-[#1B6C47]' : 'bg-[#D5DFD9]'
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
