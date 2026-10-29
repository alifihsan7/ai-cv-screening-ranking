import React from 'react'
import { Activity, ShieldCheck, Cpu, DollarSign, CheckCircle2, Lock, FileText } from 'lucide-react'
import type { ScreeningTelemetry, Requirement } from '../types'
import {
  getCriterionEvaluationMeta,
  type CriterionEvaluationMeta,
} from '../utils/telemetry'

export interface ScreeningTelemetryPanelProps {
  telemetry: ScreeningTelemetry
  className?: string
  compact?: boolean
}

/**
 * Screening Telemetry Summary Panel
 * Designed according to Anti-Slop Avionics doctrine:
 * High-density monospace tabular metrics, hairline borders, structured tactile surface,
 * zero AI-slop gradients.
 */
export const ScreeningTelemetryPanel: React.FC<ScreeningTelemetryPanelProps> = ({
  telemetry,
  className = '',
  compact = false,
}) => {
  return (
    <div
      className={`rounded-xl border border-[#D5DFD9] bg-[#F5F8F6] p-3 shadow-tactile-sm ${className}`}
      aria-label="Panel Telemetri Inferensi Jev Hybrid"
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5DFD9] pb-2 mb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-[#124B2E] animate-pulse" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#13221C]">
            Telemetri Audit Jev Hybrid (Mode 3)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border font-bold bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD]">
            LIVE TYPESAFE
          </span>
          <span className="font-mono text-[9px] text-[#2D4439]">
            Grounding Guardrail Active
          </span>
        </div>
      </div>

      {/* Avionics 4-Metric Grid */}
      <div
        className={`grid ${
          compact
            ? 'grid-cols-2 gap-2'
            : 'grid-cols-2 sm:grid-cols-4 gap-2.5'
        }`}
      >
        {/* Metric 1: Active Mode */}
        <div className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg p-2.5 space-y-1 shadow-tactile-sm">
          <div className="flex items-center justify-between text-[#2D4439]">
            <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">
              Mode Evaluasi
            </span>
            <ShieldCheck className="w-3 h-3 text-[#124B2E]" />
          </div>
          <div className="font-mono text-xs font-bold text-[#13221C] break-words" title={telemetry.mode}>
            {telemetry.mode}
          </div>
          <p className="text-[10px] text-[#2D4439] font-mono leading-tight">
            Dual-Layer Dispatch
          </p>
        </div>

        {/* Metric 2: Latency p50 / p95 */}
        <div className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg p-2.5 space-y-1 shadow-tactile-sm">
          <div className="flex items-center justify-between text-[#2D4439]">
            <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">
              Latensi Rata-Rata
            </span>
            <Activity className="w-3 h-3 text-[#1B4938]" />
          </div>
          <div className="font-mono text-xs font-bold text-[#13221C] tabular-nums">
            p50: <span className="text-[#124B2E]">{telemetry.latency_p50_ms}ms</span> · p95:{' '}
            <span className="text-[#7A3E02]">{telemetry.latency_p95_ms}ms</span>
          </div>
          <p className="text-[10px] text-[#2D4439] font-mono leading-tight">
            Target SLA &lt; 300ms
          </p>
        </div>

        {/* Metric 3: Tokens & Estimated Cost */}
        <div className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg p-2.5 space-y-1 shadow-tactile-sm">
          <div className="flex items-center justify-between text-[#2D4439]">
            <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">
              Token & Biaya Run
            </span>
            <DollarSign className="w-3 h-3 text-[#124B2E]" />
          </div>
          <div className="font-mono text-xs font-bold text-[#13221C] tabular-nums">
            {telemetry.total_inference_tokens} tok · &lt; $0.001
          </div>
          <p className="text-[10px] text-[#2D4439] font-mono leading-tight">
            Rule Gate: $0.00
          </p>
        </div>

        {/* Metric 4: Grounding Pass Rate */}
        <div className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg p-2.5 space-y-1 shadow-tactile-sm">
          <div className="flex items-center justify-between text-[#2D4439]">
            <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">
              Grounding Pass
            </span>
            <CheckCircle2 className="w-3 h-3 text-[#124B2E]" />
          </div>
          <div className="font-mono text-xs font-bold text-[#124B2E] tabular-nums">
            {telemetry.grounding_pass_rate_pct}% Verbatim
          </div>
          <p className="text-[10px] text-[#2D4439] font-mono leading-tight">
            Exact Substring Guard
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Tactile badge for Dual-Layer Criteria Evaluation
 * Rule Gate: [RULE_GATE • $0.00]
 * Jev System One: [JEV · NOUL] / [JEV · SCORE] / [JEV · CHOICE]
 */
export const DualLayerCriterionBadge: React.FC<{
  req: Requirement
  className?: string
}> = ({ req, className = '' }) => {
  const meta: CriterionEvaluationMeta = getCriterionEvaluationMeta(req)

  if (meta.isDeterministic) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded border bg-[#EBF1EE] text-[#13221C] border-[#D5DFD9] shadow-tactile-sm select-none ${className}`}
        title={meta.layerDescription}
      >
        <Lock className="w-2.5 h-2.5 text-[#1B4938] shrink-0" />
        <span>{meta.layerBadgeLabel}</span>
      </span>
    )
  }

  // Jev System One Primitives styling
  let badgeColors = 'bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD]'
  if (meta.primitive === 'SCORE') {
    badgeColors = 'bg-[#FEF6E8] text-[#7A3E02] border-[#F8D8A7]'
  } else if (meta.primitive === 'CHOICE') {
    badgeColors = 'bg-[#F0F4F8] text-[#1B365D] border-[#C8D7E6]'
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded border shadow-tactile-sm select-none ${badgeColors} ${className}`}
      title={meta.layerDescription}
    >
      <Cpu className="w-2.5 h-2.5 shrink-0" />
      <span>{meta.layerBadgeLabel}</span>
    </span>
  )
}

/**
 * Chip/Badge for Verbatim Grounding Verification on Evidence Quotes
 */
export const VerbatimGroundingChip: React.FC<{
  isGrounded?: boolean
  className?: string
}> = ({ isGrounded = true, className = '' }) => {
  if (isGrounded) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD] shadow-tactile-sm select-none ${className}`}
        title="100% Substring Grounded: Kutipan teks terverifikasi eksak di dokumen CV asli (Zero Hallucination)"
      >
        <CheckCircle2 className="w-2.5 h-2.5 text-[#124B2E] shrink-0" />
        <span>VERBATIM_GROUNDED ✓</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border bg-[#F0F4F8] text-[#1E3A5F] border-[#CBD5E1] shadow-tactile-sm select-none ${className}`}
      title="Makna bukti selaras dengan kriteria (sintesis semantik/relevansi kontekstual)"
    >
      <FileText className="w-2.5 h-2.5 text-[#1E3A5F] shrink-0" />
      <span>SEMANTIC MATCH</span>
    </span>
  )
}
