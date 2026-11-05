// SOR SENTINEL — Modern Cyber Intelligence Dashboard Layout
import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Globe, Clock, User,
  LogOut, Shield, Menu, X, ChevronRight, HelpCircle,
  Lock, Bot, Activity, Terminal, ShieldCheck, Sparkles, Database
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { PostLoginPasswordPrompt } from '@/components/auth/PostLoginPasswordPrompt';
import toast from 'react-hot-toast';

interface NavGroup {
  title: string;
  items: {
    to: string;
    label: string;
    icon: React.ReactNode;
    exact?: boolean;
    badge?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    title: 'THREAT INTELLIGENCE',
    items: [
      { to: '/dashboard', label: 'INTELLIGENCE OVERVIEW', icon: <LayoutDashboard className="w-4 h-4" />, exact: true },
      { to: '/dashboard/analyze/text', label: 'TEXT CREDIBILITY', icon: <FileText className="w-4 h-4" /> },
      { to: '/dashboard/analyze/url', label: 'URL THREAT SCANNER', icon: <Globe className="w-4 h-4" /> },
      { to: '/dashboard/history', label: 'INVESTIGATION HISTORY', icon: <Clock className="w-4 h-4" /> },
    ],
  },
  {
    title: 'VAULT & INTELLIGENCE',
    items: [
      { to: '/dashboard/digikeeper', label: 'DIGKEEPER DOCUMENT VAULT', icon: <Lock className="w-4 h-4" /> },
      { to: '/dashboard/cubbis', label: 'CUBBIS CYBER AI', icon: <Bot className="w-4 h-4" /> },
    ],
  },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    toast.success('Secure session terminated.');
    navigate('/');
  };

  const isActive = (to: string, exact = false) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  // Find active item label for topbar breadcrumb (original normal title casing)
  const breadcrumbMap: Record<string, string> = {
    '/dashboard/analyze/text': 'Text Credibility',
    '/dashboard/analyze/url': 'URL Threat Scanner',
    '/dashboard/history': 'Investigation History',
    '/dashboard/digikeeper': 'DigiKeeper Document Vault',
    '/dashboard/cubbis': 'Cubbis Cyber AI',
    '/dashboard/profile': 'Account & Security',
    '/dashboard': 'Intelligence Overview',
  };
  const currentBreadcrumb = Object.entries(breadcrumbMap).find(([to]) =>
    to === '/dashboard' ? location.pathname === to : location.pathname.startsWith(to)
  )?.[1] || 'Intelligence Overview';

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0f1629] text-[#e8edf5]">
      {/* Top Sidebar Branding Container */}
      <div className="sidebar-brand-container h-20 shrink-0 flex items-center px-4 border-b border-[#1e2d4f] bg-[#0c1322] relative overflow-hidden">
        {/* Subtle cyan ambient glow behind shield */}
        <div className="sidebar-brand-glow absolute -left-6 -top-6 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <BrandLogo
          size="md"
          linkTo="/dashboard"
          showDivider={true}
          badge="v1.0.0"
          className="w-full"
        />
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-5">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="text-[11px] font-rajdhani font-bold uppercase tracking-widest text-[#4a6180] px-2 mb-1.5 flex items-center justify-between">
              <span>{group.title}</span>
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.to, item.exact);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={clsx(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-outfit tracking-wide transition-all group relative',
                      active
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-semibold'
                        : 'text-[#8fa3bf] hover:text-[#e8edf5] hover:bg-white/5 font-medium'
                    )}
                  >
                    <span className={clsx(
                      'shrink-0 transition-colors',
                      active ? 'text-cyan-400' : 'text-[#4a6180] group-hover:text-cyan-400'
                    )}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>

                    {item.badge && (
                      <span className="ml-auto text-[10px] font-rajdhani font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#1e2d4f] text-[#8fa3bf] border border-[#253556]">
                        {item.badge}
                      </span>
                    )}

                    {active && !item.badge && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-auto shadow-[0_0_6px_#00d4ff]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Account & Security Navigation Row */}
      <div className="p-3 border-t border-[#1e2d4f] bg-[#0c1322]/80">
        <Link
          to="/dashboard/profile"
          onClick={() => setSidebarOpen(false)}
          className={clsx(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-outfit tracking-wide transition-all group relative',
            isActive('/dashboard/profile')
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-semibold'
              : 'text-[#8fa3bf] hover:text-[#e8edf5] hover:bg-white/5 font-medium'
          )}
        >
          <span className={clsx(
            'shrink-0 transition-colors',
            isActive('/dashboard/profile') ? 'text-cyan-400' : 'text-[#4a6180] group-hover:text-cyan-400'
          )}>
            <ShieldCheck className="w-4 h-4" />
          </span>
          <span className="truncate font-rajdhani uppercase font-bold tracking-wider">Account & Security</span>
          {isActive('/dashboard/profile') ? (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-auto shadow-[0_0_6px_#00d4ff]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-[#4a6180] group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5" />
          )}
        </Link>
      </div>

      {/* User Info / Identity Footer */}
      <div className="p-3 border-t border-[#1e2d4f] bg-[#0a0f1a]/80">
        <Link
          to="/dashboard/profile"
          className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 transition-colors group"
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-cyan-500/30 group-hover:ring-cyan-400 transition-all"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-cyan-500/20 group-hover:ring-cyan-400 transition-all font-sora">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-outfit font-semibold text-[#e8edf5] truncate group-hover:text-cyan-300 transition-colors">
              {user?.full_name || 'Enclave Operator'}
            </p>
            <p className="text-[10px] font-rajdhani font-bold uppercase tracking-wider text-[#8fa3bf] truncate">
              {user?.role === 'admin' ? 'ADMIN' : 'SECURITY ANALYST'}
            </p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#4a6180] group-hover:text-cyan-400 transition-colors shrink-0" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0a0f1a] overflow-hidden text-[#e8edf5]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-[#0f1629] border-r border-[#1e2d4f] shrink-0 z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-fade-in">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 bg-[#0f1629] border-r border-[#1e2d4f] flex flex-col z-10 shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-[#0f1629] border-b border-[#1e2d4f] flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
          {/* Mobile menu trigger */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-[#8fa3bf] hover:text-[#e8edf5] p-1.5 rounded-lg border border-[#1e2d4f]"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle Navigation Menu"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Breadcrumb Navigation */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#8fa3bf]">
              <span className="flex items-center gap-1.5 text-cyan-400 font-sora font-semibold tracking-wide">
                <ShieldCheck className="w-3.5 h-3.5" />
                SOR SENTINEL
              </span>
              <ChevronRight className="w-3 h-3 text-[#4a6180]" />
              <span className="text-[#e8edf5] font-outfit font-medium">
                {currentBreadcrumb}
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Quick URL / Text scan shortcut on larger screens */}
            <Link
              to="/dashboard/analyze/url"
              className="topbar-investigate-btn hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-outfit font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 rounded-lg border border-cyan-500/30 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Investigate URL</span>
            </Link>

            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* Header Logout Button */}
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              title="Log out of SOR SENTINEL"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-outfit font-medium text-[#8fa3bf] hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-[#1e2d4f] hover:border-red-500/30 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Outlet Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="modal-surface bg-[#131d35] border border-[#1e2d4f] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-[#e8edf5] text-base">Sign Out Confirmation</h3>
                <p className="text-xs text-[#8fa3bf]">Session & Security Termination</p>
              </div>
            </div>

            <p className="text-sm text-[#e8edf5] leading-relaxed">
              Are you sure you want to log out? Your cryptographic session tokens will be revoked.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmLogout}
              >
                Confirm Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Login Security Assessment & Optional Password Update */}
      <PostLoginPasswordPrompt />
    </div>
  );
}
