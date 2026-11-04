// SOR SENTINEL — Admin Contact Messages Page
import React, { useEffect, useState, useCallback } from 'react';
import { adminApi, extractErrorMessage } from '@/services/api';
import type { ContactMessage } from '@/types';
import {
  MessageSquare, Mail, User, Clock, CheckCircle,
  ChevronLeft, ChevronRight, AlertCircle, Filter
} from 'lucide-react';
import { Card, Badge, Spinner } from '@/components/ui/index';
import toast from 'react-hot-toast';

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const pageSize = 10;

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getMessages({
        page,
        status: statusFilter || undefined,
      });
      setMessages(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleMarkRead = async (id: number) => {
    setActionLoading(id);
    try {
      await adminApi.markMessageRead(id);
      toast.success('Message marked as read');
      loadMessages();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e8edf5] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-yellow-400" />
            Contact Inquiries & Feedback
          </h1>
          <p className="text-[#8fa3bf] text-sm mt-1">
            Review inquiries submitted through the public contact form.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#8fa3bf]" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm rounded-lg bg-[#131d35] border border-[#1e2d4f] text-[#e8edf5] focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="unread">Unread Only</option>
            <option value="read">Read Only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={loadMessages} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : messages.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="w-12 h-12 text-[#4a6180] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#e8edf5] mb-1">No messages found</h3>
          <p className="text-xs text-[#8fa3bf]">
            {statusFilter ? 'Try changing your status filter.' : 'No contact form submissions received.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((m) => (
            <Card key={m.id} className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#1e2d4f]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#e8edf5]">{m.subject}</h3>
                    <Badge variant={m.status === 'unread' ? 'warning' : 'success'}>
                      {m.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#8fa3bf]">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      {m.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-violet-400" />
                      <a href={`mailto:${m.email}`} className="hover:text-cyan-400 underline">
                        {m.email}
                      </a>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {m.status === 'unread' && (
                  <button
                    onClick={() => handleMarkRead(m.id)}
                    disabled={actionLoading === m.id}
                    className="self-start px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Mark Read
                  </button>
                )}
              </div>

              <div className="text-sm text-[#e8edf5] bg-[#0f1629] p-4 rounded-lg border border-[#1e2d4f] whitespace-pre-wrap leading-relaxed">
                {m.message}
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-[#8fa3bf] pt-2">
              <div>
                Showing page {page} of {totalPages} ({total} inquiries total)
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
        </div>
      )}
    </div>
  );
}
