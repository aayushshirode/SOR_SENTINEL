// SOR SENTINEL — Contact Page with Official Founder Details & Interactive Form
import React, { useState } from 'react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { contactApi } from '../../services/api';
import {
  Mail, MessageSquare, User, Send, CheckCircle, AlertCircle,
  Phone, Shield, Briefcase
} from 'lucide-react';

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      await contactApi.submit({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || 'General Enquiry',
        message: form.message.trim(),
      });
      setStatus('success');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: unknown) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      setErrorMsg(msg);
    }
  }

  const subjects = [
    'General Enquiry',
    'Technical Support',
    'Feature Request',
    'Bug Report',
    'Project / Academic Enquiry',
    'Other',
  ];

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative py-16 px-4 bg-[#0a0f1a] overflow-hidden border-b border-[#1e2d4f]">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/10 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-5">
            <Mail className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
            Get in <span className="text-cyan-400">Touch</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
            Have a question about SOR SENTINEL, need security assistance, or wish to connect with executive leadership? We are here to help.
          </p>
        </div>
      </section>

      {/* Main Content: Official Contact Details & Form */}
      <section className="py-14 px-4 bg-[#0f1629]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Column 1: Official Contact Details Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#131d35] border border-[#1e2d4f] rounded-2xl p-6 md:p-8 shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-[#e8edf5] tracking-wide">
                  Official Contact Details
                </h2>
              </div>

              {/* Leadership / Founder Profile */}
              <div className="p-4 rounded-xl bg-[#0f1629] border border-[#1e2d4f] mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide">
                      Aayush Shirode
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold">
                      <Briefcase className="w-3.5 h-3.5" />
                      Founder & CEO
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Direct lead for SOR SENTINEL architecture, security intelligence algorithms, and research development.
                </p>
              </div>

              {/* Contact Channels */}
              <div className="space-y-4">
                {/* Phone */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#0f1629]/60 border border-[#1e2d4f]/80 hover:border-cyan-500/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-[#8fa3bf] uppercase tracking-wider block">
                      Contact No
                    </span>
                    <a
                      href="tel:+917821894135"
                      className="text-sm md:text-base font-bold text-white hover:text-cyan-400 transition-colors inline-block mt-0.5"
                    >
                      +91 78218 94135
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#0f1629]/60 border border-[#1e2d4f]/80 hover:border-cyan-500/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-[#8fa3bf] uppercase tracking-wider block">
                      Email
                    </span>
                    <a
                      href="mailto:aayushshirode2007@gmail.com"
                      className="text-sm md:text-base font-bold text-white hover:text-cyan-400 transition-colors break-all inline-block mt-0.5"
                    >
                      aayushshirode2007@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Advisory note */}
              <div className="mt-6 pt-5 border-t border-[#1e2d4f] text-xs text-[#8fa3bf] leading-relaxed">
                Response times for direct inquiries typically range within 24 to 48 business hours. For immediate analysis, utilize the self-service web portal.
              </div>
            </div>
          </div>

          {/* Column 2: Interactive Contact Form Card */}
          <div className="lg:col-span-7">
            <div className="bg-[#131d35] border border-[#1e2d4f] rounded-2xl p-6 md:p-8 shadow-xl">
              <h2 className="text-lg font-bold text-[#e8edf5] mb-1 tracking-wide">
                Send an Online Inquiry
              </h2>
              <p className="text-xs text-[#8fa3bf] mb-6">
                Fill in the form below and our team will get back to you directly.
              </p>

              {status === 'success' ? (
                <div className="p-8 rounded-xl bg-green-900/10 border border-green-500/20 text-center animate-fade-in">
                  <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-1.5">Message Sent Successfully</h3>
                  <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                    Your message has been received by our security team. We will reply to your registered email shortly.
                  </p>
                  <button
                    onClick={() => setStatus('idle')}
                    className="px-5 py-2.5 bg-cyan-500 text-[#0a0f1a] font-bold text-sm rounded-lg hover:bg-cyan-400 transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {status === 'error' && errorMsg && (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-900/15 border border-red-500/30 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        disabled={status === 'loading'}
                        placeholder="Your full name"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#0a0f1a] border border-[#1e2d4f] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors text-sm disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        disabled={status === 'loading'}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#0a0f1a] border border-[#1e2d4f] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors text-sm disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Subject
                    </label>
                    <select
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      disabled={status === 'loading'}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#0a0f1a] border border-[#1e2d4f] text-white focus:outline-none focus:border-cyan-500 transition-colors text-sm disabled:opacity-50"
                    >
                      <option value="">Select an inquiry subject…</option>
                      {subjects.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      disabled={status === 'loading'}
                      rows={5}
                      placeholder="Please provide details regarding your inquiry or technical question…"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#0a0f1a] border border-[#1e2d4f] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors text-sm resize-none disabled:opacity-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 text-[#0a0f1a] font-bold rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20"
                  >
                    {status === 'loading' ? (
                      <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {status === 'loading' ? 'Submitting Message…' : 'Send Message'}
                  </button>

                  <p className="text-[11px] text-slate-500 text-center pt-1">
                    Your details are securely transmitted under our{' '}
                    <a href="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</a>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
