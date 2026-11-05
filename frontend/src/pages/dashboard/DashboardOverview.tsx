// SOR SENTINEL — Dynamic Cybersecurity Intelligence Dashboard Overview
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Globe, CheckCircle2, AlertTriangle, PlusCircle,
  TrendingUp, Clock, BarChart2, ShieldAlert, ShieldCheck, Lock, Bot,
  ChevronRight, ArrowUpRight, Activity, Terminal, Shield, RefreshCw,
  Search, SlidersHorizontal, Check, AlertCircle, Sparkles, PieChart as PieIcon,
  Layers, Filter
} from 'lucide-react';
import { dashboardApi, extractErrorMessage } from '@/services/api';
import type { DashboardSummary, DashboardActivity } from '@/types';
import { Card, Badge, Skeleton, EmptyState, ErrorState } from '@/components/ui/index';
import { Button } from '@/components/ui/Button';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
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
  return level ? (
    <Badge variant={map[level] || 'neutral'} className="font-rajdhani font-bold tracking-wider">
      {level.toUpperCase()}
    </Badge>
  ) : <Badge variant="neutral">—</Badge>;
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
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

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

  // Statistical distribution pie chart mode & real data
  const [pieMode, setPieMode] = useState<'verdict' | 'sensitivity'>('verdict');
  const pieChartData = useMemo(() => {
    if (!summary) return [];
    if (pieMode === 'verdict') {
      const entries = Object.entries(summary.assessment_distribution || {});
      const colors = ['#10b981', '#ef4444', '#f59e0b', '#00d4ff', '#8b5cf6', '#ec4899', '#3b82f6'];
      return entries
        .filter(([_, count]) => count > 0)
        .map(([name, count], index) => {
          const lower = name.toLowerCase();
          let color = colors[index % colors.length];
          if (lower.includes('credible') || lower.includes('legitimate') || lower.includes('low')) color = '#10b981';
          else if (lower.includes('misleading') || lower.includes('phishing') || lower.includes('untrustworthy')) color = '#ef4444';
          else if (lower.includes('sensitive') || lower.includes('suspicious') || lower.includes('caution')) color = '#f59e0b';
          else if (lower.includes('verification') || lower.includes('inconclusive')) color = '#00d4ff';
          return {
            name: name,
            value: count,
            color,
          };
        });
    } else {
      const entries = Object.entries(summary.sensitivity_distribution || {});
      const colorsMap: Record<string, string> = {
        low: '#10b981',
        medium: '#f59e0b',
        high: '#f97316',
        critical: '#ef4444',
      };
      return entries
        .filter(([_, count]) => count > 0)
        .map(([name, count]) => ({
          name: `${name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()} Sensitivity`,
          value: count,
          color: colorsMap[name.toLowerCase()] || '#8b5cf6',
        }));
    }
  }, [summary, pieMode]);

  // Custom Interactive Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = totalCount > 0 ? ((data.value / totalCount) * 100).toFixed(1) : '0';
      return (
        <div className="p-3 rounded-xl bg-[#131d35] border border-[#1e2d4f] shadow-2xl space-y-1.5 font-plex text-xs pie-tooltip-box">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
            <span className="font-space font-bold text-[#e8edf5] tracking-wide">
              {data.name}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4 pt-1 font-numeric border-t border-[#1e2d4f]/50">
            <span className="text-[#8fa3bf] font-bold text-[10px]">Record Count:</span>
            <span className="font-bold text-[#e8edf5]" style={{ color: data.color }}>
              {data.value} {data.value === 1 ? 'scan' : 'scans'}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4 font-numeric">
            <span className="text-[#8fa3bf] font-bold text-[10px]">Enclave Share:</span>
            <span className="font-bold text-[#e8edf5]">
              {pct}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

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
      <div className="dashboard-hero-banner relative rounded-2xl overflow-hidden border border-[#1e2d4f] bg-gradient-to-r from-[#0c1427] via-[#101b33] to-[#0c1427] p-6 shadow-2xl">
        {/* Background glow & subtle cyber grid */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="hero-status-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-rajdhani font-bold tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Intelligence Sensor Enclave
              </span>
              <span className="hero-oracle-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-rajdhani font-bold tracking-wider bg-[#1e2d4f]/60 text-[#8fa3bf]">
                <Activity className="w-3 h-3 text-emerald-400" />
                Live Oracle 21c XE
              </span>
            </div>

            <h1 className="dashboard-hero-title text-2xl sm:text-3xl font-extrabold text-[#e8edf5] tracking-tight font-space">
              Security Operations Center
            </h1>
            <p className="text-xs sm:text-sm text-[#8fa3bf] max-w-2xl leading-relaxed font-plex">
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
        <div className="hero-ticker mt-5 pt-4 border-t border-[#1e2d4f]/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-rajdhani">
          <div>
            <span className="ticker-label text-[#4a6180] block text-[11px] font-bold tracking-wider">
              Total Enclave Scans
            </span>
            <span className="text-cyan-400 font-extrabold text-sm tracking-wide font-numeric">
              {totalCount.toLocaleString()} <span className="font-rajdhani text-xs font-bold tracking-wider text-[#8fa3bf]">Verified</span>
            </span>
          </div>
          <div>
            <span className="ticker-label text-[#4a6180] block text-[11px] font-bold tracking-wider">
              Credible Verdicts
            </span>
            <span className="text-emerald-400 font-extrabold text-sm tracking-wide font-numeric">
              {credibleCount} <span className="font-rajdhani text-xs font-bold tracking-wider text-emerald-400/80">Safe Entities</span>
            </span>
          </div>
          <div>
            <span className="ticker-label text-[#4a6180] block text-[11px] font-bold tracking-wider">
              High Sensitivity Alerts
            </span>
            <span className="text-orange-400 font-extrabold text-sm tracking-wide font-numeric">
              {highRiskCount} <span className="font-rajdhani text-xs font-bold tracking-wider text-orange-400/80">Flagged</span>
            </span>
          </div>
          <div>
            <span className="ticker-label text-[#4a6180] block text-[11px] font-bold tracking-wider">
              Enclave Engine
            </span>
            <span className="text-emerald-400 font-extrabold text-sm flex items-center gap-1 tracking-wide font-rajdhani font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Primary KPI Telemetry Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Analyses */}
        <Card className="kpi-metric-card p-5 border-[#1e2d4f] hover:border-cyan-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold font-space text-[#8fa3bf]">
              Total Analyses
            </span>
            <div className="kpi-icon-coral w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-[#e8edf5] font-numeric tracking-tight">
              {(summary?.total_analyses ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-cyan-400 font-outfit font-medium">
              Recorded
            </span>
          </div>
          <p className="text-[11px] text-[#4a6180] font-plex mt-2 pt-2 border-t border-[#1e2d4f]/60 truncate">
            Persisted in Oracle 21c XE
          </p>
        </Card>

        {/* Text Analyses */}
        <Card className="kpi-metric-card p-5 border-[#1e2d4f] hover:border-violet-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold font-space text-[#8fa3bf]">
              Text Credibility
            </span>
            <div className="kpi-icon-blush w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-violet-300 font-numeric tracking-tight">
              {(summary?.text_analyses ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-violet-400 font-numeric font-medium">
              {totalCount > 0 ? Math.round(((summary?.text_analyses ?? 0) / totalCount) * 100) : 0}% share
            </span>
          </div>
          <p className="text-[11px] text-[#4a6180] font-plex mt-2 pt-2 border-t border-[#1e2d4f]/60 truncate">
            Source credibility & bias extraction
          </p>
        </Card>

        {/* URL Analyses */}
        <Card className="kpi-metric-card p-5 border-[#1e2d4f] hover:border-blue-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold font-space text-[#8fa3bf]">
              URL Investigations
            </span>
            <div className="kpi-icon-coral w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-blue-300 font-numeric tracking-tight">
              {(summary?.url_analyses ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-blue-400 font-numeric font-medium">
              {totalCount > 0 ? Math.round(((summary?.url_analyses ?? 0) / totalCount) * 100) : 0}% share
            </span>
          </div>
          <p className="text-[11px] text-[#4a6180] font-plex mt-2 pt-2 border-t border-[#1e2d4f]/60 truncate">
            Phishing & redirect sensor scans
          </p>
        </Card>

        {/* Completed Operations */}
        <Card className="kpi-metric-card p-5 border-[#1e2d4f] hover:border-emerald-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold font-space text-[#8fa3bf]">
              Completed Scans
            </span>
            <div className="kpi-icon-blush w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-emerald-300 font-numeric tracking-tight">
              {(summary?.completed_analyses ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-emerald-400 font-numeric font-medium">
              {totalCount > 0 ? Math.round(((summary?.completed_analyses ?? 0) / totalCount) * 100) : 100}% success
            </span>
          </div>
          <p className="text-[11px] text-[#4a6180] font-plex mt-2 pt-2 border-t border-[#1e2d4f]/60 truncate">
            Completed investigation pipeline
          </p>
        </Card>
      </div>

      {/* ── 3. Chronological Activity Timeline & Redesigned Statistical Threat Distribution Chart ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Chronological Activity Chart (Left Column) */}
        <Card className="dashboard-chart-card lg:col-span-7 p-6 border-[#1e2d4f] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#e8edf5] text-base font-space">
                    Chronological Threat Analysis Activity
                  </h3>
                  <p className="text-xs text-[#8fa3bf] mt-0.5 font-plex">
                    {activityView === 'daily'
                      ? 'Daily scan density across the last 30 days'
                      : activityView === 'weekly'
                      ? 'Weekly aggregated threat volume (last 12 weeks)'
                      : 'Monthly threat volume (last 12 months)'}
                  </p>
                </div>
              </div>

              {/* Granularity Selector */}
              <div className="chart-tab-group flex items-center gap-1 p-1 bg-[#0a0f1a] rounded-xl border border-[#1e2d4f] self-start sm:self-auto font-outfit">
                {(['daily', 'weekly', 'monthly'] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => changeActivityView(view)}
                    disabled={activityLoading}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all font-outfit ${
                      activityView === view
                        ? 'chart-tab-active bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                        : 'chart-tab-inactive text-[#8fa3bf] hover:text-[#e8edf5] hover:bg-white/5'
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
                        <stop offset="5%" stopColor="var(--color-cyan, #00d4ff)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--color-cyan, #00d4ff)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #1e2d4f)" opacity={0.6} />
                    <XAxis
                      dataKey="date"
                      stroke="var(--color-border, #1e2d4f)"
                      tick={{ fill: 'var(--color-text-secondary, #8fa3bf)', fontSize: 11, fontFamily: "'Times New Roman', Times, serif" }}
                      tickFormatter={(d: string) => {
                        try {
                          const parsed = parseISO(d);
                          if (activityView === 'monthly') return format(parsed, 'MMM yyyy');
                          return format(parsed, 'MMM d');
                        } catch {
                          return String(d);
                        }
                      }}
                    />
                    <YAxis
                      stroke="var(--color-border, #1e2d4f)"
                      tick={{ fill: 'var(--color-text-secondary, #8fa3bf)', fontSize: 11, fontFamily: "'Times New Roman', Times, serif" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-bg-card, #131d35)',
                        borderColor: 'var(--color-border, #1e2d4f)',
                        color: 'var(--color-text-primary, #e8edf5)',
                        borderRadius: 12,
                        boxShadow: 'var(--shadow-md, 0 10px 25px -5px rgba(0, 0, 0, 0.5))',
                        fontFamily: "'Times New Roman', Times, serif",
                      }}
                      labelStyle={{ color: 'var(--color-text-secondary, #8fa3bf)', fontSize: 11, fontWeight: 700 }}
                      itemStyle={{ color: 'var(--color-cyan, #00d4ff)', fontSize: 12, fontWeight: 600 }}
                      formatter={(val: number) => [`${val} ${val === 1 ? 'scan' : 'scans'}`, 'Volume']}
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
                      stroke="var(--color-cyan, #00d4ff)"
                      strokeWidth={2.5}
                      fill="url(#cyberActivityGrad)"
                      activeDot={{ r: 5, fill: 'var(--color-cyan, #00d4ff)', stroke: 'var(--color-bg-primary, #0a0f1a)', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-14 text-center text-xs text-[#8fa3bf] font-plex">
                No analysis activity recorded in this period. Submit a text or URL to initiate telemetry.
              </div>
            )}
          </div>
        </Card>

        {/* Statistical Threat Distribution Pie Chart (Right Column) */}
        <Card className="dashboard-chart-card lg:col-span-5 p-6 border-[#1e2d4f] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1e2d4f]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <PieIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#e8edf5] text-sm font-space">
                    Statistical Threat Distribution
                  </h3>
                  <p className="text-[11px] text-[#8fa3bf] font-plex">
                    {pieMode === 'verdict' ? 'Verdict & credibility classification' : 'Risk & sensitivity classification'}
                  </p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="chart-tab-group flex items-center gap-1 p-0.5 bg-[#0a0f1a] rounded-lg border border-[#1e2d4f] text-[10px] font-outfit self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPieMode('verdict')}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    pieMode === 'verdict'
                      ? 'chart-tab-active bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                      : 'chart-tab-inactive text-[#8fa3bf] hover:text-[#e8edf5]'
                  }`}
                >
                  Verdict
                </button>
                <button
                  type="button"
                  onClick={() => setPieMode('sensitivity')}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    pieMode === 'sensitivity'
                      ? 'chart-tab-active bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm font-semibold'
                      : 'chart-tab-inactive text-[#8fa3bf] hover:text-[#e8edf5]'
                  }`}
                >
                  Sensitivity
                </button>
              </div>
            </div>

            {pieChartData.length > 0 && totalCount > 0 ? (
              <div className="flex flex-col items-center">
                {/* Responsive Doughnut Container with Center Telemetry Badge */}
                <div className="relative w-full h-56 sm:h-60 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={3}
                        dataKey="value"
                        onMouseEnter={(_, index) => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke="var(--color-bg-card, #0f1629)"
                            strokeWidth={activePieIndex === index ? 3 : 2}
                            style={{
                              filter: activePieIndex === index ? `drop-shadow(0 0 8px ${entry.color}80)` : 'none',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Absolute Centered Doughnut Hole Telemetry */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center">
                    <span className="pie-center-value text-2xl sm:text-3xl font-numeric font-extrabold text-[#e8edf5] leading-none tracking-tight">
                      {totalCount}
                    </span>
                    <span className="pie-center-label text-[10px] font-rajdhani font-semibold text-[#8fa3bf] mt-1">
                      {pieMode === 'verdict' ? 'Total Verdicts' : 'Total Scans'}
                    </span>
                  </div>
                </div>

                {/* Structured Enterprise Statistical Legend Table */}
                <div className="w-full mt-2 pt-3 border-t border-[#1e2d4f]/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {pieChartData.map((item, idx) => {
                    const pct = totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(1) : '0';
                    const isHovered = activePieIndex === idx;
                    return (
                      <div
                        key={item.name}
                        onMouseEnter={() => setActivePieIndex(idx)}
                        onMouseLeave={() => setActivePieIndex(null)}
                        className={`pie-stat-legend-item flex flex-col gap-1 p-2 rounded-xl bg-[#0a0f1a]/60 border border-[#1e2d4f]/50 transition-all cursor-pointer ${
                          isHovered ? 'border-cyan-400/60 bg-[#131d35] shadow-md' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="flex items-center gap-1.5 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="pie-stat-legend-name truncate text-[11px] font-space font-medium text-[#e8edf5]">
                              {item.name}
                            </span>
                          </span>
                          <span className="font-numeric font-bold text-xs shrink-0" style={{ color: item.color }}>
                            {item.value} <span className="font-numeric font-normal text-[11px] text-[#8fa3bf]">({pct}%)</span>
                          </span>
                        </div>
                        {/* Mini Proportion Progress Track */}
                        <div className="w-full h-1 bg-[#1e2d4f]/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-14 text-center text-xs text-[#8fa3bf] font-plex">
                No distribution data recorded yet. Submit text or url analyses to populate distribution telemetry.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── 4. Interactive Verdict & Sensitivity Distributions ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verdict Distribution */}
        <Card className="dashboard-chart-card p-6 border-[#1e2d4f] shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e2d4f]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-[#e8edf5] text-sm font-space">
                Verdict & Credibility Distribution
              </h3>
            </div>
            <Link
              to="/dashboard/history"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 font-outfit"
            >
              Filter in History <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {assessmentEntries.length === 0 ? (
            <p className="text-xs text-[#8fa3bf] py-8 text-center font-plex">
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
                      <span className="text-[#e8edf5] font-space font-medium group-hover:text-cyan-300 transition-colors truncate max-w-[240px]">
                        {verdict}
                      </span>
                      <span className="text-[#8fa3bf] font-numeric text-xs font-bold">
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
        <Card className="dashboard-chart-card p-6 border-[#1e2d4f] shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e2d4f]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold text-[#e8edf5] text-sm font-space">
                Sensitivity & Risk Matrix
              </h3>
            </div>
            <Link
              to="/dashboard/history"
              className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 font-outfit"
            >
              Filter in History <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {sensitivityEntries.length === 0 ? (
            <p className="text-xs text-[#8fa3bf] py-8 text-center font-plex">
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
                      <span className="text-[#e8edf5] font-space font-medium group-hover:text-violet-300 transition-colors">
                        {level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()} Sensitivity
                      </span>
                      <span className="text-[#8fa3bf] font-numeric text-xs font-bold">
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
      <Card className="dashboard-chart-card p-6 border-[#1e2d4f] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-3 border-b border-[#1e2d4f]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#0f1629] border border-[#1e2d4f] text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#e8edf5] text-base font-space">
                Recent Threat Analyses
              </h3>
              <p className="text-xs text-[#8fa3bf] font-plex">
                Direct investigation audit trail
              </p>
            </div>
          </div>

          {/* Quick Filter Pill Buttons */}
          <div className="flex items-center gap-2">
            <div className="chart-tab-group flex items-center gap-1 p-1 bg-[#0a0f1a] rounded-xl border border-[#1e2d4f] font-outfit">
              <button
                type="button"
                onClick={() => setRecentFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-outfit transition-colors ${
                  recentFilter === 'all'
                    ? 'chart-tab-active bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'chart-tab-inactive text-[#8fa3bf] hover:text-[#e8edf5]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setRecentFilter('url')}
                className={`px-2.5 py-1 rounded-lg text-xs font-outfit transition-colors ${
                  recentFilter === 'url'
                    ? 'chart-tab-active bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'chart-tab-inactive text-[#8fa3bf] hover:text-[#e8edf5]'
                }`}
              >
                URL Only
              </button>
              <button
                type="button"
                onClick={() => setRecentFilter('text')}
                className={`px-2.5 py-1 rounded-lg text-xs font-outfit transition-colors ${
                  recentFilter === 'text'
                    ? 'chart-tab-active bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'chart-tab-inactive text-[#8fa3bf] hover:text-[#e8edf5]'
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
            title="No Analyses Found"
            description="Submit a text passage or URL to begin tracking threats in your personal enclave."
            action={
              <Link to="/dashboard/analyze/text">
                <Button size="sm" variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />} className="font-outfit">
                  Start Analysis
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="dashboard-recent-table w-full text-sm font-plex">
              <thead>
                <tr className="border-b border-[#1e2d4f] text-[11px] font-rajdhani font-semibold text-[#4a6180]">
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
                    <td className="py-3.5 pr-3 whitespace-nowrap font-numeric text-xs font-bold text-cyan-400 tracking-wider">
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
                        <span className="capitalize text-[#e8edf5] font-space font-medium text-xs">{a.analysis_type}</span>
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
                      <span className={`font-numeric font-bold text-xs ${
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

                    <td className="py-3.5 pr-4 text-[#8fa3bf] text-xs font-numeric whitespace-nowrap">
                      {format(parseISO(a.created_at), 'MMM d, HH:mm')}
                    </td>

                    <td className="py-3.5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center text-xs text-cyan-400 group-hover:translate-x-1 transition-transform font-medium font-outfit">
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
