// SOR SENTINEL — Public Site Layout (Navbar + Footer)
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { clsx } from 'clsx';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
  { to: '/faq', label: 'FAQ' },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <header
      className={clsx(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-[#0a0f1a]/95 backdrop-blur-md border-b border-[#1e2d4f]'
          : 'bg-transparent'
      )}
    >
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <BrandLogo size="md" />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={clsx(
                'px-3 py-2 text-sm font-outfit font-medium rounded-md transition-colors',
                location.pathname === link.to
                  ? 'text-cyan-400 font-semibold'
                  : 'text-[#8fa3bf] hover:text-[#e8edf5]'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeSwitcher />
          {isAuthenticated ? (
            <button
              onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}
              className="px-4 py-2 text-sm font-semibold bg-cyan-500 text-[#0a0f1a] rounded-lg hover:bg-cyan-400 transition-colors"
            >
              Dashboard
            </button>
          ) : (
            <>
              <Link
                to="/signin"
                className="px-4 py-2 text-sm text-[#8fa3bf] hover:text-[#e8edf5] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 text-sm font-semibold bg-cyan-500 text-[#0a0f1a] rounded-lg hover:bg-cyan-400 transition-colors flex items-center gap-1.5"
              >
                Get Started <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-[#8fa3bf] hover:text-[#e8edf5] p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0f1629] border-b border-[#1e2d4f] animate-fade-in">
          <div className="container py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={clsx(
                  'px-4 py-3 text-sm rounded-lg transition-colors',
                  location.pathname === link.to
                    ? 'bg-cyan-500/10 text-cyan-400'
                    : 'text-[#8fa3bf] hover:text-[#e8edf5] hover:bg-white/5'
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-[#1e2d4f] mt-2 pt-3 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link
                  to={user?.role === 'admin' ? '/admin' : '/dashboard'}
                  className="px-4 py-2.5 text-sm font-semibold bg-cyan-500 text-[#0a0f1a] rounded-lg text-center"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/signin"
                    className="px-4 py-2.5 text-sm text-[#8fa3bf] border border-[#1e2d4f] rounded-lg text-center hover:border-[#253556]"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2.5 text-sm font-semibold bg-cyan-500 text-[#0a0f1a] rounded-lg text-center"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="bg-[#0f1629] border-t border-[#1e2d4f]">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="mb-4">
              <BrandLogo size="md" />
            </div>
            <p className="text-[#8fa3bf] text-sm leading-relaxed">
              AI-powered source credibility and sensitivity analysis. An academic research project.
            </p>
          </div>
          <div>
            <h4 className="text-[#e8edf5] font-semibold text-sm mb-3">Product</h4>
            <div className="flex flex-col gap-2">
              {[
                { to: '/services', label: 'Services' },
                { to: '/how-it-works', label: 'How It Works' },
                { to: '/dashboard', label: 'Dashboard' },
              ].map((link) => (
                <Link key={link.to} to={link.to} className="text-[#8fa3bf] hover:text-cyan-400 text-sm transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[#e8edf5] font-semibold text-sm mb-3">Company</h4>
            <div className="flex flex-col gap-2">
              {[
                { to: '/about', label: 'About Us' },
                { to: '/contact', label: 'Contact' },
                { to: '/faq', label: 'FAQ' },
              ].map((link) => (
                <Link key={link.to} to={link.to} className="text-[#8fa3bf] hover:text-cyan-400 text-sm transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[#e8edf5] font-semibold text-sm mb-3">Legal</h4>
            <div className="flex flex-col gap-2">
              {[
                { to: '/privacy', label: 'Privacy Policy' },
                { to: '/terms', label: 'Terms of Service' },
              ].map((link) => (
                <Link key={link.to} to={link.to} className="text-[#8fa3bf] hover:text-cyan-400 text-sm transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-[#1e2d4f] mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[#8fa3bf] text-sm font-medium tracking-wide">
            © 2026 All Rights Reserved by SOR SENTINEL — By Aayush Shirode.
          </p>
          <p className="text-[#4a6180] text-xs">
            AI-assisted analysis for decision support only. Not an authoritative fact-checker.
          </p>
        </div>
      </div>
    </footer>
  );
}
