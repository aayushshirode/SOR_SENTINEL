// SOR SENTINEL — Admin User Management Page
import React, { useEffect, useState, useCallback } from 'react';
import { adminApi, extractErrorMessage } from '@/services/api';
import type { AdminUserListItem } from '@/types';
import {
  Users, Search, CheckCircle, XCircle, Shield,
  ChevronLeft, ChevronRight, UserCheck, UserX, AlertCircle
} from 'lucide-react';
import { Card, Badge, Spinner } from '@/components/ui/index';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const pageSize = 15;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getUsers({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
      });
      setUsers(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleToggleStatus = async (user: AdminUserListItem) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${user.full_name}?`)) return;

    setActionLoading(user.id);
    try {
      if (user.is_active) {
        await adminApi.deactivateUser(user.id);
        toast.success(`User ${user.full_name} deactivated`);
      } else {
        await adminApi.activateUser(user.id);
        toast.success(`User ${user.full_name} activated`);
      }
      loadUsers();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e8edf5] flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            User Management
          </h1>
          <p className="text-[#8fa3bf] text-sm mt-1">
            Browse registered accounts, monitor analysis volume, and control system access.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8fa3bf] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or email..."
              className="pl-9 pr-4 py-2 text-sm rounded-lg bg-[#131d35] border border-[#1e2d4f] text-[#e8edf5] placeholder-[#4a6180] focus:outline-none focus:border-cyan-500 w-64"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-cyan-500 text-[#0a0f1a] hover:bg-cyan-400 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={loadUsers} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-[#4a6180] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#e8edf5] mb-1">No users found</h3>
          <p className="text-xs text-[#8fa3bf]">
            {search ? 'Try clearing your search query.' : 'No registered users in the database.'}
          </p>
        </Card>
      ) : (
        <>
          <div className="rounded-xl border border-[#1e2d4f] overflow-hidden bg-[#131d35]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#0f1629] border-b border-[#1e2d4f] text-xs uppercase font-semibold text-[#8fa3bf]">
                    <th className="px-4 py-3.5">User</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-center">Analyses</th>
                    <th className="px-4 py-3.5">Joined</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d4f]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#1a2540] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[#e8edf5]">{u.full_name}</div>
                        <div className="text-xs text-[#8fa3bf]">{u.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={u.role === 'admin' ? 'violet' : 'neutral'}>
                          {u.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={u.is_active ? 'success' : 'error'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-center font-numeric font-bold text-[#e8edf5]">
                        {u.analysis_count}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#8fa3bf] font-numeric whitespace-nowrap">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={actionLoading === u.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                            u.is_active
                              ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
                              : 'border-green-500/20 text-green-400 hover:bg-green-500/10'
                          } disabled:opacity-40`}
                        >
                          {u.is_active ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Activate
                            </>
                          )}
                        </button>
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
                Showing page {page} of {totalPages} ({total} users total)
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
