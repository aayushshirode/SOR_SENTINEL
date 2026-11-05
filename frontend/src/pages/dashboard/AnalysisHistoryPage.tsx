// SOR SENTINEL — Cyber Threat Analysis History & SIEM Audit Records
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { analysisApi, type AnalysisFilterParams } from '../../services/api';
import type { AnalysisSummary, PaginatedAnalyses, AnalysisResponse } from '../../types';
import AnalysisResultPanel from '@/components/analysis/AnalysisResultPanel';
import {
  History, FileText, Globe, Trash2, Eye, AlertCircle, Search,
  ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileCheck,
  RotateCcw, Filter, X, ExternalLink, Calendar, ArrowUpDown,
  ShieldCheck, ShieldAlert, Sparkles, Database, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/index';
import { formatKolkataDateTime } from '@/utils/date';
import toast from 'react-hot-toast';

const sensitivityColors: Record<string, string> = {
  low:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  high:     'bg-orange-500/15 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  LOW:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  MEDIUM:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  HIGH:     'bg-orange-500/15 text-orange-400 border-orange-500/30',
  CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export default function AnalysisHistoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState<PaginatedAnalyses | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination & Filtering state initialized with URL search params if present
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verdictFilter, setVerdictFilter] = useState(() => searchParams.get('verdict') || '');
  const [sensitivityFilter, setSensitivityFilter] = useState(() => searchParams.get('sensitivity_level') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'score' | 'type'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Export states
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Quick Detail Modal state
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [modalAnalysis, setModalAnalysis] = useState<AnalysisResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Helper for active filter check
  const activeFilterCount = [
    search, typeFilter, statusFilter, verdictFilter, sensitivityFilter, startDate, endDate
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: AnalysisFilterParams = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (search.trim()) params.search = search.trim();
      if (typeFilter) params.analysis_type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (verdictFilter) params.verdict = verdictFilter;
      if (sensitivityFilter) params.sensitivity_level = sensitivityFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await analysisApi.listAnalyses(params);
      setData(res.data);
    } catch {
      setError('Failed to load analysis history. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, typeFilter, statusFilter, verdictFilter, sensitivityFilter, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => {
    load();
  }, [load]);

  // Open Quick View Modal
  const openQuickView = async (id: number) => {
    setSelectedAnalysisId(id);
    setModalLoading(true);
    try {
      const res = await analysisApi.getAnalysis(id);
      setModalAnalysis(res.data);
    } catch {
      toast.error('Failed to load analysis details');
      setSelectedAnalysisId(null);
    } finally {
      setModalLoading(false);
    }
  };

  const closeQuickView = () => {
    setSelectedAnalysisId(null);
    setModalAnalysis(null);
  };

  async function handleDelete(id: number) {
    if (!window.confirm(`Delete analysis record #TR-${String(id).padStart(5, '0')}? This cannot be undone.`)) return;
    try {
      await analysisApi.deleteAnalysis(id);
      toast.success('Analysis purged from enclave database');
      if (selectedAnalysisId === id) closeQuickView();
      load();
    } catch {
      toast.error('Failed to delete analysis');
    }
  }

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
    setVerdictFilter('');
    setSensitivityFilter('');
    setStartDate('');
    setEndDate('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getExportParams = () => {
    const params: Record<string, string> = {};
    if (search.trim()) params.search = search.trim();
    if (typeFilter) params.analysis_type = typeFilter;
    if (statusFilter) params.status = statusFilter;
    if (verdictFilter) params.verdict = verdictFilter;
    if (sensitivityFilter) params.sensitivity_level = sensitivityFilter;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return params;
  };

  const handleExportCsv = async () => {
    if (!data?.total) {
      toast.error('No analysis records available to export.');
      return;
    }
    setIsExportingCsv(true);
    try {
      const res = await analysisApi.exportCsv(getExportParams());
      downloadBlob(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }), 'sor_sentinel_analyses.csv');
      toast.success('Analysis history exported to CSV.');
    } catch {
      toast.error('Failed to export CSV. Please try again.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    if (!data?.total) {
      toast.error('No analysis records available to export.');
      return;
    }
    setIsExportingPdf(true);
    try {
      const res = await analysisApi.exportPdf(getExportParams());
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), 'sor_sentinel_analyses.pdf');
      toast.success('Executive PDF audit report downloaded.');
    } catch {
      toast.error('Failed to export PDF report. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const totalPages = data ? Math.max(1, data.total_pages) : 1;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-16">
      {/* ── 1. Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#e8edf5] tracking-tight">
              Investigation History & Audit Trail
            </h1>
            <p className="text-sm text-[#8fa3bf] mt-0.5">
              Searchable, filterable threat intelligence records persisted in Oracle Database 21c XE.
            </p>
          </div>
        </div>

        {/* Export Actions Bar */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap font-outfit">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExportingCsv || !data?.total}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-outfit font-semibold rounded-lg bg-[#131d35] border border-[#1e2d4f] hover:border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title="Export filtered records as CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExportingCsv ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf || !data?.total}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-outfit font-semibold rounded-lg bg-[#131d35] border border-[#1e2d4f] hover:border-violet-500/40 text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title="Generate executive PDF report"
          >
            <FileCheck className="w-4 h-4" />
            <span>{isExportingPdf ? 'Generating...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Filter & Investigation Search Console ─────────────────────────── */}
      <Card className="p-5 border-[#1e2d4f] shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#4a6180] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by URL, text content, verdict, or finding keywords..."
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl bg-[#0a0f1a] border border-[#1e2d4f] text-[#e8edf5] placeholder-[#4a6180] focus:outline-none focus:border-cyan-500 font-sans transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8fa3bf] hover:text-[#e8edf5]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Sort Control */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0a0f1a] border border-[#1e2d4f] text-xs font-mono text-[#8fa3bf]">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sort:</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [sb, so] = e.target.value.split('-') as [any, any];
                  setSortBy(sb);
                  setSortOrder(so);
                  setPage(1);
                }}
                className="bg-transparent text-cyan-400 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="created_at-desc" className="bg-[#131d35] text-[#e8edf5]">Newest First</option>
                <option value="created_at-asc" className="bg-[#131d35] text-[#e8edf5]">Oldest First</option>
                <option value="score-desc" className="bg-[#131d35] text-[#e8edf5]">Score (Highest)</option>
                <option value="score-asc" className="bg-[#131d35] text-[#e8edf5]">Score (Lowest)</option>
                <option value="type-asc" className="bg-[#131d35] text-[#e8edf5]">Type (A-Z)</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors font-medium"
                title="Reset active filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ({activeFilterCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-[#1e2d4f]/60 text-xs">
          {/* Type Filter */}
          <div>
            <label className="text-[11px] font-mono font-medium text-[#4a6180] block mb-1">
              Analysis Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0a0f1a] border border-[#1e2d4f] text-[#e8edf5] focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="text">Text Analysis</option>
              <option value="url">URL Analysis</option>
            </select>
          </div>

          {/* Verdict Filter */}
          <div>
            <label className="text-[11px] font-mono font-medium text-[#4a6180] block mb-1">
              Assessment Verdict
            </label>
            <select
              value={verdictFilter}
              onChange={(e) => { setVerdictFilter(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0a0f1a] border border-[#1e2d4f] text-[#e8edf5] focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="">All Verdicts</option>
              <option value="Legitimate">Likely Legitimate / Credible</option>
              <option value="Suspicious">Suspicious</option>
              <option value="Misleading">Potentially Misleading</option>
              <option value="Sensitive">Contains Sensitive Content</option>
              <option value="Inconclusive">Inconclusive / Verification</option>
            </select>
          </div>

          {/* Sensitivity Filter */}
          <div>
            <label className="text-[11px] font-mono font-medium text-[#4a6180] block mb-1">
              Sensitivity Rating
            </label>
            <select
              value={sensitivityFilter}
              onChange={(e) => { setSensitivityFilter(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0a0f1a] border border-[#1e2d4f] text-[#e8edf5] focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="">All Levels</option>
              <option value="low">Low Sensitivity</option>
              <option value="medium">Medium Sensitivity</option>
              <option value="high">High Sensitivity</option>
              <option value="critical">Critical Sensitivity</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[11px] font-mono font-medium text-[#4a6180] block mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0a0f1a] border border-[#1e2d4f] text-[#e8edf5] focus:outline-none focus:border-cyan-500 cursor-pointer font-mono"
            />
          </div>

          {/* End Date */}
          <div className="col-span-2 sm:col-span-1">
            <label className="text-[11px] font-mono font-medium text-[#4a6180] block mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0a0f1a] border border-[#1e2d4f] text-[#e8edf5] focus:outline-none focus:border-cyan-500 cursor-pointer font-mono"
            />
          </div>
        </div>
      </Card>

      {/* ── 3. Table / Records Listing ───────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={load} className="ml-auto text-xs underline font-medium">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[#131d35] border border-[#1e2d4f] animate-pulse" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <Card className="p-12 text-center border-[#1e2d4f] space-y-4">
          <Search className="w-10 h-10 text-[#4a6180] mx-auto" />
          <div>
            <h3 className="text-base font-bold text-[#e8edf5]">No threat records located</h3>
            <p className="text-xs text-[#8fa3bf] mt-1 max-w-md mx-auto leading-relaxed">
              {hasActiveFilters
                ? 'No analysis records match your active search and filter parameters. Try clearing filters.'
                : 'Your enclave has no recorded threat scans yet. Execute a text or URL scan to begin auditing.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {hasActiveFilters ? (
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Clear All Filters
              </Button>
            ) : (
              <>
                <Link to="/dashboard/analyze/text">
                  <Button size="sm" variant="primary">Scan Text</Button>
                </Link>
                <Link to="/dashboard/analyze/url">
                  <Button size="sm" variant="outline">Investigate URL</Button>
                </Link>
              </>
            )}
          </div>
        </Card>
      ) : (
        <>
          <div className="analysis-table-container rounded-2xl border border-[#1e2d4f] overflow-hidden bg-[#0f1629] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-plex">
                <thead>
                  <tr className="border-b border-[#1e2d4f] bg-[#0c1427] text-[11px] font-rajdhani font-semibold text-[#4a6180]">
                    <th className="text-left px-3 py-3 w-12">No.</th>
                    <th className="text-left px-3 py-3">ID</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Target / Preview</th>
                    <th className="text-left px-4 py-3">Verdict</th>
                    <th className="text-left px-4 py-3">Score</th>
                    <th className="text-left px-4 py-3">Sensitivity</th>
                    <th className="text-left px-4 py-3">Date (IST)</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d4f]">
                  {data?.items.map((item: AnalysisSummary, idx: number) => (
                    <tr
                      key={item.id}
                      onClick={() => openQuickView(item.id)}
                      className="analysis-table-row border-b border-[#1e2d4f] transition-colors cursor-pointer group"
                      title="Click row to open quick threat inspection"
                    >
                      {/* Sequential Presentation Row Number */}
                      <td className="px-3 py-3.5 whitespace-nowrap text-xs font-numeric font-bold text-[#4a6180]">
                        {String((page - 1) * 20 + idx + 1).padStart(2, '0')}
                      </td>

                      {/* Permanent Immutable Database Analysis ID */}
                      <td className="px-3 py-3.5 whitespace-nowrap font-numeric text-xs font-bold text-cyan-400 tracking-wider">
                        #TR-{String(item.id).padStart(5, '0')}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {item.analysis_type === 'url' ? (
                            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                          )}
                          <span className="capitalize text-[#e8edf5] font-outfit font-semibold text-xs">
                            {item.analysis_type}
                          </span>
                        </div>
                      </td>

                      {/* Content Preview */}
                      <td className="px-4 py-3.5 max-w-[240px]">
                        <p
                          className="text-[#8fa3bf] text-xs truncate font-plex group-hover:text-[#e8edf5] transition-colors"
                          title={item.input_text_preview || item.input_url || item.input_preview || ''}
                        >
                          {item.input_text_preview || item.input_url || item.input_preview || '—'}
                        </p>
                      </td>

                      {/* Verdict */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-outfit font-semibold text-[#e8edf5]">
                          {item.overall_assessment || '—'}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.credibility_score != null ? (
                          <span
                            className={`font-numeric font-bold text-xs ${
                              item.credibility_score >= 70
                                ? 'text-emerald-400'
                                : item.credibility_score >= 40
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}
                          >
                            {item.credibility_score}/100
                          </span>
                        ) : (
                          <span className="text-[#4a6180] text-xs">—</span>
                        )}
                      </td>

                      {/* Sensitivity */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.sensitivity_level ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-rajdhani font-bold tracking-wider uppercase border ${sensitivityColors[item.sensitivity_level] || 'bg-white/5 text-[#8fa3bf]'}`}>
                            {item.sensitivity_level}
                          </span>
                        ) : (
                          <span className="text-[#4a6180] text-xs">—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-[#8fa3bf] text-xs font-numeric whitespace-nowrap" title={formatKolkataDateTime(item.created_at)}>
                        {formatKolkataDateTime(item.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => openQuickView(item.id)}
                            className="p-1.5 rounded-lg text-[#8fa3bf] hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                            title="Quick view"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/dashboard/history/${item.id}`}
                            className="p-1.5 rounded-lg text-[#8fa3bf] hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                            title="Open full report dossier"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg text-[#8fa3bf] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination Controls ─────────────────────────────────────────── */}
          <div className="pagination-bar flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#0f1629] border border-[#1e2d4f] rounded-2xl text-xs text-[#8fa3bf]">
            <div className="flex items-center gap-3">
              <span>
                Showing <span className="font-numeric font-medium">{((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, data?.total ?? 0)}</span> of{' '}
                <strong className="text-[#e8edf5] font-numeric font-bold">{data?.total ?? 0}</strong> records
              </span>

              <div className="flex items-center gap-1.5 font-numeric">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-[#131d35] border border-[#1e2d4f] text-[#e8edf5] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer font-numeric"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 font-numeric">
              <span className="mr-2">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-[#131d35] border border-[#1e2d4f] text-[#8fa3bf] hover:text-[#e8edf5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-[#131d35] border border-[#1e2d4f] text-[#8fa3bf] hover:text-[#e8edf5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Quick Detail Inspection Modal ────────────────────────────────────── */}
      {selectedAnalysisId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f1629] border border-[#1e2d4f] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#1e2d4f] flex items-center justify-between bg-[#131d35]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#e8edf5]">
                    Threat Record Inspection #{selectedAnalysisId}
                  </h3>
                  <p className="text-[11px] text-[#8fa3bf]">
                    Comprehensive Security & Credibility Findings
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/dashboard/history/${selectedAnalysisId}`}
                  className="px-2.5 py-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg border border-cyan-500/30 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Full Dossier</span>
                </Link>
                <button
                  type="button"
                  onClick={closeQuickView}
                  className="p-1 text-[#8fa3bf] hover:text-[#e8edf5] rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {modalLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-[#8fa3bf] font-mono">Retrieving analysis dossier from Oracle XE...</p>
                </div>
              ) : modalAnalysis ? (
                <div className="space-y-4">
                  {/* Target Preview */}
                  <div className="p-3 bg-[#131d35] border border-[#1e2d4f] rounded-xl text-xs space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#8fa3bf] tracking-wider font-mono">
                      Target / Submitted Content
                    </span>
                    <p className="text-[#e8edf5] font-mono break-all text-xs">
                      {modalAnalysis.url_analyzed || modalAnalysis.input_url || modalAnalysis.input_text || modalAnalysis.text_content || '—'}
                    </p>
                  </div>

                  {/* Complete Analysis Result Panel */}
                  <AnalysisResultPanel analysis={modalAnalysis} />
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[#8fa3bf]">
                  Unable to load analysis record.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
