// SOR SENTINEL — Services Page
import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import {
  FileText, Globe, AlertTriangle, Shield, Brain, History,
  CheckCircle, ArrowRight, Clock, Lock, Zap, BarChart2, Bot
} from 'lucide-react';

const services = [
  {
    icon: FileText,
    color: 'cyan',
    title: 'Text Credibility Analysis',
    subtitle: 'Assess raw text for credibility signals',
    description:
      'Submit any block of text — article excerpts, social media posts, email content, or document passages — for AI-assisted credibility assessment. The system analyses structural characteristics, claim patterns, emotional language indicators, and internal consistency.',
    capabilities: [
      'Credibility concern identification',
      'Emotional language detection',
      'Internal consistency checks',
      'Claim structure analysis',
      'Uncertainty and hedge-word detection',
    ],
    limitations: [
      'Cannot verify facts against external databases',
      'Does not access real-time information',
      'Results are AI interpretations, not ground truth',
    ],
    cta: '/dashboard/analyze/text',
    ctaLabel: 'Analyze Text',
  },
  {
    icon: Globe,
    color: 'violet',
    title: 'URL & Website Content Analysis',
    subtitle: 'Fetch and assess publicly accessible web content',
    description:
      'Provide a publicly accessible URL and the system will safely retrieve the page content, extract the main textual body, and perform the same credibility and sensitivity assessment as text analysis. Private, local, and intranet URLs are blocked for security.',
    capabilities: [
      'Safe SSRF-protected content retrieval',
      'Main content extraction via BeautifulSoup',
      'Full credibility and sensitivity assessment',
      'Source domain noted in results',
      'Metadata extraction where available',
    ],
    limitations: [
      'JavaScript-rendered pages may not extract correctly',
      'Paywalled or login-protected content is inaccessible',
      'Private networks and localhost URLs are blocked',
      'Large pages may be truncated before analysis',
    ],
    cta: '/dashboard/analyze/url',
    ctaLabel: 'Analyze URL',
  },
  {
    icon: AlertTriangle,
    color: 'warning',
    title: 'Misleading Content Indicators',
    subtitle: 'Surface patterns that may mislead readers',
    description:
      'The AI scans submitted content for linguistic and structural patterns commonly associated with misleading information — including unsupported superlatives, missing attribution, logical fallacies, clickbait structures, and contradictory claims.',
    capabilities: [
      'Unsupported superlative and absolute claim detection',
      'Missing attribution identification',
      'Logical inconsistency flagging',
      'Sensationalist language markers',
      'Context gap identification',
    ],
    limitations: [
      'Pattern detection does not confirm content is false',
      'Legitimate persuasive content may trigger indicators',
      'Effectiveness varies by language and domain',
    ],
    cta: '/dashboard/analyze/text',
    ctaLabel: 'Check for Indicators',
  },
  {
    icon: Shield,
    color: 'error',
    title: 'Sensitive Content Assessment',
    subtitle: 'Classify content sensitivity for responsible handling',
    description:
      'Content is classified across multiple sensitivity dimensions including personal data indicators, financial claims, health and medical references, legal content, and other categories requiring careful handling or verification before sharing.',
    capabilities: [
      'Personal data indicator detection',
      'Financial claim classification',
      'Health and medical content flagging',
      'Legal content identification',
      'Overall sensitivity level scoring (LOW / MEDIUM / HIGH / CRITICAL)',
    ],
    limitations: [
      'Classification is probabilistic, not definitive',
      'Does not perform regulatory compliance checks',
      'Does not access external legal or medical databases',
    ],
    cta: '/dashboard/analyze/text',
    ctaLabel: 'Assess Sensitivity',
  },
  {
    icon: Brain,
    color: 'cyan',
    title: 'AI-Generated Explanations',
    subtitle: 'Understand why findings were flagged',
    description:
      'Every analysis result includes structured, plain-English explanations for each finding. The system clearly distinguishes between observations extracted from the input, AI-generated interpretations, and areas where evidence is insufficient to draw conclusions.',
    capabilities: [
      'Plain-English finding explanations',
      'Observation vs interpretation distinction',
      'Confidence level indicators',
      'Uncertainty disclosure',
      'Contextual reasoning notes',
    ],
    limitations: [
      'Explanations are AI-generated and may contain errors',
      'Confidence levels are estimates, not calibrated probabilities',
      'Complex domain-specific content may produce less accurate explanations',
    ],
    cta: '/dashboard/analyze/text',
    ctaLabel: 'Try an Analysis',
  },
  {
    icon: History,
    color: 'violet',
    title: 'Analysis History & Reports',
    subtitle: 'Review, revisit, and track your analyses',
    description:
      'All analyses performed under your account are saved with full results, timestamps, and metadata. You can revisit any previous analysis, compare results across submissions, and view your personal activity dashboard with usage statistics.',
    capabilities: [
      'Full analysis history with search and filter',
      'Detailed result re-view for any past analysis',
      'Personal dashboard with activity charts',
      'Analysis type and status filtering',
      'Pagination for large history sets',
    ],
    limitations: [
      'History is per-account and not publicly visible',
      'Analyses are not automatically re-run on stored results',
      'Dashboard statistics reflect stored data only',
    ],
    cta: '/dashboard/history',
    ctaLabel: 'View History',
  },
  {
    icon: Lock,
    color: 'cyan',
    title: 'DigiKeeper Document Vault',
    subtitle: 'Envelope-encrypted zero-knowledge file storage',
    description:
      'Store sensitive credentials, identity files, and investigation evidence in a military-grade encrypted vault. Each document is sealed with a unique AES-256-GCM data encryption key, protected by a master user key and verified with SHA-256 cryptographic integrity hashes.',
    capabilities: [
      'AES-256-GCM envelope encryption per document',
      'Client-side download decryption stream',
      'Cryptographic SHA-256 tamper verification',
      'Categorized intelligence tagging',
      'Audit-logged permanent shredding',
    ],
    limitations: [
      'Files exceeding 25MB require chunked handling',
      'Key loss without account access prevents recovery',
      'Encrypted content cannot be indexed by search engines',
    ],
    cta: '/dashboard/vault',
    ctaLabel: 'Access Vault',
  },
  {
    icon: Bot,
    color: 'violet',
    title: 'Cubbis AI Cyber Assistant',
    subtitle: 'Conversational threat education and incident triage',
    description:
      'Interactive AI cybersecurity assistant powered by Google Gemini. Provides real-time guidance on suspicious messages, phishing lures, compromised accounts, and cyber hygiene in both English and Hindi.',
    capabilities: [
      'Dual-language support (English and Hindi)',
      'Suspicious SMS and phishing link triage',
      'Emergency account compromise playbooks',
      'Safe Markdown rendering and code inspection',
      'Persistent multi-turn conversation memory',
    ],
    limitations: [
      'Educational triage only; does not replace law enforcement',
      'Cannot execute active countermeasures on victim devices',
      'Responses reflect AI guidance and should be verified',
    ],
    cta: '/dashboard/cubbis',
    ctaLabel: 'Launch Cubbis',
  },
];

