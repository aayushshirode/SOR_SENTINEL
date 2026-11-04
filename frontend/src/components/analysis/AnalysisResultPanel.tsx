// SOR SENTINEL — Cyber Threat Intelligence Analysis Result Panel
import React, { useState } from 'react';
import {
  AlertTriangle, Shield, CheckCircle, Info, BookOpen,
  AlertCircle, TrendingDown, ExternalLink, Clock, Copy, Check,
  Share2, ShieldAlert, Cpu, Terminal, Sparkles, ChevronDown, ChevronUp,
  FileText, Globe, ShieldCheck
} from 'lucide-react';
import type { AnalysisResponse, AnalysisFinding, SourceReference } from '@/types';
import { formatKolkataDateTime } from '@/utils/date';
import toast from 'react-hot-toast';

interface AnalysisResultPanelProps {
  analysis: AnalysisResponse;
}

function CredibilityGauge({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const isHigh = pct >= 70;
  const isMed = pct >= 40 && pct < 70;

  const colorClass = isHigh ? 'text-emerald-400' : isMed ? 'text-amber-400' : 'text-red-400';
  const strokeColor = isHigh ? '#10b981' : isMed ? '#f59e0b' : '#ef4444';
  const label = isHigh ? 'High Credibility' : isMed ? 'Moderate Concern' : 'Elevated Threat';

  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          {/* Background Track */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="#1e2d4f" strokeWidth="8" />
          {/* Animated Progress Ring */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />
        </svg>

        {/* Centered Score Inside Ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
          <span className={`text-3xl font-extrabold font-space leading-none ${colorClass}`}>
            {pct}
          </span>
          <span className="text-[10px] font-rajdhani font-bold uppercase tracking-wider text-[#8fa3bf] mt-1">
            Score / 100
          </span>
        </div>
      </div>

      <div className="text-center mt-2">
        <span className={`text-xs font-bold font-rajdhani uppercase tracking-wider ${colorClass}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

function SensitivityBadge({ level }: { level?: string }) {
  const map: Record<string, { color: string; bg: string; border: string; desc: string }> = {
    LOW:      { color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', desc: 'No sensitive data detected' },
    MEDIUM:   { color: 'text-yellow-400',  bg: 'bg-yellow-500/15',  border: 'border-yellow-500/30',  desc: 'Potential contextual exposure' },
    HIGH:     { color: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  desc: 'PII or confidential disclosures' },
    CRITICAL: { color: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/30',     desc: 'Severe security or credential leak' },
  };
  const key = (level || 'LOW').toUpperCase();
  const s = map[key] ?? map['LOW'];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-rajdhani font-bold tracking-wider uppercase border ${s.bg} ${s.border} ${s.color}`}>
        <Shield className="w-3.5 h-3.5" />
        {key} SENSITIVITY
      </span>
      <span className="text-[11px] font-plex text-[#8fa3bf] text-center max-w-[160px]">
        {s.desc}
      </span>
    </div>
  );
}

function AssessmentBadge({ assessment }: { assessment?: string }) {
  const lower = (assessment || 'INCONCLUSIVE').toLowerCase();
  const isPositive = lower.includes('credible') || lower.includes('legitimate') || lower.includes('low concern');
  const isNeutral = lower.includes('verification') || lower.includes('inconclusive') || lower.includes('mixed') || lower.includes('moderate');

  const color = isPositive
    ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    : isNeutral
    ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    : 'text-red-400 bg-red-500/15 border-red-500/30';

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-sm font-bold font-rajdhani uppercase tracking-wider border shadow-sm ${color}`}>
      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      {assessment || 'REQUIRES VERIFICATION'}
    </span>
  );
}

const findingIcons = {
  credibility_concern:  { icon: TrendingDown, color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/25',    label: 'Credibility Concerns & Claims' },
  misleading_indicator: { icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  label: 'Deceptive Language & Phishing Markers' },
  sensitive_content:    { icon: ShieldAlert,   color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', label: 'Sensitive Disclosures & PII' },
  recommendation:       { icon: CheckCircle,   color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/25',   label: 'Recommended Precautions & Actions' },
  general:              { icon: Info,          color: 'text-[#8fa3bf]',  bg: 'bg-white/5',       border: 'border-[#1e2d4f]',     label: 'Additional Security Findings' },
};

const severityStyles: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/40',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/40',
  medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  low:      'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  info:     'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
};

export function AnalysisResultPanel({ analysis }: AnalysisResultPanelProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState<Record<number, boolean>>({});

  const findings = analysis.findings ?? [];
  const refs = analysis.source_references ?? [];

  const grouped = {
    credibility_concern:  findings.filter((f: AnalysisFinding) => f.finding_type === 'credibility_concern'),
    misleading_indicator: findings.filter((f: AnalysisFinding) => f.finding_type === 'misleading_indicator'),
    sensitive_content:    findings.filter((f: AnalysisFinding) => f.finding_type === 'sensitive_content'),
    recommendation:       findings.filter((f: AnalysisFinding) => f.finding_type === 'recommendation'),
    general:              findings.filter((f: AnalysisFinding) => !['credibility_concern','misleading_indicator','sensitive_content','recommendation'].includes(f.finding_type)),
  };

  const handleCopySummary = () => {
    const textToCopy = `SOR SENTINEL THREAT REPORT #TR-${String(analysis.id).padStart(5, '0')}
Assessment: ${analysis.overall_assessment || 'N/A'}
Credibility Score: ${analysis.credibility_score ?? 'N/A'}/100
Sensitivity: ${analysis.sensitivity_level || 'N/A'}
Type: ${analysis.analysis_type}
Date: ${formatKolkataDateTime(analysis.created_at)}
Summary:
${analysis.summary || 'No summary provided.'}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    toast.success('Threat summary copied to clipboard');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const toggleFindingExpand = (id: number) => {
    setExpandedFindings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── 1. Threat Dossier Header Banner ─────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0c162b] to-[#121f3d] border border-[#1e2d4f] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
            {analysis.analysis_type === 'url' ? <Globe className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-rajdhani font-bold text-cyan-400 tracking-wider uppercase">
                SENTINEL-TR-{String(analysis.id).padStart(6, '0')}
              </span>
              <span className="text-[10px] font-rajdhani font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1e2d4f] text-[#8fa3bf]">
                {analysis.analysis_type.toUpperCase()} SCAN
              </span>
              <span className="text-[10px] font-rajdhani font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                STATUS: {analysis.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[#8fa3bf] mt-1 flex items-center gap-2 font-plex">
              <Clock className="w-3.5 h-3.5 text-[#4a6180]" />
              <span>{formatKolkataDateTime(analysis.created_at)}</span>
              {analysis.ai_model_used && (
                <>
                  <span className="text-[#1e2d4f]">•</span>
                  <span className="text-violet-400 font-rajdhani font-semibold tracking-wide">{analysis.ai_model_used}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-outfit font-medium text-[#8fa3bf] hover:text-[#e8edf5] bg-[#0f1629] hover:bg-white/5 border border-[#1e2d4f] transition-all"
            title="Copy structured summary"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSummary ? 'Copied' : 'Copy Summary'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Primary Assessment Matrix (Hero Row) ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Overall Assessment & Summary */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-[#131d35] border border-[#1e2d4f] shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4a6180] block mb-2">
              Primary Threat Assessment Verdict
            </span>
            <AssessmentBadge assessment={analysis.overall_assessment} />

            {analysis.summary && (
              <div className="mt-4 pt-4 border-t border-[#1e2d4f]/80">
                <span className="text-xs font-bold text-[#e8edf5] block mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  AI Synthesis & Threat Reasoning
                </span>
                <p className="text-xs sm:text-sm text-[#8fa3bf] leading-relaxed">
                  {analysis.summary}
                </p>
              </div>
            )}
          </div>

          {/* Target metadata */}
          <div className="pt-3 border-t border-[#1e2d4f] flex flex-wrap items-center justify-between gap-2 text-xs text-[#8fa3bf] font-mono">
            {analysis.url_analyzed ? (
              <div className="truncate max-w-md">
                <span className="text-[#4a6180]">Target URL: </span>
                <a
                  href={analysis.url_analyzed}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline break-all"
                >
                  {analysis.url_analyzed}
                </a>
              </div>
            ) : analysis.text_content ? (
              <div className="truncate max-w-md">
                <span className="text-[#4a6180]">Source Text: </span>
                <span className="text-[#e8edf5] italic">"{analysis.text_content.slice(0, 60)}..."</span>
              </div>
            ) : null}

            {analysis.processing_time_ms && (
              <span className="text-[11px] text-[#4a6180]">
                Latency: {analysis.processing_time_ms}ms
              </span>
            )}
          </div>
        </div>

        {/* Score & Sensitivity Meters */}
        <div className="p-6 rounded-2xl bg-[#131d35] border border-[#1e2d4f] shadow-xl flex flex-col items-center justify-center gap-6">
          <CredibilityGauge score={analysis.credibility_score ?? 0} />
          <div className="w-full pt-4 border-t border-[#1e2d4f] flex flex-col items-center">
            <span className="text-[10px] font-mono font-bold text-[#4a6180] uppercase tracking-wider mb-1.5">
              Data Sensitivity Rating
            </span>
            <SensitivityBadge level={analysis.sensitivity_level} />
          </div>
        </div>
      </div>

      {/* ── 3. Structured Findings by Group ──────────────────────────────────── */}
      {Object.entries(grouped).map(([type, items]) => {
        if (!items.length) return null;
        const cfg = findingIcons[type as keyof typeof findingIcons];
        const Icon = cfg.icon;

        return (
          <div key={type} className="p-6 rounded-2xl bg-[#131d35] border border-[#1e2d4f] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2d4f]">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${cfg.bg} ${cfg.border} border`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div>
                  <h3 className="font-bold text-[#e8edf5] text-sm sm:text-base">
                    {cfg.label}
                  </h3>
                  <p className="text-xs text-[#8fa3bf]">
                    Identified signals ({items.length} {items.length === 1 ? 'indicator' : 'indicators'})
                  </p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                {items.length} DETECTED
              </span>
            </div>

            <div className="space-y-3.5">
              {items.map((finding: AnalysisFinding) => {
                const isExpanded = expandedFindings[finding.id];
                const sev = (finding.severity || 'medium').toLowerCase();
                const sevStyle = severityStyles[sev] || severityStyles['medium'];

                return (
                  <div
                    key={finding.id}
                    className="p-4 rounded-xl bg-[#0f1629] border border-[#1e2d4f] space-y-2 hover:border-[#253556] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-[#e8edf5] text-sm">
                            {finding.title}
                          </h4>
                          {finding.category && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e2d4f] text-[#8fa3bf]">
                              {finding.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {finding.severity && (
                        <span className={`px-2 py-0.5 text-[11px] font-mono font-bold uppercase rounded-md border shrink-0 ${sevStyle}`}>
                          {finding.severity}
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-[#8fa3bf] leading-relaxed">
                      {finding.description}
                    </p>

                    {/* Extracted Evidence Quote Box */}
                    {finding.evidence && (
                      <div className="mt-2.5 p-3 rounded-lg bg-[#080d17] border border-[#1e2d4f] text-xs">
                        <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] uppercase font-bold mb-1">
                          <Terminal className="w-3 h-3" />
                          Detected Content Evidence:
                        </div>
                        <p className="text-xs text-[#e8edf5] font-mono italic leading-relaxed pl-2 border-l-2 border-cyan-500/40">
                          "{finding.evidence}"
                        </p>
                      </div>
                    )}

                    {/* Confidence Indicator */}
                    {finding.confidence_level != null && (
                      <div className="pt-2 flex items-center gap-3 text-xs text-[#4a6180] font-mono">
                        <span>Confidence Level:</span>
                        <div className="flex-1 max-w-[140px] h-1.5 rounded-full bg-[#1e2d4f] overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 transition-all duration-300"
                            style={{ width: `${Math.round(finding.confidence_level * 100)}%` }}
                          />
                        </div>
                        <span className="text-cyan-300 font-bold">
                          {Math.round(finding.confidence_level * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── 4. Source References & Citations ────────────────────────────────── */}
      {refs.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#131d35] border border-[#1e2d4f] shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e2d4f]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[#e8edf5] text-base">
                  Source References & Corroborating Evidence
                </h3>
                <p className="text-xs text-[#8fa3bf]">
                  Citations extracted from content or evaluated by AI sensors
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              {refs.length} SOURCES
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3.5">
            {refs.map((ref: SourceReference) => (
              <div
                key={ref.id}
                className="p-3.5 rounded-xl bg-[#0f1629] border border-[#1e2d4f] text-xs space-y-1.5 flex flex-col justify-between hover:border-[#253556] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="font-semibold text-[#e8edf5] text-xs leading-snug truncate">
                      {ref.title || ref.url}
                    </h5>
                    {ref.url && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-cyan-400 hover:text-cyan-300 hover:bg-white/5 transition-colors shrink-0"
                        title="Open external source reference"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  {ref.description && (
                    <p className="text-[#8fa3bf] text-[11px] mt-1 leading-relaxed">
                      {ref.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#1e2d4f]/60 flex items-center justify-between text-[10px] font-mono text-[#4a6180]">
                  <span className="uppercase">{ref.reference_type || 'CITATION'}</span>
                  {ref.relevance && <span className="text-cyan-300">Relevance: {ref.relevance}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Evidence Limitations & Epistemic Uncertainty ─────────────────── */}
      {Boolean(analysis.uncertainty_note || (analysis.evidence_limitations && analysis.evidence_limitations.length > 0)) && (
        <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 shadow-lg space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-amber-300 text-sm">
              Sensor Limitations & Epistemic Uncertainty
            </h4>
          </div>

          {analysis.uncertainty_note && (
            <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
              {analysis.uncertainty_note}
            </p>
          )}

          {Boolean(analysis.evidence_limitations && analysis.evidence_limitations.length > 0) && (
            <ul className="space-y-1 pl-1">
              {(analysis.evidence_limitations || []).map((lim: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs text-amber-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── 6. Cryptographic Sensor Seal & AI Advisory ──────────────────────── */}
      <div className="p-4 rounded-xl bg-[#0f1629] border border-[#1e2d4f] flex items-start gap-3 text-xs text-[#8fa3bf]">
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#e8edf5]">Verification Protocol:</strong> These conclusions are computed via hybrid heuristic sensors and OpenRouter artificial intelligence models. While designed for high precision, they provide analytical probability assessments rather than absolute legal or factual certitude.
        </p>
      </div>
    </div>
  );
}

export default AnalysisResultPanel;
