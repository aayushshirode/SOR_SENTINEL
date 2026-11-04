// SOR SENTINEL — Cyber Threat URL Investigation Console
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Globe, AlertTriangle, Send, Shield, FileText, ArrowRight,
  AlertCircle, RotateCcw, Terminal, ExternalLink, Check, Copy,
  Sparkles, Lock, ShieldCheck, Activity, Search, RefreshCw, Cpu
} from 'lucide-react';
import { analysisApi, extractErrorMessage } from '@/services/api';
import type { Analysis } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card } from '@/components/ui/index';
import AnalysisResultPanel from '@/components/analysis/AnalysisResultPanel';
import toast from 'react-hot-toast';

const SAMPLE_TARGETS = [
  { label: 'BBC News Portal', url: 'https://www.bbc.com/news' },
  { label: 'Wikipedia Article', url: 'https://en.wikipedia.org/wiki/Artificial_intelligence' },
  { label: 'WHO Health Brief', url: 'https://www.who.int/news' },
];

export default function UrlAnalysisPage() {
  const navigate = useNavigate();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState(1);
  const [error, setError] = useState<{ message: string; code?: string; requestId?: string } | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);

  // Manual fallback state
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Live URL parsing
  const parsedTarget = useMemo(() => {
    if (!url.trim()) return null;
    try {
      const u = new URL(url.trim());
      return {
        protocol: u.protocol.replace(':', ''),
        hostname: u.hostname,
        pathname: u.pathname,
        isHttps: u.protocol === 'https:',
        isValid: u.protocol === 'http:' || u.protocol === 'https:',
      };
    } catch {
      return {
        protocol: 'invalid',
        hostname: '',
        pathname: '',
        isHttps: false,
        isValid: false,
      };
    }
  }, [url]);

  // Stepper ticker during scan
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setScanStep(1);
      interval = setInterval(() => {
        setScanStep(prev => (prev < 4 ? prev + 1 : prev));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    const trimmed = url.trim();
    if (!trimmed) {
      setError({ message: 'Please specify a target website URL to investigate.' });
      return;
    }

    if (!parsedTarget?.isValid) {
      setError({ message: 'Invalid URL. Only public http:// and https:// addresses are supported.' });
      return;
    }

    setError(null);
    setShowManualFallback(false);
    setLoading(true);
    setResult(null);

    try {
      const res = await analysisApi.analyzeUrl(trimmed);
      setResult(res.data);

      if (res.data.status === 'completed') {
        toast.success('URL threat scan completed successfully.');
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const errorMsg = res.data.error_message || 'Content extraction failed for the target URL.';
        setError({
          message: errorMsg,
          code: res.data.error_code,
          requestId: res.data.request_id,
        });
        setShowManualFallback(true);
        toast.error(errorMsg);
      }
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError({ message: msg });
      setShowManualFallback(true);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleManualFallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualLoading) return;

    const trimmed = manualText.trim();
    if (trimmed.length < 50) {
      toast.error('Please enter at least 50 characters of webpage text.');
      return;
    }

    setManualLoading(true);
    try {
      const res = await analysisApi.analyzeText(trimmed);
      setResult(res.data);
      if (res.data.status === 'completed') {
        toast.success('Text analysis completed successfully.');
        setShowManualFallback(false);
        setError(null);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        toast.error(res.data.error_message || 'Analysis failed. Please try again.');
      }
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setManualLoading(false);
    }
  };

  const handleClear = () => {
    setUrl('');
    setResult(null);
    setError(null);
    setShowManualFallback(false);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-16">
      {/* ── 1. Page Header & Security Protocols ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#e8edf5] tracking-tight">
              Targeted URL Threat Scanner & Sensor
            </h1>
          </div>
          <p className="text-[#8fa3bf] text-sm mt-1">
            SSRF-sandboxed destination inspection, redirect hop evaluation, and webpage credibility assessment.
          </p>
        </div>
      </div>

      {/* ── 2. Investigation Input Console ───────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-6 border-[#1e2d4f] shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e2d4f]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#e8edf5]">
                Target Specification Console
              </span>
            </div>

            {parsedTarget && parsedTarget.isValid && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Valid Web Endpoint
              </span>
            )}
          </div>

          {/* URL Input Bar */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#8fa3bf] uppercase tracking-wider">
              Destination URL <span className="text-cyan-400">*</span>
            </label>

            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={e => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="https://example.com/target-article-or-report"
                required
                disabled={loading}
                className="w-full bg-[#0a0f1a] border border-[#1e2d4f] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-3 text-sm text-[#e8edf5] placeholder:text-[#4a6180] font-mono transition-all pl-10"
              />
              <Globe className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Live Domain Telemetry Preview */}
            {parsedTarget && parsedTarget.isValid && (
              <div className="p-2.5 rounded-lg bg-[#0f1629] border border-[#1e2d4f] flex flex-wrap items-center gap-3 text-xs font-mono">
                <span className="text-[#4a6180]">PARSED HOST:</span>
                <span className="text-cyan-300 font-bold">{parsedTarget.hostname}</span>
                <span className="text-[#4a6180]">•</span>
                <span className="text-[#8fa3bf]">SCHEME: {parsedTarget.protocol.toUpperCase()}</span>
                {parsedTarget.isHttps && (
                  <span className="text-emerald-400 text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                    TLS ENCRYPTED
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Sample Target Bar */}
          <div className="p-3 rounded-xl bg-[#0f1629] border border-[#1e2d4f] flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-[#4a6180] font-mono font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Sample Investigation Targets:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {SAMPLE_TARGETS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => {
                    setUrl(sample.url);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-[#131d35] hover:bg-cyan-500/10 text-[#8fa3bf] hover:text-cyan-300 border border-[#1e2d4f] hover:border-cyan-500/30 transition-all font-medium font-mono text-[11px]"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              {url.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={loading}
                  className="text-xs text-[#8fa3bf] hover:text-red-400 transition-colors font-medium"
                >
                  Clear Console
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
                  disabled={loading || !parsedTarget?.isValid}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Retry Scan
                </Button>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!parsedTarget?.isValid || loading}
                loading={loading}
                leftIcon={<Send className="w-4 h-4" />}
                className="shadow-lg shadow-cyan-500/20"
              >
                {loading ? 'Inspecting Destination...' : 'Scan Target URL'}
              </Button>
            </div>
          </div>
        </Card>
      </form>

      {/* ── 3. Multi-Stage Scan Status ───────────────────────────────────────── */}
      {loading && (
        <Card className="p-6 border-cyan-500/40 bg-gradient-to-r from-cyan-950/20 via-[#131d35] to-cyan-950/20 shadow-2xl animate-fade-in space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <div>
              <h4 className="font-bold text-[#e8edf5] text-sm">Target Investigation in Progress</h4>
              <p className="text-xs text-[#8fa3bf]">Safely resolving host headers and analyzing DOM content</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2">
            {[
              { num: 1, label: 'DNS & Hostname Verification' },
              { num: 2, label: 'Redirect Chain Traversal' },
              { num: 3, label: 'DOM Content Extraction' },
              { num: 4, label: 'Neural Credibility Scoring' },
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

      {/* ── 4. Error Card & Bot Protection Notification ──────────────────────── */}
      {error && !loading && (
        <Card className="p-5 border-amber-500/30 bg-amber-950/20 shadow-xl space-y-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="font-bold text-amber-300 text-sm">Target Retrieval Notice</h4>
              <p className="text-sm text-amber-200/90 leading-relaxed">{error.message}</p>
              {(error.code || error.requestId) && (
                <div className="flex flex-wrap gap-2 pt-2 text-xs text-amber-400 font-mono">
                  {error.code && <span className="bg-amber-900/30 px-2 py-0.5 rounded border border-amber-800/40">Code: {error.code}</span>}
                  {error.requestId && <span className="bg-amber-900/30 px-2 py-0.5 rounded border border-amber-800/40">Ref: {error.requestId}</span>}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── 5. Safe Manual Text Fallback Workspace ────────────────────────────── */}
      {showManualFallback && !loading && (
        <Card className="p-6 border-cyan-500/30 bg-[#0c1427] shadow-2xl space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#e8edf5] text-base">Direct Webpage Text Fallback</h3>
                <p className="text-xs text-[#8fa3bf] mt-1 leading-relaxed">
                  If the target website enforces anti-bot protections (Cloudflare, CAPTCHA, paywalls, or JS rendering), copy the visible article text from your browser and paste it below to continue the investigation.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/analyze/text', { state: { sourceUrl: url } })}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="shrink-0 text-xs"
            >
              Open in Text Workspace
            </Button>
          </div>

          <form onSubmit={handleManualFallbackSubmit} className="space-y-3 pt-2">
            <Textarea
              label="Paste Webpage Text Content"
              placeholder="Copy the article or story text from the browser tab and paste here (minimum 50 characters)..."
              value={manualText}
              onChange={e => setManualText(e.target.value)}
              rows={6}
              required
              hint="Text is analyzed using the same AI verification engine."
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowManualFallback(false)}
              >
                Dismiss Fallback
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={manualLoading}
                disabled={manualText.trim().length < 50 || manualLoading}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Analyze Pasted Text
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── 6. Results Section ───────────────────────────────────────────────── */}
      {result && result.status === 'completed' && (
        <div ref={resultsRef} className="space-y-4 pt-4 border-t border-[#1e2d4f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-[#e8edf5]">
                URL Threat Dossier
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setUrl('');
                setResult(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Scan Another URL
            </Button>
          </div>

          <AnalysisResultPanel analysis={result} />
        </div>
      )}
    </div>
  );
}