const colorMap: Record<string, { icon: string; badge: string; border: string }> = {
  cyan: {
    icon: 'text-cyan-400',
    badge: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    border: 'border-cyan-500/30',
  },
  violet: {
    icon: 'text-violet-400',
    badge: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    border: 'border-violet-500/30',
  },
  warning: {
    icon: 'text-yellow-400',
    badge: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    border: 'border-yellow-500/30',
  },
  error: {
    icon: 'text-red-400',
    badge: 'bg-red-500/10 text-red-400 border border-red-500/20',
    border: 'border-red-500/30',
  },
};

export default function ServicesPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-20 px-4 overflow-hidden bg-[#0a0f1a]">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-900/10 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" /> Platform Capabilities
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            What SOR SENTINEL{' '}
            <span className="text-cyan-400">Can Do</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A suite of AI-assisted analysis tools designed to help you critically assess information
            sources. Every capability is clearly scoped with known limitations.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 px-4 bg-[#0a0f1a]">
        <div className="max-w-6xl mx-auto space-y-12">
          {services.map((service, idx) => {
            const Icon = service.icon;
            const colors = colorMap[service.color];
            const isEven = idx % 2 === 0;
            return (
              <div
                key={service.title}
                className={`grid md:grid-cols-2 gap-8 items-start p-8 rounded-2xl bg-[#131d35] border ${colors.border} transition-shadow hover:shadow-lg`}
              >
                {/* Info side */}
                <div className={isEven ? '' : 'md:order-2'}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-xl bg-[#0f1629] ${colors.icon}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{service.title}</h2>
                      <p className={`text-sm font-medium ${colors.icon}`}>{service.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-slate-400 leading-relaxed mb-6">{service.description}</p>
                  <Link
                    to={service.cta}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                      service.color === 'cyan'
                        ? 'bg-cyan-500 text-[#0a0f1a] hover:bg-cyan-400'
                        : service.color === 'violet'
                        ? 'bg-violet-600 text-white hover:bg-violet-500'
                        : service.color === 'warning'
                        ? 'bg-yellow-500 text-[#0a0f1a] hover:bg-yellow-400'
                        : 'bg-red-600 text-white hover:bg-red-500'
                    }`}
                  >
                    {service.ctaLabel} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Capabilities + Limitations side */}
                <div className={isEven ? '' : 'md:order-1'}>
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" /> Capabilities
                    </h3>
                    <ul className="space-y-2">
                      {service.capabilities.map((cap) => (
                        <li key={cap} className="flex items-start gap-2 text-sm text-slate-400">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                          {cap}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" /> Known Limitations
                    </h3>
                    <ul className="space-y-2">
                      {service.limitations.map((lim) => (
                        <li key={lim} className="flex items-start gap-2 text-sm text-slate-400">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                          {lim}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Principles banner */}
      <section className="py-16 px-4 bg-[#0f1629]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">
            Guiding Principles
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Lock, title: 'Privacy-First', desc: 'Your submissions are tied only to your account. No content is shared with third parties beyond the configured AI provider.' },
              { icon: BarChart2, title: 'Transparent Results', desc: 'Every finding distinguishes between observations, AI interpretations, and areas of insufficient evidence.' },
              { icon: Clock, title: 'Not Authoritative', desc: 'SOR SENTINEL is a decision-support tool. Always verify critical information through authoritative primary sources.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-xl bg-[#131d35] border border-[#1e2d4f] text-center">
                <div className="inline-flex p-3 rounded-xl bg-cyan-500/10 mb-4">
                  <Icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0a0f1a] text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Ready to Analyse a Source?</h2>
        <p className="text-slate-400 mb-8">Create a free account to access all analysis capabilities.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/signup" className="px-7 py-3 bg-cyan-500 text-[#0a0f1a] font-bold rounded-lg hover:bg-cyan-400 transition-colors">
            Get Started Free
          </Link>
          <Link to="/how-it-works" className="px-7 py-3 border border-[#1e2d4f] text-slate-300 font-semibold rounded-lg hover:border-cyan-500 hover:text-cyan-400 transition-colors">
            How It Works
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
