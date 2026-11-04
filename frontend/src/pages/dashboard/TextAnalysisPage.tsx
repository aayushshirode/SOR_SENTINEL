// SOR SENTINEL — Professional Text Credibility & Misinformation Workspace
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  FileText, AlertTriangle, Send, Info, RotateCcw, Globe,
  AlertCircle, Sparkles, Terminal, Copy, Check, ShieldCheck,
  Clock, ArrowRight, BookOpen, Layers, Shield, Cpu
} from 'lucide-react';
import { analysisApi, extractErrorMessage } from '@/services/api';
import type { Analysis } from '@/types';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Card, Badge } from '@/components/ui/index';
import AnalysisResultPanel from '@/components/analysis/AnalysisResultPanel';
import toast from 'react-hot-toast';

const MAX_CHARS = 10000;
const MIN_CHARS = 50;

const SAMPLE_DATASETS = [
  {
    title: 'Medical Breakthrough Claim',
    tag: 'Scientific News',
    content: `Researchers at the Global Health Institute have announced a major breakthrough in treating Alzheimer's disease using a novel compound derived from deep-sea organisms. The compound, dubbed "MemoriX," reportedly restored memory function in 94% of trial participants within just two weeks. The study, published in the International Journal of Cognitive Medicine, tested 1,200 patients across three countries. Lead researcher Dr. Sarah Chen stated that MemoriX works by regenerating hippocampal neurons, a process previously thought impossible. The FDA has been notified and emergency approval is expected within months.`,
  },
  {
    title: 'Financial Crypto Scheme',
    tag: 'High Risk',
    content: `URGENT NOTICE: The Global Decentralized Reserve has authorized an emergency liquidity reward for all active wallet holders. Under executive directive SEC-8892, users who verify their private key signatures on the institutional verification gateway will receive 2.5 ETH in guaranteed compensatory staking bonuses. Over $14 million in automated distributions have already been processed in the last 48 hours. Connect your primary custodial seed phrase immediately before the daily allocation window closes permanently at midnight.`,
  },
  {
    title: 'Geopolitical Intelligence Brief',
    tag: 'Policy Report',
    content: `According to diplomatic cables obtained from the Regional Security Council, senior negotiators have finalized a preliminary ceasefire protocol regarding the disputed border demarcation line in the northern valley. The protocol outlines a 14-day phased military withdrawal monitored by independent observers, accompanied by the restoration of commercial power grid connections and humanitarian transit corridors. Formal ratification by the joint defense ministry is scheduled for next Tuesday.`,
  },
];

