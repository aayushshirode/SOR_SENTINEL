// SOR SENTINEL — Admin Overview Page
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, extractErrorMessage } from '@/services/api';
import type { AdminOverview } from '@/types';
import {
  Users, FileText, MessageSquare, Database, Bot,
  Activity, CheckCircle, AlertTriangle, ArrowUpRight, Clock
} from 'lucide-react';
import { Card, Badge, Spinner, ErrorState } from '@/components/ui/index';

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getOverview();
      setOverview(res.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <ErrorState
        title="Failed to Load Admin Overview"
        message={error || 'Could not retrieve system statistics.'}
        onRetry={loadData}
      />
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: overview.total_users,
      sub: `${overview.active_users} active accounts`,
      icon: Users,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      link: '/admin/users',
    },
    {
      title: 'Total Analyses',
      value: overview.total_analyses,
      sub: `${overview.analyses_today} executed today`,
      icon: FileText,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/20',
      link: '/admin/analyses',
    },
    {
      title: 'Pending Messages',
      value: overview.pending_messages,
      sub: 'Contact inquiries waiting',
      icon: MessageSquare,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      link: '/admin/messages',
    },
    {
      title: 'Database Status',
      value: overview.db_status.toUpperCase(),
      sub: 'Oracle Database XE/Free',
      icon: Database,
      color: overview.db_status === 'connected' ? 'text-green-400' : 'text-red-400',
      bgColor: overview.db_status === 'connected' ? 'bg-green-500/10' : 'bg-red-500/10',
      borderColor: overview.db_status === 'connected' ? 'border-green-500/20' : 'border-red-500/20',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e8edf5] flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-400" />
            System Administration Overview
          </h1>
          <p className="text-[#8fa3bf] text-sm mt-1">
            Real-time telemetry and management controls for SOR SENTINEL.
          </p>
        </div>
        <button
          onClick={loadData}
          className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#131d35] border border-[#1e2d4f] text-[#8fa3bf] hover:text-[#e8edf5] hover:border-cyan-500/30 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#8fa3bf] uppercase tracking-wider">
                    {card.title}
                  </span>
                  <div className="text-2xl font-bold font-numeric text-[#e8edf5] mt-1">
                    {card.value}
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl border ${card.bgColor} ${card.borderColor}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#1e2d4f] flex items-center justify-between">
                <span className="text-xs text-[#8fa3bf]">{card.sub}</span>
                {card.link && (
                  <Link
                    to={card.link}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                  >
                    View <ArrowUpRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Connectivity & Services Health */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-bold text-[#e8edf5] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            Oracle Database Integration
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f1629] border border-[#1e2d4f]">
              <span className="text-sm text-[#8fa3bf]">Connection Driver</span>
              <span className="text-sm font-mono text-[#e8edf5]">python-oracledb</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f1629] border border-[#1e2d4f]">
              <span className="text-sm text-[#8fa3bf]">ORM Mapping</span>
              <span className="text-sm font-mono text-[#e8edf5]">SQLAlchemy 2.0</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f1629] border border-[#1e2d4f]">
              <span className="text-sm text-[#8fa3bf]">Live Connection State</span>
              <Badge variant={overview.db_status === 'connected' ? 'success' : 'error'}>
                {overview.db_status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-bold text-[#e8edf5] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4 text-violet-400" />
            AI Service Connectivity
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f1629] border border-[#1e2d4f]">
              <span className="text-sm text-[#8fa3bf]">AI Provider</span>
              <span className="text-sm font-mono text-[#e8edf5]">OpenRouter API</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f1629] border border-[#1e2d4f]">
              <span className="text-sm text-[#8fa3bf]">Execution Boundary</span>
              <span className="text-sm font-mono text-cyan-400">Server-Side Only</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f1629] border border-[#1e2d4f]">
              <span className="text-sm text-[#8fa3bf]">Provider Reachability</span>
              <Badge variant={overview.ai_status === 'reachable' ? 'success' : 'warning'}>
                {overview.ai_status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-[#e8edf5] uppercase tracking-wider mb-4">
          Management Controls
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/users"
            className="p-4 rounded-xl bg-[#0f1629] border border-[#1e2d4f] hover:border-cyan-500/30 transition-colors block"
          >
            <Users className="w-5 h-5 text-cyan-400 mb-2" />
            <div className="text-sm font-bold text-[#e8edf5]">User Management</div>
            <p className="text-xs text-[#8fa3bf] mt-1">Activate, deactivate, and view registered accounts.</p>
          </Link>
          <Link
            to="/admin/analyses"
            className="p-4 rounded-xl bg-[#0f1629] border border-[#1e2d4f] hover:border-cyan-500/30 transition-colors block"
          >
            <FileText className="w-5 h-5 text-violet-400 mb-2" />
            <div className="text-sm font-bold text-[#e8edf5]">All Analyses</div>
            <p className="text-xs text-[#8fa3bf] mt-1">Audit submissions, statuses, and credibility outcomes.</p>
          </Link>
          <Link
            to="/admin/messages"
            className="p-4 rounded-xl bg-[#0f1629] border border-[#1e2d4f] hover:border-cyan-500/30 transition-colors block"
          >
            <MessageSquare className="w-5 h-5 text-yellow-400 mb-2" />
            <div className="text-sm font-bold text-[#e8edf5]">Contact Inquiries</div>
            <p className="text-xs text-[#8fa3bf] mt-1">Review user messages and mark inquiries as resolved.</p>
          </Link>
          <Link
            to="/admin/audit-logs"
            className="p-4 rounded-xl bg-[#0f1629] border border-[#1e2d4f] hover:border-cyan-500/30 transition-colors block"
          >
            <Clock className="w-5 h-5 text-pink-400 mb-2" />
            <div className="text-sm font-bold text-[#e8edf5]">System Audit Logs</div>
            <p className="text-xs text-[#8fa3bf] mt-1">Track security events, logins, and administrative actions.</p>
          </Link>
        </div>
      </Card>
    </div>
  );
}
