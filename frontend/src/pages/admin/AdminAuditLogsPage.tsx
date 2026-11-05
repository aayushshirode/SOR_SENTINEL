// SOR SENTINEL — Admin Audit Logs Page
import React, { useEffect, useState, useCallback } from 'react';
import { adminApi, extractErrorMessage } from '@/services/api';
import type { AuditLogItem } from '@/types';
import {
  ScrollText, Search, Shield, Clock,
  ChevronLeft, ChevronRight, AlertCircle, Filter
} from 'lucide-react';
import { Card, Badge, Spinner } from '@/components/ui/index';

const actionBadgeVariant = (action: string): 'success' | 'warning' | 'error' | 'cyan' | 'violet' | 'neutral' => {
  if (action.includes('login') || action.includes('auth')) return 'cyan';
  if (action.includes('activate')) return 'success';
  if (action.includes('deactivate')) return 'error';
  if (action.includes('analysis')) return 'violet';
  return 'neutral';
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageSize = 20;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getAuditLogs({
        page,
        action: actionFilter.trim() || undefined,
      });
      setLogs(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e8edf5] flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-pink-400" />
            System Audit & Security Logs
          </h1>
          <p className="text-[#8fa3bf] text-sm mt-1">
            Immutable chronological audit trail of user access, security triggers, and system mutations.
          </p>
        </div>

        {/* Action filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#8fa3bf]" />
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by action name..."
            className="px-3 py-2 text-sm rounded-lg bg-[#131d35] border border-[#1e2d4f] text-[#e8edf5] placeholder-[#4a6180] focus:outline-none focus:border-cyan-500 w-52"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={loadLogs} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center">
          <ScrollText className="w-12 h-12 text-[#4a6180] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#e8edf5] mb-1">No audit records found</h3>
          <p className="text-xs text-[#8fa3bf]">
            {actionFilter ? 'Try clearing your action filter.' : 'No audit entries have been generated yet.'}
          </p>
        </Card>
      ) : (
        <>
          <div className="rounded-xl border border-[#1e2d4f] overflow-hidden bg-[#131d35]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#0f1629] border-b border-[#1e2d4f] text-xs uppercase font-semibold text-[#8fa3bf]">
                    <th className="px-4 py-3.5">Log ID</th>
                    <th className="px-4 py-3.5">Action Event</th>
                    <th className="px-4 py-3.5">User</th>
                    <th className="px-4 py-3.5">Target Resource</th>
                    <th className="px-4 py-3.5">Source IP</th>
                    <th className="px-4 py-3.5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d4f]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#1a2540] transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-[#8fa3bf]">
                        #{log.id}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={actionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#e8edf5]">
                        {log.user_id != null ? (
                          <span className="font-numeric">User #{log.user_id}</span>
                        ) : (
                          <span className="text-[#4a6180] italic">System / Anonymous</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#8fa3bf]">
                        {log.resource_type ? (
                          <span>
                            {log.resource_type}{log.resource_id ? ` #${log.resource_id}` : ''}
                          </span>
                        ) : (
                          <span className="text-[#4a6180]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-[#8fa3bf]">
                        {log.ip_address || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-[#8fa3bf] font-numeric whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-[#8fa3bf] font-numeric">
              <div>
                Showing page {page} of {totalPages} ({total} events recorded)
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
