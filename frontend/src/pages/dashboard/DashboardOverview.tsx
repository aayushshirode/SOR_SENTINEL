// SOR SENTINEL — Dynamic Cybersecurity Intelligence Dashboard Overview
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Globe, CheckCircle2, AlertTriangle, PlusCircle,
  TrendingUp, Clock, BarChart2, ShieldAlert, ShieldCheck, Lock, Bot,
  ChevronRight, ArrowUpRight, Activity, Terminal, Shield, RefreshCw,
  Search, SlidersHorizontal, Check, AlertCircle, Sparkles
} from 'lucide-react';
import { dashboardApi, extractErrorMessage } from '@/services/api';
import type { DashboardSummary, DashboardActivity } from '@/types';
import { Card, Badge, Skeleton, EmptyState, ErrorState } from '@/components/ui/index';
import { Button } from '@/components/ui/Button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';

function assessmentBadge(assessment?: string) {
  if (!assessment) return <Badge variant="neutral">—</Badge>;
  const lower = assessment.toLowerCase();
  if (lower.includes('credible') || lower.includes('legitimate') || lower.includes('low concern')) {
    return <Badge variant="success" className="font-rajdhani font-bold tracking-wider">{assessment}</Badge>;
  }
  if (lower.includes('misleading') || lower.includes('phishing') || lower.includes('untrustworthy')) {
    return <Badge variant="error" className="font-rajdhani font-bold tracking-wider">{assessment}</Badge>;
  }
  if (lower.includes('sensitive') || lower.includes('suspicious') || lower.includes('caution')) {
    return <Badge variant="warning" className="font-rajdhani font-bold tracking-wider">{assessment}</Badge>;
  }
  if (lower.includes('verification') || lower.includes('inconclusive')) {
    return <Badge variant="info" className="font-rajdhani font-bold tracking-wider">{assessment}</Badge>;
  }
  return <Badge variant="neutral" className="font-rajdhani font-bold tracking-wider">{assessment}</Badge>;
}

