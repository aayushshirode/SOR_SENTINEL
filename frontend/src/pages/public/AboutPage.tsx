// SOR SENTINEL — About Us Page
import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Shield, Target, BookOpen, AlertTriangle, Heart, Code } from 'lucide-react';

const objectives = [
  'Provide accessible, AI-assisted source credibility assessment for text and web content',
  'Help users identify linguistic and structural patterns associated with misleading information',
  'Classify content sensitivity across personal, financial, health, and legal dimensions',
  'Deliver transparent, explainable AI findings that clearly distinguish facts from interpretations',
  'Maintain a persistent analysis history to support ongoing research and critical thinking workflows',
  'Demonstrate responsible AI integration with clear limitations disclosure',
];

const technologies = [
  { name: 'React 18 + TypeScript', role: 'Frontend SPA', color: 'cyan' },
  { name: 'Vite 6', role: 'Build Tooling', color: 'violet' },
  { name: 'Python 3.12 + FastAPI', role: 'Backend API', color: 'cyan' },
  { name: 'SQLAlchemy ORM', role: 'Database Layer', color: 'violet' },
  { name: 'Oracle Database', role: 'Primary Database', color: 'cyan' },
  { name: 'python-oracledb', role: 'Oracle Driver', color: 'violet' },
  { name: 'OpenRouter API', role: 'AI Integration', color: 'cyan' },
  { name: 'JWT + bcrypt', role: 'Authentication', color: 'violet' },
];

const principles = [
  {
    icon: AlertTriangle,
    title: 'Honest About Limitations',
    desc: 'SOR SENTINEL does not claim to detect truth or falsehood. It surfaces patterns and AI interpretations, clearly disclosed as such. Every finding states what it is and what it cannot conclude.',
  },
  {
    icon: Shield,
    title: 'Security-First Design',
    desc: 'SSRF protection, bcrypt password hashing, JWT authentication, role-based access control, input validation, and rate limiting are built into the architecture — not added as afterthoughts.',
  },
  {
    icon: Heart,
    title: 'No Fabricated Data',
    desc: 'No fake user counts, testimonials, company endorsements, or statistical claims appear anywhere in this application. All metrics shown reflect real recorded data only.',
  },
  {
    icon: Code,
    title: 'Professional Engineering Standards',
    desc: 'The codebase follows industry conventions: typed interfaces, separation of concerns, repository pattern, dependency injection, structured logging, and a comprehensive automated test suite.',
  },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-20 px-4 bg-[#0a0f1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 via-transparent to-cyan-900/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-6">
            <Shield className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            About{' '}
            <span className="text-cyan-400">SOR SENTINEL</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            An AI-Powered Source Credibility and Sensitivity Checker built as a
            diploma-level industrial project, demonstrating full-stack software engineering
            with responsible AI integration.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4 bg-[#0f1629]">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-cyan-400" />
              <h2 className="text-2xl font-bold text-white">Mission</h2>
            </div>
            <p className="text-slate-400 leading-relaxed mb-4">
              In an era of information overload, SOR SENTINEL exists to support critical thinking —
              not to replace it. The platform provides structured, AI-assisted analysis of text and
              web content to help users ask better questions about the sources they consume.
            </p>
            <p className="text-slate-400 leading-relaxed">
              The system is designed to be a <strong className="text-white">decision-support tool</strong>,
              not an authority. It surfaces signals, patterns, and considerations. The final judgment
              always rests with the human user.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-6 h-6 text-violet-400" />
              <h2 className="text-2xl font-bold text-white">Project Scope</h2>
            </div>
            <p className="text-slate-400 leading-relaxed mb-4">
              SOR SENTINEL is a diploma-level industrial project demonstrating the end-to-end
              implementation of a secure, database-driven, AI-integrated web application built
              using industry-standard engineering practices.
            </p>
            <p className="text-slate-400 leading-relaxed">
              The project scope includes a public-facing website, authenticated user dashboard,
              AI analysis engine with Oracle database persistence, administrative management
              panel, and comprehensive documentation and test suite.
            </p>
          </div>
        </div>
      </section>

      {/* Objectives */}
      <section className="py-16 px-4 bg-[#0a0f1a]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Project Objectives</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {objectives.map((obj, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-[#131d35] border border-[#1e2d4f]">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <p className="text-sm text-slate-400 leading-relaxed">{obj}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-16 px-4 bg-[#0f1629]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Technology Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {technologies.map(({ name, role, color }) => (
              <div
                key={name}
                className={`p-4 rounded-xl bg-[#131d35] border text-center ${
                  color === 'cyan' ? 'border-cyan-500/20' : 'border-violet-500/20'
                }`}
              >
                <p className={`font-semibold text-sm mb-1 ${color === 'cyan' ? 'text-cyan-400' : 'text-violet-400'}`}>
                  {name}
                </p>
                <p className="text-xs text-slate-500">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Design Principles */}
      <section className="py-16 px-4 bg-[#0a0f1a]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Design Principles</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {principles.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-xl bg-[#131d35] border border-[#1e2d4f]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="font-bold text-white">{title}</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-16 px-4 bg-[#0f1629]">
        <div className="max-w-3xl mx-auto">
          <div className="p-6 rounded-2xl bg-yellow-900/10 border border-yellow-500/20">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <h3 className="font-bold text-yellow-400">Academic & Demonstration Context</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              SOR SENTINEL is an academic and industrial demonstration project. It is not a
              production-grade misinformation detection service. All AI findings are generated
              by a language model and are subject to the limitations of that model. No warranties
              are made regarding accuracy, completeness, or fitness for any particular purpose.
              The system should not be used as the sole basis for consequential decisions.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0a0f1a] text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Explore the Project</h2>
        <div className="flex flex-wrap justify-center gap-4 mt-6">
          <Link to="/how-it-works" className="px-7 py-3 bg-cyan-500 text-[#0a0f1a] font-bold rounded-lg hover:bg-cyan-400 transition-colors">
            How It Works
          </Link>
          <Link to="/services" className="px-7 py-3 border border-[#1e2d4f] text-slate-300 font-semibold rounded-lg hover:border-cyan-500 hover:text-cyan-400 transition-colors">
            View Services
          </Link>
          <Link to="/contact" className="px-7 py-3 border border-[#1e2d4f] text-slate-300 font-semibold rounded-lg hover:border-violet-500 hover:text-violet-400 transition-colors">
            Contact
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
