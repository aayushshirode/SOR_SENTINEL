// SOR SENTINEL — Post-Login Account Security Password Prompt Modal
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Eye, EyeOff, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi, extractErrorMessage } from '@/services/api';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'sor_password_update_prompt_dismissed';

export function PostLoginPasswordPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(STORAGE_KEY);
      if (!isDismissed) {
        // Small delay to allow initial dashboard animations to settle
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage restricted
    }
  }, []);

  const handleSkip = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
    setIsOpen(false);
  };

  const pwStrength = () => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  };
  const strength = pwStrength();
  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-emerald-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('Password must contain at least one number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authApi.secureAccountPassword({
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {}
      toast.success('Password updated successfully! Your account is protected.');
      setIsOpen(false);
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#131d35] border border-[#1e2d4f] rounded-2xl p-6 sm:p-8 shadow-2xl relative modal-surface">
        {/* Close Icon (Triggers Skip) */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 text-[#8fa3bf] hover:text-[#e8edf5] hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Skip password update"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3 text-cyan-400 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#e8edf5] font-sora tracking-wide uppercase">
            SECURE YOUR ACCOUNT
          </h2>
          <p className="text-xs text-[#8fa3bf] mt-1.5 font-plex leading-relaxed">
            Update your password to keep your account protected.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Input
              label="New Password"
              type={showNewPw ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (error) setError('');
              }}
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
            label="Confirm Password"
            type={showConfirmPw ? 'text' : 'password'}
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (error) setError('');
            }}
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

          {/* Modal Footer: Skip strictly aligned to LEFT, Submit strictly aligned to RIGHT */}
          <div className="flex items-center justify-between w-full pt-4 mt-2 border-t border-[#1e2d4f]">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              className="text-[#8fa3bf] hover:text-[#e8edf5]"
            >
              Skip
            </Button>

            <Button
              type="submit"
              loading={loading}
              className="px-6"
            >
              Submit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
