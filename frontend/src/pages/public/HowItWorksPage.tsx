// SOR SENTINEL — How It Works Page
import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import {
  LogIn, Send, Server, Bot, Database, Eye,
  Shield, Globe, FileText, CheckCircle, ArrowDown, Zap
} from 'lucide-react';

const steps = [
  {
    step: '01',
    icon: LogIn,
    title: 'Create an Account & Sign In',
    description:
      'Register with your email address and a secure password. Your account stores your analysis history and settings. All passwords are hashed with bcrypt — plaintext credentials are never stored.',
    color: 'cyan',
  },
  {
    step: '02',
    icon: Send,
    title: 'Submit Text or a URL',
    description:
      'Navigate to the Text Analysis or URL Analysis page. Paste your text content directly, or supply a publicly accessible URL. The system validates the input format before processing.',
    color: 'violet',
  },
  {
    step: '03',
    icon: Server,
    title: 'Backend Validation & Security Checks',
    description:
      'The FastAPI backend validates the request using Pydantic schemas. For URLs, the system performs SSRF protection checks — blocking private IP ranges, localhost, metadata endpoints, and non-HTTP schemes — before any network request is made.',
    color: 'cyan',
  },
  {
    step: '04',
    icon: Globe,
    title: 'Content Retrieval (URL Analysis Only)',
    description:
      'For URL submissions, the backend safely fetches the public page using a restricted HTTP client. BeautifulSoup extracts the main textual content. JavaScript-rendered pages and paywalled content are not supported.',
    color: 'violet',
  },
  {
    step: '05',
    icon: Bot,
    title: 'AI Analysis via OpenRouter',
    description:
      'The extracted text is passed to the configured AI model via OpenRouter. A structured prompt instructs the model to return JSON-formatted findings covering credibility concerns, misleading indicators, sensitive content, recommendations, and evidence limitations. The AI API key is never exposed to the browser.',
    color: 'cyan',
  },
  {
    step: '06',
    icon: Database,
    title: 'Results Saved to Oracle Database',
    description:
      'The validated AI response and all findings are persisted to Oracle Database via SQLAlchemy ORM models. Analysis records, individual findings, and source references are stored in separate normalised tables linked to your user account.',
    color: 'violet',
  },
  {
    step: '07',
    icon: Eye,
    title: 'Results Displayed in Your Dashboard',
    description:
      'The structured results are returned to the React frontend and displayed in the Analysis Result Panel. Findings are grouped by type, each with its severity, explanation, and confidence level. The overall credibility score and sensitivity level are prominently displayed.',
    color: 'cyan',
  },
];

const architecture = [
  {
    layer: 'Frontend',
    tech: 'React 18 + TypeScript + Vite',
    description: 'Single-page application with React Router v6, JWT token management in sessionStorage, and Recharts for activity visualisation.',
    icon: FileText,
  },
  {
    layer: 'Backend API',
    tech: 'Python + FastAPI + Pydantic',
    description: 'RESTful API with dependency injection, JWT authentication, role-based access control, rate limiting via SlowAPI, and structured logging with structlog.',
    icon: Server,
  },
  {
    layer: 'AI Integration',
    tech: 'OpenRouter AI + Google Gemini AI',
    description: 'Multi-engine cyber intelligence orchestration. Text/URL credibility via OpenRouter and interactive cyber triage via Gemini. All API keys remain isolated in backend environment variables.',
    icon: Bot,
  },
  {
    layer: 'Database',
    tech: 'Oracle Database + SQLAlchemy ORM',
    description: 'Normalised relational schema including USERS, ANALYSES, FINDINGS, DOCUMENTS, ENCRYPTION KEYS, CUBBIS CONVERSATIONS, and AUDIT LOGS. python-oracledb driver with connection pooling.',
    icon: Database,
  },
  {
    layer: 'Security',
    tech: 'bcrypt + JWT + SSRF Protection',
    description: 'Passwords hashed with bcrypt. JWT tokens with expiry and issuer validation. SSRF protection on URL fetcher. CORS restricted to configured origins. Input validation on all endpoints.',
    icon: Shield,
  },
];

const colorMap = {
  cyan: { badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', icon: 'text-cyan-400', step: 'text-cyan-400 border-cyan-500/30' },
  violet: { badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: 'text-violet-400', step: 'text-violet-400 border-violet-500/30' },
};

export default function HowItWorksPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-20 px-4 bg-[#0a0f1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/10 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" /> System Architecture
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            How SOR SENTINEL{' '}
            <span className="text-cyan-400">Works</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A transparent walkthrough of the full request lifecycle — from user submission to
            structured AI analysis results — including the security controls applied at each stage.
          </p>
        </div>
      </section>

      {/* Step-by-step */}
      <section className="py-16 px-4 bg-[#0a0f1a]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-12">
            Request Lifecycle — Step by Step
          </h2>
          <div className="space-y-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const colors = colorMap[step.color as keyof typeof colorMap];
              return (
                <div key={step.step}>
                  <div className="flex gap-5 p-6 rounded-2xl bg-[#131d35] border border-[#1e2d4f] hover:border-cyan-500/30 transition-colors">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-xl bg-[#0f1629] border ${colors.step} flex items-center justify-center`}>
                        <span className={`text-xs font-bold ${colors.icon}`}>{step.step}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className={`w-5 h-5 ${colors.icon}`} />
                        <h3 className="font-bold text-white">{step.title}</h3>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowDown className="w-5 h-5 text-slate-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Architecture layers */}
      <section className="py-16 px-4 bg-[#0f1629]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">
            Technology Architecture
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {architecture.map(({ layer, tech, description, icon: Icon }) => (
              <div key={layer} className="p-6 rounded-xl bg-[#131d35] border border-[#1e2d4f]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{layer}</p>
                    <p className="text-sm font-bold text-white">{tech}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What it cannot do */}
      <section className="py-16 px-4 bg-[#0a0f1a]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            What SOR SENTINEL Cannot Do
          </h2>
          <div className="p-6 rounded-2xl bg-red-900/10 border border-red-500/20">
            <ul className="space-y-3">
              {[
                'Verify factual claims against real-world databases or live sources',
                'Access real-time news feeds, social media APIs, or search engines',
                'Definitively classify content as true or false',
                'Perform regulatory compliance or legal analysis',
                'Process JavaScript-rendered or login-protected pages',
                'Guarantee AI model accuracy or eliminate hallucination',
                'Access private, corporate, or government networks',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-400">
                  <span className="mt-1 w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-center text-slate-500 text-sm mt-6">
            Always cross-reference important findings with authoritative primary sources.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0f1629] text-center">
        <CheckCircle className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Understand It. Use It Responsibly.</h2>
        <p className="text-slate-400 mb-8">Sign up and start your first analysis in under a minute.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/signup" className="px-7 py-3 bg-cyan-500 text-[#0a0f1a] font-bold rounded-lg hover:bg-cyan-400 transition-colors">
            Create Account
          </Link>
          <Link to="/services" className="px-7 py-3 border border-[#1e2d4f] text-slate-300 font-semibold rounded-lg hover:border-cyan-500 hover:text-cyan-400 transition-colors">
            View Services
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
