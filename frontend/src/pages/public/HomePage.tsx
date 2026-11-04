// SOR SENTINEL — Home Page
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Zap, Globe, FileText, CheckCircle,
  AlertTriangle, Lock, ChevronRight, ArrowRight,
  Search, Users, BookOpen, BarChart2
} from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/Button';

const features = [
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Text Credibility Analysis',
    description: 'Submit any text for AI-powered analysis of credibility indicators, logical consistency, and citation quality.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: 'URL & Website Analysis',
    description: 'Safely fetch and analyze publicly accessible web content for misleading patterns and sensitive material.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: <AlertTriangle className="w-6 h-6" />,
    title: 'Misleading Content Detection',
    description: 'Identify potential patterns such as false equivalencies, cherry-picked data, and sensationalized framing.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Sensitive Content Classification',
    description: 'Classify text by sensitivity level — detecting potential medical misinformation, hate speech, PII, and more.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: <BarChart2 className="w-6 h-6" />,
    title: 'Analysis History & Reports',
    description: 'Track your analysis history, review past results, and monitor your activity over time.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: <Lock className="w-6 h-6" />,
    title: 'Privacy-First & Secure',
    description: 'Your data is stored securely. API keys never leave the backend. Built with security best practices.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
];

const steps = [
  { num: '01', title: 'Submit Content', desc: 'Enter text or a public URL you want to analyze.' },
  { num: '02', title: 'AI Processing', desc: 'Our backend securely sends the content to OpenRouter AI for analysis.' },
  { num: '03', title: 'Validated Results', desc: 'The AI response is validated, structured, and saved to the database.' },
  { num: '04', title: 'Review & Act', desc: 'Review findings, explanations, and recommended verification steps.' },
];

const useCases = [
  { icon: <BookOpen className="w-5 h-5" />, title: 'Students', desc: 'Verify sources for academic papers and research.' },
  { icon: <Search className="w-5 h-5" />, title: 'Researchers', desc: 'Screen large volumes of text for credibility.' },
  { icon: <Globe className="w-5 h-5" />, title: 'Journalists', desc: 'Quick first-pass analysis of claims and sources.' },
  { icon: <Users className="w-5 h-5" />, title: 'Organizations', desc: 'Screen content before publication or distribution.' },
];

