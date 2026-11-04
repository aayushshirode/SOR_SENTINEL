// SOR SENTINEL — Privacy Policy Page
import React from 'react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Shield } from 'lucide-react';

const sections = [
  {
    title: '1. Information We Collect',
    content: `When you create an account, we collect your email address, full name (optional), and a securely hashed password. We do not store your plaintext password.

When you use the analysis features, we store the content you submit (text or URL), the AI-generated analysis results, timestamps, and associated metadata. This data is linked to your account and stored in our Oracle Database.

When you submit a contact form, we store your name, email address, subject, and message.`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use your account information to authenticate you and personalise your experience. Analysis data is stored to provide you with a persistent history of your submissions and to power your dashboard.

Contact form submissions are used solely to respond to your enquiry. We do not use your contact information for marketing purposes.`,
  },
  {
    title: '3. AI Processing',
    content: `When you submit text or URL content for analysis, that content is sent to the OpenRouter API for processing by a configured AI language model. This transmission is made from our backend server — your browser does not communicate directly with the AI provider.

We recommend you do not submit personally identifiable information (PII), confidential business information, or sensitive personal data for analysis.`,
  },
  {
    title: '4. Data Security',
    content: `Passwords are hashed with bcrypt before storage. Session authentication uses JSON Web Tokens (JWT) with expiry. All API communication is intended to be served over HTTPS in production.

The OpenRouter API key and database credentials are stored in server-side environment variables and are never exposed to the browser or included in frontend code.`,
  },
  {
    title: '5. Data Retention',
    content: `Analysis records are retained for the lifetime of your account. You may request deletion of your account and associated data by contacting us. Contact form messages are retained until reviewed and resolved.`,
  },
  {
    title: '6. Third-Party Services',
    content: `SOR SENTINEL uses the OpenRouter API to process submitted content with AI language models. OpenRouter's own privacy policy governs how they handle data sent to their service. We recommend reviewing their documentation at openrouter.ai.

No other third-party analytics, advertising, or tracking services are integrated into this application.`,
  },
  {
    title: '7. Your Rights',
    content: `You have the right to access, correct, or request deletion of your personal data. Contact us using the form on the Contact page to make a data request.`,
  },
  {
    title: '8. Academic Context',
    content: `SOR SENTINEL is an academic and industrial demonstration project. Data handling practices described here represent the intended design. In a production deployment, additional legal review and compliance measures would be required depending on the applicable jurisdiction.`,
  },
  {
    title: '9. Changes to This Policy',
    content: `We may update this Privacy Policy as the project evolves. Changes will be reflected on this page with the effective date updated below.`,
  },
];

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <section className="py-20 px-4 bg-[#0a0f1a]">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-6">
              <Shield className="w-10 h-10 text-cyan-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Privacy Policy</h1>
            <p className="text-slate-400 text-sm">Effective date: November 2026</p>
          </div>

          {/* Intro */}
          <div className="p-5 rounded-xl bg-[#131d35] border border-[#1e2d4f] mb-8">
            <p className="text-slate-400 leading-relaxed text-sm">
              This Privacy Policy describes how SOR SENTINEL collects, uses, and protects information
              provided by users of this platform. By using SOR SENTINEL, you agree to the practices
              described here.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {sections.map(({ title, content }) => (
              <div key={title} className="p-6 rounded-xl bg-[#131d35] border border-[#1e2d4f]">
                <h2 className="font-bold text-white mb-3">{title}</h2>
                <div className="space-y-2">
                  {content.split('\n\n').map((para, i) => (
                    <p key={i} className="text-sm text-slate-400 leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact note */}
          <div className="mt-8 p-5 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <p className="text-sm text-slate-400">
              For privacy-related enquiries, use the{' '}
              <a href="/contact" className="text-cyan-400 hover:underline">Contact form</a>.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