export default function TextAnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const resultsRef = useRef<HTMLDivElement>(null);
  const passedSourceUrl = (location.state as { sourceUrl?: string })?.sourceUrl;

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState(1);
  const [error, setError] = useState<{ message: string; code?: string; requestId?: string } | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);

  // Character stats
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const hasMinChars = charCount >= MIN_CHARS;
  const isOverLimit = charCount > MAX_CHARS;

  // Scan step animation ticker during loading
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setScanStep(1);
      interval = setInterval(() => {
        setScanStep(prev => (prev < 4 ? prev + 1 : prev));
      }, 1400);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    const trimmed = text.trim();
    if (trimmed.length < MIN_CHARS) {
      setError({ message: `Please provide at least ${MIN_CHARS} characters for an accurate neural analysis.` });
      return;
    }

    if (trimmed.length > MAX_CHARS) {
      setError({ message: `Text length exceeds the maximum limit of ${MAX_CHARS.toLocaleString()} characters.` });
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await analysisApi.analyzeText(trimmed);
      setResult(res.data);

      if (res.data.status === 'completed') {
        toast.success('Text credibility analysis complete.');
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const errorMsg = res.data.error_message || 'Analysis pipeline returned an inconclusive state.';
        setError({
          message: errorMsg,
          code: res.data.error_code,
          requestId: res.data.request_id,
        });
        toast.error(errorMsg);
      }
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError({ message: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setText('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-16">
      {/* ── 1. Page Header & Workspace Telemetry ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#e8edf5] tracking-tight">
              Text Credibility & Misinformation Sensor
            </h1>
          </div>
          <p className="text-[#8fa3bf] text-sm mt-1">
            Deep neural credibility verification, manipulative rhetoric detection, and confidential data discovery.
          </p>
        </div>
      </div>

      {/* Passed source URL context notification */}
      {passedSourceUrl && (
        <div className="flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl px-4 py-3 text-xs sm:text-sm text-cyan-300 animate-fade-in">
          <Globe className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>
            Content extracted from target URL: <strong className="text-white underline">{passedSourceUrl}</strong>
          </span>
        </div>
      )}

      {/* ── 2. Analysis Input Workspace ──────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-6 border-[#1e2d4f] shadow-xl space-y-4">
          {/* Workspace Controls Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e2d4f]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#e8edf5]">
                Source Text Input Buffer
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-[#8fa3bf]">
                Words: <strong className="text-[#e8edf5]">{wordCount.toLocaleString()}</strong>
              </span>
              <span className="text-[#1e2d4f]">•</span>
              <span className={charCount > MAX_CHARS ? 'text-red-400 font-bold' : 'text-[#8fa3bf]'}>
                Chars: <strong className={charCount > MAX_CHARS ? 'text-red-400' : 'text-[#e8edf5]'}>{charCount.toLocaleString()}</strong> / {MAX_CHARS.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Main Textarea */}
          <div className="relative">
            <textarea
              value={text}
              onChange={e => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Paste article text, message transcripts, investigative excerpts, or intelligence memos here (minimum 50 characters)..."
              rows={11}
              required
              disabled={loading}
              className="w-full bg-[#0a0f1a] border border-[#1e2d4f] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl p-4 text-sm text-[#e8edf5] placeholder:text-[#4a6180] leading-relaxed transition-all resize-y font-sans disabled:opacity-50"
            />

            {/* Minimum characters indicator bar */}
            <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono">
              <span className={hasMinChars ? 'text-emerald-400' : 'text-[#8fa3bf]'}>
                {hasMinChars ? '✓ Minimum length satisfied' : `Requires at least ${MIN_CHARS - charCount > 0 ? MIN_CHARS - charCount : 0} more characters`}
              </span>
              <div className="w-32 h-1.5 rounded-full bg-[#1e2d4f] overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    hasMinChars ? 'bg-cyan-400' : 'bg-[#4a6180]'
                  }`}
                  style={{ width: `${Math.min(100, (charCount / MIN_CHARS) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Sample Datasets Bar */}
          <div className="p-3 rounded-xl bg-[#0f1629] border border-[#1e2d4f] flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-[#4a6180] font-mono font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Load Sample Data:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {SAMPLE_DATASETS.map((sample) => (
                <button
                  key={sample.title}
                  type="button"
                  onClick={() => {
                    setText(sample.content);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-[#131d35] hover:bg-cyan-500/10 text-[#8fa3bf] hover:text-cyan-300 border border-[#1e2d4f] hover:border-cyan-500/30 transition-all font-medium"
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              {text.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={loading}
                  className="text-xs text-[#8fa3bf] hover:text-red-400 transition-colors font-medium"
                >
                  Clear Input
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {error && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={loading || !hasMinChars}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Retry Scan
                </Button>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!hasMinChars || isOverLimit || loading}
                loading={loading}
                leftIcon={<Send className="w-4 h-4" />}
                className="shadow-lg shadow-cyan-500/20"
              >
                {loading ? 'Executing Neural Verification...' : 'Analyze Content Credibility'}
              </Button>
            </div>
          </div>
        </Card>
      </form>

      {/* ── 3. Multi-Stage Scanning State Indicator ──────────────────────────── */}
      {loading && (
        <Card className="p-6 border-cyan-500/40 bg-gradient-to-r from-cyan-950/20 via-[#131d35] to-cyan-950/20 shadow-2xl animate-fade-in space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <div>
              <h4 className="font-bold text-[#e8edf5] text-sm">Threat Heuristic Engine Processing</h4>
              <p className="text-xs text-[#8fa3bf]">Streaming payload to OpenRouter neural verification pipeline</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2">
            {[
              { num: 1, label: 'Payload Normalization' },
              { num: 2, label: 'Linguistic Bias Audit' },
              { num: 3, label: 'Sensitivity & PII Discovery' },
              { num: 4, label: 'Structured Dossier Synthesis' },
            ].map(step => (
              <div
                key={step.num}
                className={`p-2.5 rounded-xl border text-xs font-mono transition-all flex items-center gap-2 ${
                  scanStep > step.num
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : scanStep === step.num
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-sm'
                    : 'bg-[#0f1629] border-[#1e2d4f] text-[#4a6180]'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-[#1e2d4f] flex items-center justify-center text-[10px]">
                  {scanStep > step.num ? '✓' : step.num}
                </span>
                <span className="truncate">{step.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── 4. Error Card ────────────────────────────────────────────────────── */}
      {error && !loading && (
        <Card className="p-5 border-red-500/30 bg-red-950/20 shadow-xl space-y-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="font-bold text-red-300 text-sm">Analysis Pipeline Interruption</h4>
              <p className="text-sm text-red-200/90 leading-relaxed">{error.message}</p>
              {(error.code || error.requestId) && (
                <div className="flex flex-wrap gap-2 pt-2 text-xs text-red-400 font-mono">
                  {error.code && <span className="bg-red-900/30 px-2 py-0.5 rounded border border-red-800/40">Code: {error.code}</span>}
                  {error.requestId && <span className="bg-red-900/30 px-2 py-0.5 rounded border border-red-800/40">Ref: {error.requestId}</span>}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleSubmit()}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="shrink-0 text-xs"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* ── 5. Empty State / Sensor Guidelines ───────────────────────────────── */}
      {!result && !loading && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-5 border-[#1e2d4f] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-1">
              <BookOpen className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-[#e8edf5] text-sm">Factual Corroboration</h4>
            <p className="text-xs text-[#8fa3bf] leading-relaxed">
              Extracts assertions and references to cross-check factual consistency against primary sources.
            </p>
          </Card>

          <Card className="p-5 border-[#1e2d4f] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-[#e8edf5] text-sm">Manipulative Language</h4>
            <p className="text-xs text-[#8fa3bf] leading-relaxed">
              Flags emotional escalation, sensational headlines, false dilemma fallacies, and deceptive phishing phrasing.
            </p>
          </Card>

          <Card className="p-5 border-[#1e2d4f] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center mb-1">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-[#e8edf5] text-sm">PII & Sensitivity Safeguard</h4>
            <p className="text-xs text-[#8fa3bf] leading-relaxed">
              Scans for sensitive identity identifiers, unauthorized disclosures, and proprietary tokens.
            </p>
          </Card>
        </div>
      )}

      {/* ── 6. Results Section ───────────────────────────────────────────────── */}
      {result && result.status === 'completed' && (
        <div ref={resultsRef} className="space-y-4 pt-4 border-t border-[#1e2d4f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-[#e8edf5]">
                Threat Verification Dossier
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setText('');
                setResult(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Analyze New Passage
            </Button>
          </div>

          <AnalysisResultPanel analysis={result} />
        </div>
      )}
    </div>
  );
}