const faqs = [
  {
    q: 'Is SOR SENTINEL a fact-checking service?',
    a: 'No. SOR SENTINEL is an AI-assisted decision-support tool. It identifies potential credibility concerns and patterns — it does not definitively determine whether claims are true or false. Always verify through authoritative sources.',
  },
  {
    q: 'What kind of content can I analyze?',
    a: 'You can analyze any text (articles, paragraphs, excerpts) or submit HTTP/HTTPS URLs to publicly accessible web pages. Content behind paywalls, JavaScript-only pages, or requiring login cannot be analyzed.',
  },
  {
    q: 'How is my data stored?',
    a: 'Analysis results are stored in an Oracle database associated with your account. You can view, manage, and delete your analysis history at any time from your dashboard.',
  },
  {
    q: 'What AI model powers the analysis?',
    a: 'SOR SENTINEL uses the OpenRouter API, which provides access to various language models. The specific model is configured by the administrator. All AI calls are made from the backend only — your API key is never exposed.',
  },
];

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="container text-center relative">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-rajdhani font-bold tracking-wider uppercase px-4 py-2 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Source Intelligence
          </div>
          <h1 className="font-sora font-extrabold mb-5 max-w-4xl mx-auto tracking-tight">
            <span className="text-[#e8edf5]">Assess Sources.</span>{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Identify Risks.
            </span>{' '}
            <span className="text-[#e8edf5]">Stay Informed.</span>
          </h1>
          <p className="text-[#8fa3bf] text-lg max-w-2xl mx-auto mb-10 leading-relaxed font-plex">
            SOR SENTINEL uses advanced AI to analyze text and web content for credibility indicators,
            potentially misleading patterns, and sensitive material — helping you make more informed decisions.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <Link to="/signup">
              <Button size="lg" leftIcon={<Shield className="w-4 h-4" />}>
                Get Started Free
              </Button>
            </Link>
            <Link to="/how-it-works">
              <Button size="lg" variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
                How It Works
              </Button>
            </Link>
          </div>
          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#4a6180] font-rajdhani font-bold uppercase tracking-wider">
            {['Oracle Database', 'OpenRouter AI', 'JWT Auth', 'SSRF Protected'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-[#0f1629]">
        <div className="container">
          <div className="text-center mb-12">
            <span className="text-cyan-400 text-xs font-semibold tracking-widest uppercase">Capabilities</span>
            <h2 className="font-bold text-[#e8edf5] mt-2 mb-3">What SOR SENTINEL Analyzes</h2>
            <p className="text-[#8fa3bf] max-w-xl mx-auto">
              A comprehensive suite of AI-driven analysis tools to help you evaluate information quality.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="bg-[#131d35] border border-[#1e2d4f] rounded-xl p-6 hover:border-[#253556] transition-colors">
                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-[#e8edf5] text-base mb-2">{f.title}</h3>
                <p className="text-[#8fa3bf] text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <span className="text-violet-400 text-xs font-semibold tracking-widest uppercase">Process</span>
            <h2 className="font-bold text-[#e8edf5] mt-2 mb-3">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-cyan-400 font-bold text-sm">{step.num}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-[60%] w-[40%] h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
                )}
                <h3 className="font-semibold text-[#e8edf5] text-base mb-2">{step.title}</h3>
                <p className="text-[#8fa3bf] text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/how-it-works">
              <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Full Architecture Overview
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-[#0f1629]">
        <div className="container">
          <div className="text-center mb-12">
            <span className="text-cyan-400 text-xs font-semibold tracking-widest uppercase">Use Cases</span>
            <h2 className="font-bold text-[#e8edf5] mt-2 mb-3">Who Uses SOR SENTINEL</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {useCases.map((uc) => (
              <div key={uc.title} className="bg-[#131d35] border border-[#1e2d4f] rounded-xl p-5 text-center hover:border-cyan-500/30 transition-colors">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400 mx-auto mb-3">
                  {uc.icon}
                </div>
                <h3 className="font-semibold text-[#e8edf5] text-sm mb-1.5">{uc.title}</h3>
                <p className="text-[#8fa3bf] text-xs leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Responsible AI Notice */}
      <section className="py-16">
        <div className="container">
          <div className="bg-[#131d35] border border-yellow-500/20 rounded-2xl p-8 max-w-3xl mx-auto text-center">
            <AlertTriangle className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
            <h3 className="font-bold text-[#e8edf5] text-xl mb-3">Responsible AI Disclaimer</h3>
            <p className="text-[#8fa3bf] leading-relaxed">
              SOR SENTINEL is an <strong className="text-[#e8edf5]">AI-assisted decision-support tool</strong>,
              not an authoritative truth detector. Results reflect AI interpretations and should be verified
              through independent, authoritative sources before drawing conclusions. AI systems can make errors,
              exhibit biases, and lack real-time information.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-20 bg-[#0f1629]">
        <div className="container max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="font-bold text-[#e8edf5] mb-3">Frequently Asked Questions</h2>
          </div>
          <div className="flex flex-col gap-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="group bg-[#131d35] border border-[#1e2d4f] rounded-xl">
                <summary className="flex items-center justify-between p-5 cursor-pointer text-[#e8edf5] font-medium text-sm select-none list-none hover:text-cyan-400 transition-colors">
                  {faq.q}
                  <ChevronRight className="w-4 h-4 text-[#8fa3bf] group-open:rotate-90 transition-transform shrink-0 ml-3" />
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-[#8fa3bf] text-sm leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/faq" className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors flex items-center justify-center gap-1">
              View All FAQs <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container text-center">
          <div className="bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-cyan-500/10 border border-cyan-500/20 rounded-2xl p-12">
            <h2 className="font-bold text-[#e8edf5] mb-4">Ready to Analyze Your First Source?</h2>
            <p className="text-[#8fa3bf] mb-8 max-w-xl mx-auto">
              Create a free account and start analyzing sources in minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg">Create Free Account</Button>
              </Link>
              <Link to="/services">
                <Button size="lg" variant="outline">Explore Services</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