function sensitivityBadge(level?: string) {
  const map: Record<string, 'success' | 'warning' | 'error' | 'cyan' | 'neutral'> = {
    low: 'success', medium: 'warning', high: 'error', critical: 'error',
    LOW: 'success', MEDIUM: 'warning', HIGH: 'error', CRITICAL: 'error',
  };
  return level ? <Badge variant={map[level] || 'neutral'} className="font-rajdhani font-bold tracking-wider">{level.toUpperCase()}</Badge> : <Badge variant="neutral">—</Badge>;
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activity, setActivity] = useState<DashboardActivity | null>(null);
  const [activityView, setActivityView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentFilter, setRecentFilter] = useState<'all' | 'url' | 'text'>('all');

  const loadData = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getActivity(30, 'daily'),
      ]);
      setSummary(s.data);
      setActivity(a.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const changeActivityView = async (view: 'daily' | 'weekly' | 'monthly') => {
    setActivityView(view);
    setActivityLoading(true);
    try {
      const res = await dashboardApi.getActivity(30, view);
      setActivity(res.data);
    } catch {
      // Keep previous view on error
    } finally {
      setActivityLoading(false);
    }
  };

  // Filter recent analyses
  const filteredRecentAnalyses = useMemo(() => {
    if (!summary?.recent_analyses) return [];
    if (recentFilter === 'all') return summary.recent_analyses;
    return summary.recent_analyses.filter(a => a.analysis_type === recentFilter);
  }, [summary?.recent_analyses, recentFilter]);

  // Derived real intelligence metrics
  const assessmentEntries = Object.entries(summary?.assessment_distribution || {});
  const sensitivityEntries = Object.entries(summary?.sensitivity_distribution || {});
  const totalCount = summary?.total_analyses || 0;

  // Credible items count
  const credibleCount = useMemo(() => {
    return assessmentEntries.reduce((acc, [k, v]) => {
      const l = k.toLowerCase();
      if (l.includes('credible') || l.includes('legitimate')) return acc + v;
      return acc;
    }, 0);
  }, [assessmentEntries]);

  // Sensitive items count
  const highRiskCount = useMemo(() => {
    return sensitivityEntries.reduce((acc, [k, v]) => {
      const l = k.toLowerCase();
      if (l.includes('high') || l.includes('critical')) return acc + v;
      return acc;
    }, 0);
  }, [sensitivityEntries]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-72 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 bg-[#131d35] border border-[#1e2d4f] rounded-2xl space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-[#131d35] border border-[#1e2d4f] rounded-2xl space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
          <div className="p-6 bg-[#131d35] border border-[#1e2d4f] rounded-2xl space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => { setLoading(true); setError(''); loadData(); }} />;
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* ── 1. Cyber Enclave Welcome & Telemetry Banner ─────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden border border-[#1e2d4f] bg-gradient-to-r from-[#0c1427] via-[#101b33] to-[#0c1427] p-6 shadow-2xl">
        {/* Background glow & subtle cyber grid */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-rajdhani font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                INTELLIGENCE SENSOR ENCLAVE
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-rajdhani font-semibold tracking-wider uppercase bg-[#1e2d4f]/60 text-[#8fa3bf]">
                <Activity className="w-3 h-3 text-emerald-400" />
                Live Oracle 21c XE
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#e8edf5] tracking-tight font-space">
              Security Operations Center
            </h1>
            <p className="text-sm text-[#8fa3bf] max-w-2xl leading-relaxed font-plex">
              Real-time misinformation telemetry, AI source credibility classification, and encrypted cryptographic vault monitoring.
            </p>
          </div>

          {/* Quick Action Suite */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link to="/dashboard/analyze/text">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PlusCircle className="w-4 h-4" />}
                className="shadow-lg shadow-cyan-500/20 font-outfit"
              >
                Scan Text
              </Button>
            </Link>
            <Link to="/dashboard/analyze/url">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Globe className="w-4 h-4 text-cyan-400" />}
                className="font-outfit"
              >
                Investigate URL
              </Button>
            </Link>
            <Link to="/dashboard/cubbis">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Bot className="w-4 h-4 text-emerald-400" />}
                className="hidden sm:inline-flex font-outfit"
              >
                Cubbis AI
              </Button>
            </Link>
          </div>
        </div>

        {/* Threat Level Quick Ticker */}
        <div className="mt-5 pt-4 border-t border-[#1e2d4f]/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-rajdhani">
          <div>
            <span className="text-[#4a6180] block text-[11px] uppercase font-bold tracking-wider">Total Enclave Scans</span>
            <span className="text-cyan-400 font-extrabold text-sm tracking-wide">{totalCount.toLocaleString()} Verified</span>
          </div>
          <div>
            <span className="text-[#4a6180] block text-[11px] uppercase font-bold tracking-wider">Credible Verdicts</span>
            <span className="text-emerald-400 font-extrabold text-sm tracking-wide">{credibleCount} Safe Entities</span>
          </div>
          <div>
            <span className="text-[#4a6180] block text-[11px] uppercase font-bold tracking-wider">High Sensitivity Alerts</span>
            <span className="text-orange-400 font-extrabold text-sm tracking-wide">{highRiskCount} Flagged</span>
          </div>
          <div>
            <span className="text-[#4a6180] block text-[11px] uppercase font-bold tracking-wider">Enclave Engine</span>
            <span className="text-emerald-400 font-extrabold text-sm flex items-center gap-1 tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Primary KPI Telemetry Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Analyses */}
        <Card className="p-5 border-[#1e2d4f] hover:border-cyan-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold font-rajdhani uppercase tracking-wider text-[#8fa3bf]">
              Total Analyses
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#e8edf5] font-space tracking-tight">
              {(summary?.total_analyses ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-cyan-400 font-outfit font-medium">Recorded</span>
          </div>
          <p className="text-[11px] text-[#4a6180] font-plex mt-2 pt-2 border-t border-[#1e2d4f]/60 truncate">
            Persisted in Oracle 21c XE
          </p>
        </Card>

        {/* Text Analyses */}
        <Card className="p-5 border-[#1e2d4f] hover:border-violet-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold font-rajdhani uppercase tracking-wider text-[#8fa3bf]">
              Text Credibility
            </span>
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-violet-300 font-space tracking-tight">
              {(summary?.text_analyses ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-violet-400 font-outfit font-medium">
              {totalCount > 0 ? Math.round(((summary?.text_analyses ?? 0) / totalCount) * 100) : 0}% share
            </span>
          </div>
          <p className="text-[11px] text-[#4a6180] font-plex mt-2 pt-2 border-t border-[#1e2d4f]/60 truncate">
            Source credibility & bias extraction
          </p>
        </Card>

        {/* URL Analyses */}
        <Card className="p-5 border-[#1e2d4f] hover:border-blue-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold font-rajdhani uppercase tracking-wider text-[#8fa3bf]">
              URL Investigations
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-blue-300 font-space tracking-tight">
              {(summary?.url_analyses ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-blue-400 font-outfit font-medium">
              {totalCount > 0 ? Math.round(((summary?.url_analyses ?? 0) / totalCount) * 100) : 0}% share
            </span>
          </div>
          <p className="text-[11px] text-[#4a6180] font-plex mt-2 pt-2 border-t border-[#1e2d4f]/60 truncate">
            Phishing & redirect sensor scans
          </p>
        </Card>

        {/* Completed Operations */}
        <Card className="p-5 border-[#1e2d4f] hover:border-emerald-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold font-rajdhani uppercase tracking-wider text-[#8fa3bf]">
              Completed Scans
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-300 font-space tracking-tight">
              {(summary?.completed_analyses ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-emerald-400 font-outfit font-medium">
              {totalCount > 0 ? Math.round(((summary?.completed_analyses ?? 0) / totalCount) * 100) : 100}% success
            </span>
          </div>
          <p className="text-[11px] text-[#4a6180] font-plex mt-2 pt-2 border-t border-[#1e2d4f]/60 truncate">
            Completed investigation pipeline
          </p>
        </Card>
      </div>

      {/* ── 3. Interactive Chronological Activity Timeline ───────────────────── */}
      <Card className="p-6 border-[#1e2d4f] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#e8edf5] text-base">
                Chronological Threat Analysis Activity
              </h3>
              <p className="text-xs text-[#8fa3bf] mt-0.5">
                {activityView === 'daily'
                  ? 'Daily scan density across the last 30 days'
                  : activityView === 'weekly'
                  ? 'Weekly aggregated threat volume (Last 12 Weeks)'
                  : 'Monthly threat volume (Last 12 Months)'}
              </p>
            </div>
          </div>

          {/* Granularity Selector */}
          <div className="flex items-center gap-1 p-1 bg-[#0a0f1a] rounded-xl border border-[#1e2d4f] self-start sm:self-auto font-outfit">
            {(['daily', 'weekly', 'monthly'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => changeActivityView(view)}
                disabled={activityLoading}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all font-outfit ${
                  activityView === view
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-[#8fa3bf] hover:text-[#e8edf5] hover:bg-white/5'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {activity && activity.data.length > 0 ? (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cyberActivityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4f" opacity={0.6} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#4a6180', fontSize: 11 }}
                  tickFormatter={(d: string) => {
                    try {
                      const parsed = parseISO(d);
                      if (activityView === 'monthly') return format(parsed, 'MMM yyyy');
                      return format(parsed, 'MMM d');
                    } catch {
                      return d;
                    }
                  }}
                />
                <YAxis tick={{ fill: '#4a6180', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#131d35',
                    borderColor: '#1e2d4f',
                    borderRadius: 12,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                  labelStyle={{ color: '#8fa3bf', fontSize: 11, fontWeight: 700 }}
                  itemStyle={{ color: '#00d4ff', fontSize: 12, fontWeight: 600 }}
                  formatter={(val: number) => [`${val} ${val === 1 ? 'Scan' : 'Scans'}`, 'Volume']}
                  labelFormatter={(v: string) => {
                    try {
                      const parsed = parseISO(v);
                      if (activityView === 'monthly') return format(parsed, 'MMMM yyyy');
                      if (activityView === 'weekly') return `Week of ${format(parsed, 'MMM d, yyyy')}`;
                      return format(parsed, 'EEEE, MMM d, yyyy');
                    } catch {
                      return String(v);
                    }
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#00d4ff"
                  strokeWidth={2.5}
                  fill="url(#cyberActivityGrad)"
                  activeDot={{ r: 5, fill: '#00d4ff', stroke: '#0a0f1a', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-14 text-center text-xs text-[#8fa3bf]">
            No analysis activity recorded in this period. Submit a text or URL to initiate telemetry.
          </div>
        )}
      </Card>

      {/* ── 4. Interactive Verdict & Sensitivity Distributions ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verdict Distribution */}
        <Card className="p-6 border-[#1e2d4f] shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e2d4f]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-[#e8edf5] text-sm">
                Verdict & Credibility Distribution
              </h3>
            </div>
            <Link
              to="/dashboard/history"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              Filter in History <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {assessmentEntries.length === 0 ? (
            <p className="text-xs text-[#8fa3bf] py-8 text-center">
              No assessment verdicts recorded yet. Run an analysis to view breakdown.
            </p>
          ) : (
            <div className="space-y-4">
              {assessmentEntries.map(([verdict, count]) => {
                const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                const isCredible = verdict.toLowerCase().includes('credible') || verdict.toLowerCase().includes('legitimate');
                const isMisleading = verdict.toLowerCase().includes('misleading') || verdict.toLowerCase().includes('phishing');

                const barColor = isCredible ? 'bg-emerald-400' : isMisleading ? 'bg-red-400' : 'bg-amber-400';

                return (
                  <div
                    key={verdict}
                    onClick={() => navigate(`/dashboard/history?verdict=${encodeURIComponent(verdict)}`)}
                    className="space-y-1.5 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                    title={`Click to filter history for "${verdict}"`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#e8edf5] font-semibold group-hover:text-cyan-300 transition-colors truncate max-w-[240px]">
                        {verdict}
                      </span>
                      <span className="text-[#8fa3bf] font-mono text-xs">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#0a0f1a] rounded-full overflow-hidden border border-[#1e2d4f]">
                      <div
                        className={`h-full ${barColor} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Sensitivity & Risk Distribution */}
        <Card className="p-6 border-[#1e2d4f] shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e2d4f]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold text-[#e8edf5] text-sm">
                Sensitivity & Risk Matrix
              </h3>
            </div>
            <Link
              to="/dashboard/history"
              className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1"
            >
              Filter in History <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {sensitivityEntries.length === 0 ? (
            <p className="text-xs text-[#8fa3bf] py-8 text-center">
              No sensitivity findings recorded yet.
            </p>
          ) : (
            <div className="space-y-4">
              {sensitivityEntries.map(([level, count]) => {
                const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                const normalized = level.toLowerCase();
                const barColor =
                  normalized === 'critical' ? 'bg-red-500' :
                  normalized === 'high' ? 'bg-orange-500' :
                  normalized === 'medium' ? 'bg-yellow-400' : 'bg-emerald-400';

                return (
                  <div
                    key={level}
                    onClick={() => navigate(`/dashboard/history?sensitivity_level=${encodeURIComponent(level)}`)}
                    className="space-y-1.5 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                    title={`Click to filter history for "${level}"`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#e8edf5] font-semibold uppercase font-mono group-hover:text-violet-300 transition-colors">
                        {level} Sensitivity
                      </span>
                      <span className="text-[#8fa3bf] font-mono text-xs">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#0a0f1a] rounded-full overflow-hidden border border-[#1e2d4f]">
                      <div
                        className={`h-full ${barColor} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── 5. Interactive Recent Analyses Feed ──────────────────────────────── */}
      <Card className="p-6 border-[#1e2d4f] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-3 border-b border-[#1e2d4f]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#0f1629] border border-[#1e2d4f] text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#e8edf5] text-base">Recent Threat Analyses</h3>
              <p className="text-xs text-[#8fa3bf]">Direct investigation audit trail</p>
            </div>
          </div>

          {/* Quick Filter Pill Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#0a0f1a] rounded-xl border border-[#1e2d4f] font-outfit">
              <button
                type="button"
                onClick={() => setRecentFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-outfit font-medium transition-colors ${
                  recentFilter === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-[#8fa3bf] hover:text-[#e8edf5]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setRecentFilter('url')}
                className={`px-2.5 py-1 rounded-lg text-xs font-outfit font-medium transition-colors ${
                  recentFilter === 'url'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-[#8fa3bf] hover:text-[#e8edf5]'
                }`}
              >
                URL Only
              </button>
              <button
                type="button"
                onClick={() => setRecentFilter('text')}
                className={`px-2.5 py-1 rounded-lg text-xs font-outfit font-medium transition-colors ${
                  recentFilter === 'text'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-[#8fa3bf] hover:text-[#e8edf5]'
                }`}
              >
                Text Only
              </button>
            </div>

            <Link
              to="/dashboard/history"
              className="text-xs font-outfit text-cyan-400 hover:text-cyan-300 font-medium px-3 py-1.5 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/10 transition-colors flex items-center gap-1"
            >
              All Records <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {filteredRecentAnalyses.length === 0 ? (
          <EmptyState
            title="No analyses found"
            description="Submit a text passage or URL to begin tracking threats in your personal enclave."
            action={
              <Link to="/dashboard/analyze/text">
                <Button size="sm" variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />}>
                  Start Analysis
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-plex">
              <thead>
                <tr className="border-b border-[#1e2d4f] text-[11px] font-rajdhani font-bold text-[#4a6180] uppercase tracking-wider">
                  <th className="text-left pb-3 pr-3">Record ID</th>
                  <th className="text-left pb-3 pr-4">Type</th>
                  <th className="text-left pb-3 pr-4">Target / Summary</th>
                  <th className="text-left pb-3 pr-4">Assessment</th>
                  <th className="text-left pb-3 pr-4">Score</th>
                  <th className="text-left pb-3 pr-4">Sensitivity</th>
                  <th className="text-left pb-3 pr-4">Timestamp</th>
                  <th className="text-right pb-3">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2d4f]">
                {filteredRecentAnalyses.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/dashboard/history/${a.id}`)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                    title="Click to view full threat dossier"
                  >
                    <td className="py-3.5 pr-3 whitespace-nowrap font-rajdhani text-xs font-bold text-cyan-400 tracking-wider">
                      #TR-{String(a.id).padStart(5, '0')}
                    </td>
                    <td className="py-3.5 pr-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium">
                        {a.analysis_type === 'text' ? (
                          <span className="p-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            <FileText className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Globe className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <span className="capitalize text-[#e8edf5] font-sans">{a.analysis_type}</span>
                      </span>
                    </td>

                    <td className="py-3.5 pr-4 max-w-xs">
                      <p className="text-xs text-[#8fa3bf] font-mono truncate group-hover:text-[#e8edf5] transition-colors">
                        {a.analysis_type === 'url' ? `Target URL Investigation #${a.id}` : `Text Content Excerpt #${a.id}`}
                      </p>
                    </td>

                    <td className="py-3.5 pr-4 whitespace-nowrap">
                      {assessmentBadge(a.overall_assessment)}
                    </td>

                    <td className="py-3.5 pr-4 whitespace-nowrap">
                      <span className={`font-mono font-bold text-xs ${
                        a.credibility_score !== undefined
                          ? a.credibility_score >= 70
                            ? 'text-emerald-400'
                            : a.credibility_score >= 40
                            ? 'text-yellow-400'
                            : 'text-red-400'
                          : 'text-[#4a6180]'
                      }`}>
                        {a.credibility_score !== undefined ? `${a.credibility_score}/100` : '—'}
                      </span>
                    </td>

                    <td className="py-3.5 pr-4 whitespace-nowrap">
                      {sensitivityBadge(a.sensitivity_level)}
                    </td>

                    <td className="py-3.5 pr-4 text-[#8fa3bf] text-xs font-mono whitespace-nowrap">
                      {format(parseISO(a.created_at), 'MMM d, HH:mm')}
                    </td>

                    <td className="py-3.5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center text-xs text-cyan-400 group-hover:translate-x-1 transition-transform font-medium">
                        Details <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
