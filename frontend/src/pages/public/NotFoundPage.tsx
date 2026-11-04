// SOR SENTINEL — 404 Not Found Page
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      <section className="min-h-[70vh] flex items-center justify-center px-4 bg-[#0a0f1a]">
        <div className="text-center max-w-lg">
          {/* 404 visual */}
          <div className="relative mb-8">
            <div className="text-[8rem] font-black text-[#131d35] select-none leading-none">404</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-4 rounded-2xl bg-[#0f1629] border border-[#1e2d4f]">
                <Search className="w-10 h-10 text-cyan-400" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Page Not Found
          </h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            The page you were looking for doesn't exist or may have been moved.
            Check the URL or navigate back to safety.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-6 py-3 border border-[#1e2d4f] text-slate-300 font-semibold rounded-lg hover:border-cyan-500 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
            <Link
              to="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 text-[#0a0f1a] font-bold rounded-lg hover:bg-cyan-400 transition-colors"
            >
              <Home className="w-4 h-4" /> Back to Home
            </Link>
          </div>

          {/* Quick links */}
          <div className="mt-12 pt-8 border-t border-[#1e2d4f]">
            <p className="text-sm text-slate-500 mb-4">Or jump to a section:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { to: '/services', label: 'Services' },
                { to: '/how-it-works', label: 'How It Works' },
                { to: '/faq', label: 'FAQ' },
                { to: '/signin', label: 'Sign In' },
                { to: '/signup', label: 'Sign Up' },
                { to: '/contact', label: 'Contact' },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[#131d35] border border-[#1e2d4f] text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
