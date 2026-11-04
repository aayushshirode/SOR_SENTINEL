// SOR SENTINEL — FAQ Page
import React, { useState } from 'react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle, MessageSquare } from 'lucide-react';

const faqs = [
  {
    category: 'About the System',
    items: [
      {
        q: 'What is SOR SENTINEL?',
        a: 'SOR SENTINEL is an AI-assisted web application that helps users assess source credibility, identify potentially misleading content patterns, and classify content sensitivity. It is a decision-support tool for students, researchers, journalists, and anyone who wants to think more critically about information sources.',
      },
      {
        q: 'Is SOR SENTINEL a fact-checker?',
        a: 'No. SOR SENTINEL does not verify claims against any fact database, news archive, or external knowledge source. It analyses linguistic and structural patterns in the submitted text using a language model. Results are AI interpretations, not verified facts.',
      },
      {
        q: 'Who built SOR SENTINEL?',
        a: 'SOR SENTINEL is a diploma-level industrial demonstration project. It is designed to showcase professional full-stack engineering with React, FastAPI, Oracle Database, and OpenRouter AI integration.',
      },
    ],
  },
  {
    category: 'Using the Platform',
    items: [
      {
        q: 'What can I submit for analysis?',
        a: 'You can submit plain text (article excerpts, social media posts, emails, document passages) or publicly accessible URLs. The system will retrieve and extract the text content from URLs before analysis.',
      },
      {
        q: 'What types of URLs are supported?',
        a: 'Only publicly accessible HTTP/HTTPS URLs are supported. JavaScript-rendered pages, paywalled content, login-protected pages, and private or corporate network URLs are not supported. For security, the system blocks requests to private IP ranges, localhost, and cloud metadata endpoints.',
      },
      {
        q: 'How long does an analysis take?',
        a: 'Most analyses complete within 5–30 seconds depending on the AI model response time and the length of the content being analysed.',
      },
      {
        q: 'Is my submission data private?',
        a: 'Your submissions are tied to your account only. Content is sent to the configured OpenRouter AI provider for processing. Review the Privacy Policy for full details on data handling.',
      },
    ],
  },
  {
    category: 'Understanding Results',
    items: [
      {
        q: 'What does the credibility score mean?',
        a: 'The credibility score (0–100) is an AI-generated estimate of how many credibility concern indicators were found in the content. A higher score indicates fewer detected concerns. It is not a definitive measure of truthfulness.',
      },
      {
        q: 'What are the sensitivity levels?',
        a: 'Content is classified as LOW, MEDIUM, HIGH, or CRITICAL based on the presence of personal data indicators, financial claims, health and medical references, legal content, and similar categories. Sensitivity does not imply the content is harmful — it signals it requires careful handling.',
      },
      {
        q: 'What is an "evidence limitation"?',
        a: 'Evidence limitations are explicit disclosures about what the system could not determine. For example: "The source of the statistics cited cannot be verified from the submitted text." These are important — they tell you where the analysis is incomplete.',
      },
      {
        q: 'Can the AI be wrong?',
        a: 'Yes. Language models can misinterpret content, produce hallucinations, and vary in accuracy by domain and language. Always treat SOR SENTINEL results as one input among many, not as an authoritative conclusion.',
      },
    ],
  },
  {
    category: 'Account & Technical',
    items: [
      {
        q: 'How is my password stored?',
        a: 'Passwords are hashed using bcrypt before storage. Plaintext passwords are never stored, logged, or transmitted after the initial submission.',
      },
      {
        q: 'What database does SOR SENTINEL use?',
        a: 'Oracle Database is the primary database. SQLAlchemy ORM manages all database interactions. The schema includes normalised tables for users, analyses, findings, source references, contact messages, and audit logs.',
      },
      {
        q: 'How is the AI API key protected?',
        a: 'The OpenRouter API key is stored in server-side environment variables and is never included in frontend code, browser responses, or API responses. All AI requests originate from the backend.',
      },
      {
        q: 'How do I report a bug?',
        a: 'Use the Contact form to submit a bug report. Please include a description of the issue, the steps to reproduce it, and the expected versus actual behaviour.',
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#1e2d4f] rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-[#131d35] hover:bg-[#1a2540] transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="font-medium text-white text-sm">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 py-4 bg-[#0f1629] border-t border-[#1e2d4f]">
          <p className="text-sm text-slate-400 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-20 px-4 bg-[#0a0f1a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-900/10 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-6">
            <HelpCircle className="w-10 h-10 text-violet-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Frequently Asked{' '}
            <span className="text-cyan-400">Questions</span>
          </h1>
          <p className="text-slate-400 leading-relaxed">
            Answers to common questions about SOR SENTINEL's capabilities, limitations, and how
            to use the platform effectively.
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-16 px-4 bg-[#0a0f1a]">
        <div className="max-w-3xl mx-auto space-y-12">
          {faqs.map(({ category, items }) => (
            <div key={category}>
              <h2 className="text-lg font-bold text-cyan-400 mb-4 uppercase tracking-wider">
                {category}
              </h2>
              <div className="space-y-3">
                {items.map(({ q, a }) => (
                  <FaqItem key={q} q={q} a={a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Still have questions */}
      <section className="py-16 px-4 bg-[#0f1629] text-center">
        <MessageSquare className="w-10 h-10 text-cyan-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Still have questions?</h2>
        <p className="text-slate-400 mb-6 text-sm">
          Use the contact form to reach us directly.
        </p>
        <Link
          to="/contact"
          className="px-7 py-3 bg-cyan-500 text-[#0a0f1a] font-bold rounded-lg hover:bg-cyan-400 transition-colors"
        >
          Contact Us
        </Link>
      </section>
    </PublicLayout>
  );
}
