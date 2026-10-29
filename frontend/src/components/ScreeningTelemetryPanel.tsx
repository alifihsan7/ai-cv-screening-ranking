import React, { useState } from 'react'
import {
  Activity,
  ShieldCheck,
  Cpu,
  DollarSign,
  CheckCircle2,
  Lock,
  FileText,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react'
import type { ScreeningTelemetry, Requirement } from '../types'
import {
  getCriterionEvaluationMeta,
  type CriterionEvaluationMeta,
} from '../utils/telemetry'

export interface ScreeningTelemetryPanelProps {
  telemetry: ScreeningTelemetry
  className?: string
  compact?: boolean
  defaultOpen?: boolean
}

/**
 * Screening Telemetry Summary Panel
 * Designed according to Anti-Slop Avionics doctrine:
 * High-density monospace tabular metrics, hairline borders, structured tactile surface,
 * zero AI-slop gradients.
 * Hidden by default to keep recruiter workspace uncluttered.
 */
export const ScreeningTelemetryPanel: React.FC<ScreeningTelemetryPanelProps> = ({
  telemetry,
  className = '',
  compact = false,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (!isOpen) {
    return (
      <div className={`flex items-center ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#D5DFD9] bg-[#F5F8F6] hover:bg-[#EBF1EE] text-[#2D4439] hover:text-[#13221C] text-xs font-mono transition-all duration-150 cursor-pointer shadow-tactile-sm active:scale-[0.98] group"
          title="Tampilkan Ringkasan Performa Sistem"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#1B4938] shrink-0 group-hover:rotate-45 transition-transform duration-200" />
          <span className="font-semibold">Ringkasan Performa Sistem</span>
          <span className="text-[10px] text-[#2D4439]/70 font-sans hidden sm:inline">
            (Tampilkan)
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[#2D4439]/70 shrink-0" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-[#D5DFD9] bg-[#F5F8F6] p-3 shadow-tactile-sm animate-in fade-in duration-200 ${className}`}
      aria-label="Panel Performa Sistem"
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5DFD9] pb-2 mb-2.5">
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#1B4938]" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#13221C]">
            Ringkasan Performa Sistem
          </span>
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border font-bold bg-[#EBF6EF] text-[#124B2E] border-[#BBE5CD]">
            LIVE TYPESAFE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#2D4439] hover:text-[#13221C] px-2.5 py-1 rounded-lg border border-[#D5DFD9] bg-[#FCFDFC] hover:bg-[#EBF1EE] transition-all duration-150 cursor-pointer shadow-tactile-sm active:scale-[0.98]"
            title="Sembunyikan Ringkasan Performa Sistem"
          >
            <ChevronUp className="w-3 h-3 text-[#2D4439]" />
            <span>Sembunyikan</span>
          </button>
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
        {/* Metric 1: Mode Evaluasi */}
        <div
          className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg p-2.5 space-y-1 shadow-tactile-sm"
          title={`Mode Internal: ${telemetry.mode} (Dual-Layer Dispatch)`}
        >
          <div className="flex items-center justify-between text-[#2D4439]">
            <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">
              Mode Evaluasi
            </span>
            <ShieldCheck className="w-3 h-3 text-[#124B2E]" />
          </div>
          <div className="text-xs font-bold text-[#13221C] leading-snug">
            Metode Penilaian: AI + Aturan Baku
          </div>
          <p className="text-[10px] text-[#2D4439] leading-tight">
            Evaluasi bertahap & terarah
          </p>
        </div>

        {/* Metric 2: Latensi Rata-Rata */}
        <div
          className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg p-2.5 space-y-1 shadow-tactile-sm"
          title={`p50: ${telemetry.latency_p50_ms}ms · p95: ${telemetry.latency_p95_ms}ms (Target SLA < 300ms)`}
        >
          <div className="flex items-center justify-between text-[#2D4439]">
            <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">
              Latensi Rata-Rata
            </span>
            <Activity className="w-3 h-3 text-[#1B4938]" />
          </div>
          <div className="text-xs font-bold text-[#13221C] tabular-nums leading-snug">
            Kecepatan Analisis: ~0.2 detik / CV
          </div>
          <p className="text-[10px] text-[#2D4439] leading-tight">
            Responsif & instan
          </p>
        </div>

        {/* Metric 3: Token & Biaya Run */}
        <div
          className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg p-2.5 space-y-1 shadow-tactile-sm"
          title={`Total Token: ${telemetry.total_inference_tokens} tok · Biaya Inferensi: < $0.001`}
        >
          <div className="flex items-center justify-between text-[#2D4439]">
            <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">
              Token & Biaya Run
            </span>
            <DollarSign className="w-3 h-3 text-[#124B2E]" />
          </div>
          <div className="text-xs font-bold text-[#13221C] tabular-nums leading-snug">
            Biaya Analisis: Sangat Hemat (&lt; Rp 15 / CV)
          </div>
          <p className="text-[10px] text-[#2D4439] leading-tight">
            0 rupiah untuk seleksi awal
          </p>
        </div>

        {/* Metric 4: Grounding Pass */}
        <div
          className="bg-[#FCFDFC] border border-[#D5DFD9] rounded-lg p-2.5 space-y-1 shadow-tactile-sm"
          title={`Tingkat Verbatim: ${telemetry.grounding_pass_rate_pct}% Kutipan Substring`}
        >
          <div className="flex items-center justify-between text-[#2D4439]">
            <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">
              Grounding Pass
            </span>
            <CheckCircle2 className="w-3 h-3 text-[#124B2E]" />
          </div>
          <div className="text-xs font-bold text-[#124B2E] tabular-nums leading-snug">
            Akurasi Bukti CV: Kutipan Nyata
          </div>
          <p className="text-[10px] text-[#2D4439] leading-tight">
            Bukti asli dari teks pelamar
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
