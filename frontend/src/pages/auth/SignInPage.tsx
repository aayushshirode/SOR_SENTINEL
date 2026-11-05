// SOR SENTINEL — Sign In Page with Forgot Password & Account Recovery
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, KeyRound, RotateCcw, CheckCircle, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi, extractErrorMessage } from '@/services/api';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import toast from 'react-hot-toast';

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, completeSignupVerification } = useAuth();

  // Sign In Form State
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Unverified Account Helper State
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [unverifiedOtp, setUnverifiedOtp] = useState('');
  const [unverifiedLoading, setUnverifiedLoading] = useState(false);
  const [unverifiedCooldown, setUnverifiedCooldown] = useState(60);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'new_password' | 'success'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Timers for forgot password
  const [forgotCountdown, setForgotCountdown] = useState(300); // 5 mins
  const [forgotResendCooldown, setForgotResendCooldown] = useState(60); // 60s cooldown

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showForgotModal && forgotStep === 'otp') {
      timer = setInterval(() => {
        setForgotCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        setForgotResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showForgotModal, forgotStep]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (unverifiedEmail) {
      timer = setInterval(() => {
        setUnverifiedCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [unverifiedEmail]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Password is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    setUnverifiedEmail(null);
    try {
      const loggedInUser = await login(form.email, form.password);
      toast.success('Welcome back!');
      const fromPath = (location.state as any)?.from?.pathname;
      const defaultPath = loggedInUser?.role === 'admin' ? '/admin' : '/dashboard';
      navigate(fromPath || defaultPath, { replace: true });
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      toast.error(msg);
      setErrors({ form: msg });

      // If user is unverified, prompt them with verification option
      if (msg.toLowerCase().includes('not verified')) {
        setUnverifiedEmail(form.email);
        setUnverifiedCooldown(60);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password Handlers ───────────────────────────────────────────────
  const openForgotPassword = () => {
    setForgotEmail(form.email || '');
    setForgotOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotStep('email');
    setShowForgotModal(true);
  };

  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !/\S+@\S+\.\S+/.test(forgotEmail)) {
      setForgotError('Please enter a valid email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await authApi.forgotPassword(forgotEmail.trim());
      toast.success(res.data.message || 'Recovery code dispatched to your email.');
      setForgotStep('otp');
      setForgotCountdown(300);
      setForgotResendCooldown(60);
    } catch (err) {
      const msg = extractErrorMessage(err);
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = forgotOtp.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setForgotError('Please enter the 6-digit recovery code.');
      return;
    }
    if (forgotCountdown <= 0) {
      setForgotError('Recovery code has expired. Please request a new code.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await authApi.verifyResetOtp(forgotEmail.trim(), cleanOtp);
      setResetToken(res.data.reset_token);
      toast.success('Code verified! Please set your new password.');
      setForgotStep('new_password');
    } catch (err) {
      const msg = extractErrorMessage(err);
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendResetOtp = async () => {
    if (forgotResendCooldown > 0 || forgotLoading) return;
    setForgotLoading(true);
    setForgotError('');
    try {
      await authApi.forgotPassword(forgotEmail.trim());
      toast.success('Fresh recovery code sent to your email.');
      setForgotCountdown(300);
      setForgotResendCooldown(60);
    } catch (err) {
      const msg = extractErrorMessage(err);
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setForgotError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setForgotError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setForgotError('Password must contain at least one number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await authApi.resetPassword({
        email: forgotEmail.trim(),
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success(res.data.message || 'Password reset successfully!');
      setForgotStep('success');
      setForm((f) => ({ ...f, email: forgotEmail.trim(), password: '' }));
    } catch (err) {
      const msg = extractErrorMessage(err);
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Unverified Account Instant OTP Verification ───────────────────────────
  const handleVerifyUnverifiedAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unverifiedEmail || unverifiedOtp.length !== 6) return;
    setUnverifiedLoading(true);
    try {
      const verifiedUser = await completeSignupVerification(unverifiedEmail, unverifiedOtp);
      toast.success('Account successfully verified! Welcome.');
      setUnverifiedEmail(null);
      const fromPath = (location.state as any)?.from?.pathname;
      const defaultPath = verifiedUser?.role === 'admin' ? '/admin' : '/dashboard';
      navigate(fromPath || defaultPath, { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setUnverifiedLoading(false);
    }
  };

  const handleResendUnverifiedOtp = async () => {
    if (!unverifiedEmail || unverifiedCooldown > 0) return;
    try {
      const res = await authApi.resendSignupOtp(unverifiedEmail);
      toast.success(res.data.message || 'Verification code resent!');
      setUnverifiedCooldown(60);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  // Password strength calculation
  const pwStrength = (pw: string) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };
  const strength = pwStrength(newPassword);
  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-emerald-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

  return (
    <div className="min-h-screen bg-[#0a0f1a] relative flex items-center justify-center px-4 py-12">
      {/* Top-Right Theme Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-6">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-[#e8edf5] mb-2 font-sora">Welcome back</h1>
          <p className="text-[#8fa3bf] text-sm font-plex">Sign in to your account to continue</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#131d35] border border-[#1e2d4f] rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {errors.form && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {errors.form}
              </div>
            )}

            {/* Unverified Account Inline Action */}
            {unverifiedEmail && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Email Verification Required</span>
                </div>
                <p className="text-[#8fa3bf]">
                  Your account requires 6-digit OTP verification. Enter the code sent to your email:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6-digit code"
                    value={unverifiedOtp}
                    onChange={(e) => setUnverifiedOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[#0b1329] border border-[#1e2d4f] text-[#e8edf5] text-center font-mono tracking-widest text-sm focus:outline-none focus:border-cyan-500"
                  />
                  <Button
                    type="button"
                    size="sm"
                    loading={unverifiedLoading}
                    disabled={unverifiedOtp.length !== 6}
                    onClick={handleVerifyUnverifiedAccount}
                  >
                    Verify
                  </Button>
                </div>
                <div className="flex justify-between items-center pt-1 text-[11px]">
                  <button
                    type="button"
                    disabled={unverifiedCooldown > 0}
                    onClick={handleResendUnverifiedOtp}
                    className="text-cyan-400 hover:text-cyan-300 disabled:text-[#4a6180]"
                  >
                    {unverifiedCooldown > 0 ? `Resend Code (${unverifiedCooldown}s)` : 'Resend Verification Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnverifiedEmail(null)}
                    className="text-[#8fa3bf] hover:text-[#e8edf5]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              error={errors.email}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            <div className="flex flex-col gap-1.5">
              <Input
                label="Password"
                type={showPw ? 'text' : 'password'}
                placeholder="Your password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                error={errors.password}
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="text-[#4a6180] hover:text-[#8fa3bf] transition-colors"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                autoComplete="current-password"
                required
              />
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#8fa3bf] text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-[#4a6180] text-xs hover:text-[#8fa3bf] transition-colors">
            ← Back to Homepage
          </Link>
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ───────────────────────────────────────────── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#131d35] border border-[#1e2d4f] rounded-2xl p-6 sm:p-8 shadow-2xl relative modal-surface">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-1.5 text-[#8fa3bf] hover:text-[#e8edf5] hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close recovery dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Error Message */}
            {forgotError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs">
                {forgotError}
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {forgotStep === 'email' && (
              <form onSubmit={handleRequestResetOtp} className="flex flex-col gap-5">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3 text-cyan-400">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#e8edf5] font-sora">Reset Password</h3>
                  <p className="text-xs text-[#8fa3bf] mt-1 font-plex">
                    Enter your registered email address and we'll dispatch a 6-digit recovery code.
                  </p>
                </div>

                <Input
                  label="Registered Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  autoFocus
                  required
                />

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={forgotLoading} className="flex-1">
                    Send Code
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter 6-digit OTP */}
            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyResetOtp} className="flex flex-col gap-5">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3 text-cyan-400">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#e8edf5] font-sora">Enter Recovery Code</h3>
                  <p className="text-xs text-[#8fa3bf] mt-1 font-plex">
                    We sent a 6-digit recovery code to:
                    <br />
                    <span className="text-[#e8edf5] font-mono font-semibold break-all">{forgotEmail}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => {
                      setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                      if (forgotError) setForgotError('');
                    }}
                    autoFocus
                    placeholder="------"
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold py-3 px-4 rounded-xl bg-[#0b1329] border border-[#1e2d4f] text-[#e8edf5] focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-between text-xs px-1">
                  <span className={`font-mono ${forgotCountdown > 30 ? 'text-[#8fa3bf]' : 'text-red-400 font-bold'}`}>
                    {forgotCountdown > 0 ? `Expires: ${formatTime(forgotCountdown)}` : 'Expired'}
                  </span>

                  <button
                    type="button"
                    disabled={forgotResendCooldown > 0 || forgotLoading}
                    onClick={handleResendResetOtp}
                    className={`flex items-center gap-1 font-medium transition-colors ${
                      forgotResendCooldown > 0 || forgotLoading
                        ? 'text-[#4a6180] cursor-not-allowed'
                        : 'text-cyan-400 hover:text-cyan-300'
                    }`}
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${forgotLoading ? 'animate-spin' : ''}`} />
                    <span>{forgotResendCooldown > 0 ? `Resend (${forgotResendCooldown}s)` : 'Resend Code'}</span>
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setForgotStep('email')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    loading={forgotLoading}
                    disabled={forgotOtp.length !== 6 || forgotCountdown <= 0}
                    className="flex-1"
                  >
                    Verify Code
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 3: Enter New Password */}
            {forgotStep === 'new_password' && (
              <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 text-emerald-400">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#e8edf5] font-sora">Create New Password</h3>
                  <p className="text-xs text-[#8fa3bf] mt-1 font-plex">
                    Choose a strong password containing uppercase letters and digits.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Input
                    label="New Password"
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowNewPw((v) => !v)}
                        className="text-[#4a6180] hover:text-[#8fa3bf]"
                      >
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    autoFocus
                    required
                  />
                  {newPassword && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              i <= strength ? strengthColors[strength] : 'bg-[#1e2d4f]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#8fa3bf]">{strengthLabels[strength]}</span>
                    </div>
                  )}
                </div>

                <Input
                  label="Confirm New Password"
                  type={showConfirmPw ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw((v) => !v)}
                      className="text-[#4a6180] hover:text-[#8fa3bf]"
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />

                <Button type="submit" loading={forgotLoading} className="w-full mt-2">
                  Update Password
                </Button>
              </form>
            )}

            {/* STEP 4: Success Confirmation */}
            {forgotStep === 'success' && (
              <div className="text-center py-4 flex flex-col gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-[#e8edf5] font-sora">Password Reset Successfully</h3>
                <p className="text-xs text-[#8fa3bf] leading-relaxed max-w-sm mx-auto">
                  Your credentials have been securely updated in the SOR SENTINEL Enclave. A confirmation notification has been dispatched to your email.
                </p>
                <Button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full mt-2"
                >
                  Sign In with New Password
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
