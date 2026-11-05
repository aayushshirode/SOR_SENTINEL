// SOR SENTINEL — Admin Layout with Logout Confirmation
import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileSearch, MessageSquare,
  ScrollText, LogOut, Shield, Menu, X, ChevronRight, Activity, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import toast from 'react-hot-toast';

const adminNavItems = [
  { to: '/admin', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" />, exact: true },
  { to: '/admin/users', label: 'User Management', icon: <Users className="w-4 h-4" /> },
  { to: '/admin/analyses', label: 'All Analyses', icon: <FileSearch className="w-4 h-4" /> },
  { to: '/admin/messages', label: 'Contact Messages', icon: <MessageSquare className="w-4 h-4" /> },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: <ScrollText className="w-4 h-4" /> },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    toast.success('Logged out successfully.');
    navigate('/');
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const isActive = (to: string, exact = false) =>
    exact ? location.pathname === to : location.pathname.startsWith(to) && (exact || to !== '/admin' || location.pathname === '/admin');

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-4 border-b border-[#1e2d4f]">
        <BrandLogo size="sm" linkTo="/admin" subtext="Admin Panel" />
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="font-rajdhani text-[#4a6180] text-xs font-bold uppercase tracking-widest px-2 mb-2">Administration</p>
        <div className="flex flex-col gap-0.5">
          {adminNavItems.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-outfit transition-all',
                  active
                    ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20 font-semibold'
                    : 'text-[#8fa3bf] hover:text-[#e8edf5] hover:bg-white/5 font-medium'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-[#1e2d4f]">
          <p className="font-rajdhani text-[#4a6180] text-xs font-bold uppercase tracking-widest px-2 mb-2">Navigation</p>
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-outfit text-[#8fa3bf] hover:text-cyan-400 hover:bg-cyan-500/5 transition-colors font-medium"
          >
            <Activity className="w-4 h-4" />
            User Dashboard
          </Link>
        </div>
      </nav>

      <div className="p-3 border-t border-[#1e2d4f]">
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#8fa3bf] hover:text-red-400 hover:bg-red-500/5 transition-colors w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <div className="p-3 border-t border-[#1e2d4f]">
        <div className="flex items-center gap-3">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="w-8 h-8 rounded-full object-cover shrink-0 border border-violet-500/30"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.full_name?.charAt(0).toUpperCase() || 'A'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[#e8edf5] text-sm font-medium truncate">{user?.full_name}</p>
            <p className="text-violet-400 text-xs font-semibold">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0a0f1a] overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 bg-[#0f1629] border-r border-[#1e2d4f] shrink-0">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-[#0f1629] border-r border-[#1e2d4f] flex flex-col z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-[#0f1629] border-b border-[#1e2d4f] flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-[#8fa3bf] hover:text-[#e8edf5] p-1"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-sm text-[#8fa3bf]">
              <span className="text-violet-400 font-semibold">Admin</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#e8edf5]">
                {adminNavItems.find(n => n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to))?.label || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <ThemeSwitcher />
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              title="Log out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#8fa3bf] hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-[#1e2d4f] hover:border-red-500/30 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#131d35] border border-[#1e2d4f] rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-[#e8edf5] text-base">Sign Out Confirmation</h3>
                <p className="text-xs text-[#8fa3bf]">Administrator Session</p>
              </div>
            </div>

            <p className="text-sm text-[#e8edf5] leading-relaxed">
              Are you sure you want to log out?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelLogout}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmLogout}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
