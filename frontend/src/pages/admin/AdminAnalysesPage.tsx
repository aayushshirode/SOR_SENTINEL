// SOR SENTINEL — Admin Analyses Page
import React, { useEffect, useState, useCallback } from 'react';
import { adminApi, extractErrorMessage } from '@/services/api';
import type { AdminAnalysesItem } from '@/types';
import {
  FileSearch, Search, FileText, Globe,
  ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import { Card, Badge, Spinner } from '@/components/ui/index';

const statusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'cyan' | 'neutral' => {
  switch (status.toLowerCase()) {
    case 'completed': return 'success';
    case 'failed': return 'error';
    case 'processing': return 'cyan';
    default: return 'neutral';
  }
};

const sensitivityBadgeVariant = (level?: string): 'success' | 'warning' | 'error' | 'cyan' | 'neutral' => {
  switch (level?.toLowerCase()) {
    case 'low': return 'success';
    case 'medium': return 'warning';
    case 'high':
    case 'critical': return 'error';
    default: return 'neutral';
  }
};

export default function AdminAnalysesPage() {
  const [analyses, setAnalyses] = useState<AdminAnalysesItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageSize = 15;

  const loadAnalyses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getAnalyses({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
      });
      setAnalyses(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e8edf5] flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-violet-400" />
            System Analyses Audit
          </h1>
          <p className="text-[#8fa3bf] text-sm mt-1">
            Global log of all analysis submissions, model outputs, and credibility findings.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8fa3bf] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search content or URL..."
              className="pl-9 pr-4 py-2 text-sm rounded-lg bg-[#131d35] border border-[#1e2d4f] text-[#e8edf5] placeholder-[#4a6180] focus:outline-none focus:border-cyan-500 w-64"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={loadAnalyses} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : analyses.length === 0 ? (
        <Card className="p-12 text-center">
          <FileSearch className="w-12 h-12 text-[#4a6180] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#e8edf5] mb-1">No analyses found</h3>
          <p className="text-xs text-[#8fa3bf]">
            {search ? 'Try clearing your search query.' : 'No analyses recorded yet.'}
          </p>
        </Card>
      ) : (
        <>
          <div className="rounded-xl border border-[#1e2d4f] overflow-hidden bg-[#131d35]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#0f1629] border-b border-[#1e2d4f] text-xs uppercase font-semibold text-[#8fa3bf]">
                    <th className="px-4 py-3.5">ID</th>
                    <th className="px-4 py-3.5">User ID</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Assessment</th>
                    <th className="px-4 py-3.5 text-center">Score</th>
                    <th className="px-4 py-3.5">Sensitivity</th>
                    <th className="px-4 py-3.5 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d4f]">
                  {analyses.map((a) => (
                    <tr key={a.id} className="hover:bg-[#1a2540] transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-[#8fa3bf]">
                        #{a.id}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-[#e8edf5]">
                        User {a.user_id}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-[#e8edf5]">
                          {a.analysis_type === 'url' ? (
                            <Globe className="w-3.5 h-3.5 text-violet-400" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                          <span className="capitalize">{a.analysis_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={statusBadgeVariant(a.status)}>
                          {a.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px] truncate text-xs text-[#e8edf5]">
                        {a.overall_assessment || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold font-mono">
                        {a.credibility_score != null ? (
                          <span
                            className={
                              a.credibility_score >= 70
                                ? 'text-green-400'
                                : a.credibility_score >= 40
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }
                          >
                            {a.credibility_score}
                          </span>
                        ) : (
                          <span className="text-[#4a6180]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {a.sensitivity_level ? (
                          <Badge variant={sensitivityBadgeVariant(a.sensitivity_level)}>
                            {a.sensitivity_level}
                          </Badge>
                        ) : (
                          <span className="text-xs text-[#4a6180]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-[#8fa3bf] whitespace-nowrap">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-[#8fa3bf]">
              <div>
                Showing page {page} of {totalPages} ({total} analyses total)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg bg-[#131d35] border border-[#1e2d4f] text-[#8fa3bf] hover:text-[#e8edf5] disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg bg-[#131d35] border border-[#1e2d4f] text-[#8fa3bf] hover:text-[#e8edf5] disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
