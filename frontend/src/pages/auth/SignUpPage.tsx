// SOR SENTINEL — Sign Up Page
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Mail, Lock, User, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { extractErrorMessage } from '@/services/api';
import { BrandLogo } from '@/components/ui/BrandLogo';
import toast from 'react-hot-toast';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    terms_accepted: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim() || form.full_name.trim().length < 2) errs.full_name = 'Full name must be at least 2 characters.';
    if (!form.email) errs.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Include at least one uppercase letter.';
    else if (!/[0-9]/.test(form.password)) errs.password = 'Include at least one number.';
    if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match.';
    if (!form.terms_accepted) errs.terms_accepted = 'You must accept the Terms of Service.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      const msg = extractErrorMessage(err);
      toast.error(msg);
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = () => {
    const pw = form.password;
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };
  const strength = pwStrength();
  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-emerald-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-6">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-[#e8edf5] mb-2 font-sora">Create your account</h1>
          <p className="text-[#8fa3bf] text-sm font-plex">Start analyzing sources for free</p>
        </div>

        <div className="bg-[#131d35] border border-[#1e2d4f] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {errors.form && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{errors.form}</div>
            )}

            <Input
              label="Full Name"
              type="text"
              placeholder="Jane Doe"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              error={errors.full_name}
              leftIcon={<User className="w-4 h-4" />}
              autoComplete="name"
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              error={errors.email}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            <div className="flex flex-col gap-1.5">
              <Input
                label="Password"
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                error={errors.password}
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button type="button" onClick={() => setShowPw(v => !v)} className="text-[#4a6180] hover:text-[#8fa3bf]">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                autoComplete="new-password"
                required
              />
              {form.password && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : 'bg-[#1e2d4f]'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-[#8fa3bf]">{strengthLabels[strength]}</span>
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat your password"
              value={form.confirm_password}
              onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))}
              error={errors.confirm_password}
              leftIcon={<Lock className="w-4 h-4" />}
              rightElement={
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-[#4a6180] hover:text-[#8fa3bf]">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="new-password"
              required
            />

            <div className="flex flex-col gap-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.terms_accepted}
                    onChange={e => setForm(f => ({ ...f, terms_accepted: e.target.checked }))}
                  />
                  <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${form.terms_accepted ? 'bg-cyan-500 border-cyan-500' : 'border-[#253556]'}`}>
                    {form.terms_accepted && <CheckCircle className="w-3 h-3 text-[#0a0f1a]" />}
                  </div>
                </div>
                <span className="text-sm text-[#8fa3bf]">
                  I agree to the{' '}
                  <Link to="/terms" className="text-cyan-400 hover:text-cyan-300">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-cyan-400 hover:text-cyan-300">Privacy Policy</Link>
                </span>
              </label>
              {errors.terms_accepted && <p className="text-xs text-red-400 ml-7">⚠ {errors.terms_accepted}</p>}
            </div>

            <Button type="submit" loading={loading} className="w-full mt-1">
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#8fa3bf] text-sm">
              Already have an account?{' '}
              <Link to="/signin" className="text-cyan-400 hover:text-cyan-300 font-medium">Sign in</Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-[#4a6180] text-xs hover:text-[#8fa3bf] transition-colors">← Back to Homepage</Link>
        </div>
      </div>
    </div>
  );
}
