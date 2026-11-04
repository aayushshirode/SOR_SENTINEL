// SOR SENTINEL — Premium Cyber Profile Dashboard (Design 1)
// Futuristic LinkedIn-inspired cyber-intelligence profile composition
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { userApi, extractErrorMessage } from '@/services/api';
import {
  User, Lock, Mail, Shield, CheckCircle2, AlertCircle, Save, Key,
  Camera, Trash2, LogOut, X, Eye, EyeOff, Palette, HelpCircle, Star,
  MessageSquare, Info, Phone, MapPin, Calendar, Clock, Edit3,
  ExternalLink, ChevronRight, Sparkles, Check, Copy, FileText,
  Terminal, Cpu, Layers, Send, MoreVertical, RefreshCw, Sliders,
  Database, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, Badge } from '@/components/ui/index';
import { formatKolkataDateTime, formatKolkataDate } from '@/utils/date';
import toast from 'react-hot-toast';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png'];

type BannerTheme = 'cyber_grid' | 'neural_matrix' | 'quantum_circuit';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // ── Cover Banner Theme State ───────────────────────────────────────────────
  const [bannerTheme, setBannerTheme] = useState<BannerTheme>(() => {
    const saved = localStorage.getItem('sor_profile_banner_preset') as BannerTheme;
    return saved || 'cyber_grid';
  });
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const selectBannerTheme = (theme: BannerTheme) => {
    setBannerTheme(theme);
    localStorage.setItem('sor_profile_banner_preset', theme);
    setShowThemeMenu(false);
    const names: Record<BannerTheme, string> = {
      cyber_grid: 'Cyber Grid & Skyline',
      neural_matrix: 'Neural Matrix & Streams',
      quantum_circuit: 'Quantum Circuit & Constellation',
    };
    toast.success(`Banner theme changed to ${names[theme]}`);
  };

  // ── Contact Extra Info (persisted in localStorage) ─────────────────────────
  const [phone, setPhone] = useState(() => {
    return localStorage.getItem('sor_profile_phone') || '+1 (555) 019-2834';
  });
  const [location, setLocation] = useState(() => {
    return localStorage.getItem('sor_profile_location') || 'Cyber Operations Enclave, Sector 7';
  });
  const [copiedUid, setCopiedUid] = useState(false);

  // ── Profile Edit State ─────────────────────────────────────────────────────
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [editPhone, setEditPhone] = useState(phone);
  const [editLocation, setEditLocation] = useState(location);
  const [profileLoading, setProfileLoading] = useState(false);

  // Sync state if user changes
  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
  }, [user?.full_name]);

  // ── Password Management State ──────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Password strength checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // ── Avatar Management State ────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showRemoveAvatarModal, setShowRemoveAvatarModal] = useState(false);

  // ── Support & More Modals State ────────────────────────────────────────────
  const [activeSupportModal, setActiveSupportModal] = useState<
    'help' | 'review' | 'feedback' | 'privacy' | 'about' | null
  >(null);

  // Review form state
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Feedback form state
  const [feedbackCategory, setFeedbackCategory] = useState('Bug Report');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Help modal active tab
  const [helpTab, setHelpTab] = useState<'url' | 'text' | 'vault' | 'cubbis' | 'account'>('url');

  // Logout confirm modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ── Profile Update Handler ─────────────────────────────────────────────────
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Full name cannot be empty');
      return;
    }
    setProfileLoading(true);
    try {
      const res = await userApi.updateProfile({ full_name: fullName.trim() });
      updateUser(res.data);
      // Persist contact details
      setPhone(editPhone.trim());
      setLocation(editLocation.trim());
      localStorage.setItem('sor_profile_phone', editPhone.trim());
      localStorage.setItem('sor_profile_location', editLocation.trim());
      toast.success('Profile credentials updated successfully');
      setIsEditingProfile(false);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCancelEditProfile = () => {
    setFullName(user?.full_name || '');
    setEditPhone(phone);
    setEditLocation(location);
    setIsEditingProfile(false);
  };

  // ── Password Change Handler ────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please complete all password fields');
      return;
    }
    if (!hasMinLength) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      toast.error('Password must contain uppercase, lowercase, and numbers');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      await userApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setPasswordLoading(false);
    }
  };

  // ── Avatar Handlers ────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      toast.error('Only .jpg, .jpeg, and .png image files are permitted.');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('Image size exceeds 2 MB limit. Please select a smaller photo.');
      return;
    }

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setShowAvatarMenu(false);
  };

  const handleCancelAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveAvatar = async () => {
    if (!avatarFile) return;
    setAvatarLoading(true);
    try {
      const res = await userApi.uploadAvatar(avatarFile);
      updateUser(res.data);
      toast.success('Profile picture updated successfully');
      handleCancelAvatar();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleConfirmRemoveAvatar = async () => {
    setShowRemoveAvatarModal(false);
    setAvatarLoading(true);
    try {
      const res = await userApi.removeAvatar();
      updateUser(res.data);
      toast.success('Profile picture removed. Reverted to default avatar.');
      handleCancelAvatar();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setAvatarLoading(false);
    }
  };

  // ── Copy UID Token ─────────────────────────────────────────────────────────
  const handleCopyUid = () => {
    const uidToken = `SENTINEL-UID-${String(user?.id || 1).padStart(6, '0')}`;
    navigator.clipboard.writeText(uidToken);
    setCopiedUid(true);
    toast.success('Sentinel UID copied to clipboard');
    setTimeout(() => setCopiedUid(false), 2000);
  };

  // ── Review Submission ──────────────────────────────────────────────────────
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await userApi.submitReview({
        rating,
        review: reviewText.trim() || undefined,
      });
      toast.success('Thank you! Your rating and review have been recorded.');
      setActiveSupportModal(null);
      setReviewText('');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── Feedback Submission ────────────────────────────────────────────────────
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      toast.error('Please enter your feedback message');
      return;
    }
    setSubmittingFeedback(true);
    try {
      await userApi.submitFeedback({
        category: feedbackCategory,
        message: feedbackMessage.trim(),
      });
      toast.success('Feedback received! Thank you for contributing.');
      setActiveSupportModal(null);
      setFeedbackMessage('');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // ── Logout Confirm ─────────────────────────────────────────────────────────
  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutConfirm(false);
    toast.success('Session terminated. Logged out successfully.');
    navigate('/signin');
  };

  const ratingDescriptions: Record<number, string> = {
    1: '1/5 — Critical Improvements Needed',
    2: '2/5 — Below Expectations',
    3: '3/5 — Adequate Defense System',
    4: '4/5 — Very Strong & Dependable',
    5: '5/5 — Elite Cyber Intelligence Platform',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#e8edf5] tracking-tight font-space">
              Profile & Security
            </h1>
          </div>
          <p className="text-[#8fa3bf] text-sm mt-1 font-plex">
            Identity credentials, telemetry parameters, and security management.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (isEditingProfile) {
                handleCancelEditProfile();
              } else {
                setEditPhone(phone);
                setEditLocation(location);
                setIsEditingProfile(true);
              }
            }}
            leftIcon={<Edit3 className="w-3.5 h-3.5 text-cyan-400" />}
          >
            {isEditingProfile ? 'Close Editor' : 'Edit Profile'}
          </Button>
        </div>
      </div>

      {/* ── 1. Futuristic Cover Banner & Overlapping Profile Card ───────────── */}
      <div className="relative rounded-2xl overflow-hidden border border-[#1e2d4f] bg-[#0c1424] shadow-2xl shadow-cyan-950/20">
        {/* Cover Banner Area */}
        <div className="h-48 sm:h-60 md:h-64 w-full relative overflow-hidden select-none">
          {/* Banner Theme: Cyber Grid */}
          {bannerTheme === 'cyber_grid' && (
            <div className="absolute inset-0 bg-gradient-to-b from-[#030712] via-[#09152b] to-[#0c1e3d]">
              {/* Perspective grid SVG */}
              <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="cyber-grid-vert" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.05" />
                    <stop offset="60%" stopColor="#00d4ff" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.7" />
                  </linearGradient>
                  <pattern id="cyber-grid-pat" width="40" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 30" fill="none" stroke="url(#cyber-grid-vert)" strokeWidth="0.75" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#cyber-grid-pat)" />
              </svg>

              {/* Glowing Horizon Flare */}
              <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-cyan-500/20 via-blue-600/10 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00d4ff]" />

              {/* Distant Cyber Cityscape Silhouette */}
              <div className="absolute bottom-0 inset-x-0 h-20 opacity-30 pointer-events-none flex items-end justify-around px-4">
                <div className="w-8 h-14 bg-cyan-900/60 border-t border-x border-cyan-400/40" />
                <div className="w-12 h-18 bg-cyan-950/70 border-t border-x border-cyan-400/50" />
                <div className="w-6 h-10 bg-cyan-900/40 border-t border-x border-cyan-400/30" />
                <div className="w-16 h-20 bg-blue-950/70 border-t border-x border-blue-400/40" />
                <div className="w-10 h-16 bg-cyan-900/50 border-t border-x border-cyan-400/40" />
                <div className="w-14 h-12 bg-cyan-950/60 border-t border-x border-cyan-400/30" />
                <div className="w-7 h-15 bg-cyan-900/60 border-t border-x border-cyan-400/40" />
                <div className="w-12 h-19 bg-blue-950/70 border-t border-x border-blue-400/50" />
              </div>

              {/* Animated Light Scanning Streak */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-pulse pointer-events-none" />
            </div>
          )}

          {/* Banner Theme: Neural Matrix */}
          {bannerTheme === 'neural_matrix' && (
            <div className="absolute inset-0 bg-gradient-to-b from-[#020b0c] via-[#041a1c] to-[#062c2f]">
              <svg className="absolute inset-0 w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="matrix-pat" width="30" height="30" patternUnits="userSpaceOnUse">
                    <circle cx="15" cy="15" r="1" fill="#10b981" opacity="0.6" />
                    <line x1="15" y1="0" x2="15" y2="30" stroke="#10b981" strokeWidth="0.5" strokeDasharray="2,6" opacity="0.4" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#matrix-pat)" />
              </svg>
              <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-emerald-500/20 via-cyan-500/10 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981]" />
            </div>
          )}

          {/* Banner Theme: Quantum Circuit */}
          {bannerTheme === 'quantum_circuit' && (
            <div className="absolute inset-0 bg-gradient-to-b from-[#080414] via-[#120a2e] to-[#1c0f45]">
              <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="circuit-pat" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 0 30 L 25 30 L 35 40 L 60 40 M 30 0 L 30 20 L 40 30" fill="none" stroke="#a855f7" strokeWidth="0.8" opacity="0.5" />
                    <circle cx="25" cy="30" r="2" fill="#00d4ff" />
                    <circle cx="40" cy="30" r="2" fill="#c084fc" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#circuit-pat)" />
              </svg>
              <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-violet-600/25 via-fuchsia-600/10 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400 to-transparent shadow-[0_0_12px_#c084fc]" />
            </div>
          )}

          {/* Banner Theme Selector (Upper Right) */}
          <div className="absolute top-4 right-4 z-20">
            <button
              type="button"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-xs font-medium text-cyan-300 border border-cyan-500/30 transition-all shadow-md active:scale-95"
              title="Customize futuristic cover banner theme"
            >
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Banner Theme</span>
            </button>

            {/* Theme Dropdown */}
            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[#131d35] border border-[#1e2d4f] rounded-xl shadow-2xl p-2 z-30 space-y-1 animate-fade-in backdrop-blur-md">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-[#8fa3bf] uppercase tracking-wider">
                  Select Banner Preset
                </div>
                <button
                  type="button"
                  onClick={() => selectBannerTheme('cyber_grid')}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                    bannerTheme === 'cyber_grid'
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-[#e8edf5] hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    Cyber Grid & Skyline
                  </span>
                  {bannerTheme === 'cyber_grid' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => selectBannerTheme('neural_matrix')}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                    bannerTheme === 'neural_matrix'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-[#e8edf5] hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    Neural Data Matrix
                  </span>
                  {bannerTheme === 'neural_matrix' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => selectBannerTheme('quantum_circuit')}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                    bannerTheme === 'quantum_circuit'
                      ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                      : 'text-[#e8edf5] hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                    Quantum Circuit
                  </span>
                  {bannerTheme === 'quantum_circuit' && <Check className="w-3.5 h-3.5 text-violet-400" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 2. Overlapping Profile Photo & Identity Strip ────────────────────── */}
        <div className="bg-[#131d35] px-6 sm:px-8 pb-6 pt-3 border-t border-[#1e2d4f] relative">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              {/* Overlapping Avatar Container */}
              <div className="relative -mt-20 sm:-mt-24 md:-mt-28 shrink-0 group">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer relative rounded-full"
                  title="Click to update photo"
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover ring-4 ring-[#131d35] border-2 border-cyan-400 shadow-2xl shadow-cyan-500/30"
                    />
                  ) : user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover ring-4 ring-[#131d35] border-2 border-cyan-400 shadow-2xl shadow-cyan-500/30"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-700 flex items-center justify-center text-white text-4xl sm:text-5xl font-extrabold ring-4 ring-[#131d35] border-2 border-cyan-400/80 shadow-2xl shadow-cyan-500/30">
                      {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-cyan-300 text-xs font-semibold gap-1 backdrop-blur-[2px]">
                    <Camera className="w-4 h-4" />
                    <span>Upload</span>
                  </div>
                </div>

                {/* Primary Camera Action Button (Direct Trigger) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload new profile picture"
                  className="absolute bottom-1 right-1 p-2 sm:p-2.5 rounded-full bg-cyan-500 text-[#0a0f1a] hover:bg-cyan-400 active:scale-95 shadow-lg shadow-cyan-500/40 border-2 border-[#131d35] transition-all"
                >
                  <Camera className="w-4 h-4" />
                </button>

                {/* Discrete Contextual Menu Trigger (if custom avatar exists) */}
                {user?.avatar_url && !avatarPreview && (
                  <div className="absolute -top-1 right-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAvatarMenu(!showAvatarMenu);
                      }}
                      className="p-1.5 rounded-full bg-[#0a0f1a]/80 hover:bg-[#0a0f1a] text-[#8fa3bf] hover:text-[#e8edf5] border border-[#1e2d4f] shadow-md backdrop-blur-sm"
                      title="Photo options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {showAvatarMenu && (
                      <div className="absolute left-0 mt-1.5 w-44 bg-[#0f1629] border border-[#1e2d4f] rounded-lg shadow-xl p-1 z-30 animate-fade-in text-left">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAvatarMenu(false);
                            fileInputRef.current?.click();
                          }}
                          className="w-full px-3 py-1.5 text-xs text-[#e8edf5] hover:bg-white/5 rounded flex items-center gap-2"
                        >
                          <Camera className="w-3.5 h-3.5 text-cyan-400" />
                          Change Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAvatarMenu(false);
                            setShowRemoveAvatarModal(true);
                          }}
                          className="w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          Remove Photo
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Identity Details */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#e8edf5] tracking-tight font-space">
                    {user?.full_name || 'Enclave Operator'}
                  </h2>
                  <Badge variant={user?.role === 'admin' ? 'violet' : 'cyan'} className="font-rajdhani font-bold tracking-wider uppercase">
                    {user?.role === 'admin' ? 'ADMIN' : 'SECURITY ANALYST'}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-[#8fa3bf]">
                  <span className="flex items-center gap-1 text-cyan-300 font-plex font-medium">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    {user?.email}
                  </span>
                  <span className="text-[#1e2d4f] hidden sm:inline">•</span>
                  <span className="flex items-center gap-1 font-rajdhani font-bold text-[#8fa3bf] tracking-wide">
                    <Shield className="w-3.5 h-3.5 text-violet-400" />
                    UID: #{user?.id}
                  </span>
                  <span className="text-[#1e2d4f] hidden sm:inline">•</span>
                  <span className="flex items-center gap-1 text-[#8fa3bf] font-plex">
                    <Calendar className="w-3.5 h-3.5 text-[#4a6180]" />
                    Joined {user?.created_at ? formatKolkataDate(user.created_at) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Avatar Preview Bar */}
          {avatarPreview && (
            <div className="mt-4 p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5 text-xs text-cyan-300">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>New profile picture selected.</strong> Save to update your cybersecurity identity across SOR SENTINEL.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="primary"
                  className="text-xs px-3 py-1.5"
                  onClick={handleSaveAvatar}
                  loading={avatarLoading}
                >
                  Save Picture
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs px-3 py-1.5"
                  onClick={handleCancelAvatar}
                  disabled={avatarLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Inline Profile Editor (When Opened) ───────────────────────────── */}
      {isEditingProfile && (
        <Card className="p-6 border-cyan-500/40 shadow-xl shadow-cyan-950/20 animate-fade-in">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e2d4f]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#e8edf5]">Edit Identity & Contact Information</h3>
                <p className="text-xs text-[#8fa3bf]">Update your display name and contact parameters</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelEditProfile}
              className="text-[#8fa3bf] hover:text-[#e8edf5] p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8fa3bf] uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-cyan-400">*</span>
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aayush Sharma"
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8fa3bf] uppercase tracking-wider mb-1.5 font-outfit">
                  Email Id
                </label>
                <Input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  leftIcon={<Lock className="w-4 h-4" />}
                  className="opacity-60 cursor-not-allowed"
                />
                <span className="text-[11px] text-[#4a6180] mt-1 block">
                  Bound to account credentials and authentication token.
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8fa3bf] uppercase tracking-wider mb-1.5 font-outfit">
                  PHONE NUMBER
                </label>
                <Input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  leftIcon={<Phone className="w-4 h-4" />}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8fa3bf] uppercase tracking-wider mb-1.5 font-outfit">
                  Operational Base / Location
                </label>
                <Input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. Cyber Operations Enclave, Sector 7"
                  leftIcon={<MapPin className="w-4 h-4" />}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelEditProfile}
                disabled={profileLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={profileLoading}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── 4. Main Two-Column Layout ────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on lg): Contact Details & Password Security */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#e8edf5]">Contact Details</h3>
                  <p className="text-xs text-[#8fa3bf]">Verified communication channels</p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Email item */}
              <div className="p-3.5 rounded-xl bg-[#0f1629] border border-[#1e2d4f] flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#4a6180] uppercase tracking-wider block mb-1">
                    Email Id
                  </span>
                  <div className="text-sm font-mono text-[#e8edf5] truncate">
                    {user?.email || '—'}
                  </div>
                </div>
              </div>

              {/* Phone item */}
              <div className="p-3.5 rounded-xl bg-[#0f1629] border border-[#1e2d4f] flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#4a6180] uppercase tracking-wider block mb-1">
                    PHONE NUMBER
                  </span>
                  <div className="text-sm font-mono text-[#e8edf5]">
                    {phone}
                  </div>
                </div>
              </div>

              {/* Location item */}
              <div className="p-3.5 rounded-xl bg-[#0f1629] border border-[#1e2d4f] flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#4a6180] uppercase tracking-wider block mb-1">
                    Operational Base / Location
                  </span>
                  <div className="text-sm text-[#e8edf5] truncate">
                    {location}
                  </div>
                </div>
              </div>

              {/* UID Token Item */}
              <div className="p-3.5 rounded-xl bg-[#0f1629] border border-[#1e2d4f] flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#4a6180] uppercase tracking-wider block mb-1">
                    Digital Sentinel Token (UID)
                  </span>
                  <div className="text-xs font-mono text-cyan-300 truncate">
                    SENTINEL-UID-{String(user?.id || 1).padStart(6, '0')}
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-[#1e2d4f]/60 flex items-center justify-end text-[11px]">
                  <button
                    type="button"
                    onClick={handleCopyUid}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                  >
                    {copiedUid ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedUid ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Security & Password Management Form */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1e2d4f]">
              <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#e8edf5]">Security & Credential Management</h3>
                <p className="text-xs text-[#8fa3bf]">Enforce strong password cryptography and session hygiene</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8fa3bf] uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="text-[#8fa3bf] hover:text-[#e8edf5] p-1"
                      title={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8fa3bf] uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    leftIcon={<Key className="w-4 h-4" />}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="text-[#8fa3bf] hover:text-[#e8edf5] p-1"
                        title={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8fa3bf] uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    leftIcon={<Key className="w-4 h-4" />}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-[#8fa3bf] hover:text-[#e8edf5] p-1"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    required
                  />
                </div>
              </div>

              {/* Password Rule Checklist */}
              <div className="p-3 bg-[#0f1629] border border-[#1e2d4f] rounded-lg">
                <span className="text-[11px] font-semibold text-[#8fa3bf] uppercase tracking-wider block mb-2">
                  Password Strength Requirements
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-[#4a6180]'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>8+ Characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUpperCase ? 'text-emerald-400' : 'text-[#4a6180]'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLowerCase ? 'text-emerald-400' : 'text-[#4a6180]'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-[#4a6180]'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-400' : 'text-[#4a6180]'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Passwords Match</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  variant="secondary"
                  loading={passwordLoading}
                  leftIcon={<Lock className="w-4 h-4" />}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column (1 Col on lg): Account Details & System Telemetry */}
        <div className="space-y-6">
          {/* Account Details Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1e2d4f]">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#e8edf5]">Account Telemetry</h3>
                <p className="text-xs text-[#8fa3bf]">Real-time enclave parameters</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-[#0f1629] border border-[#1e2d4f]/80 flex items-center justify-between">
                <span className="text-[#8fa3bf]">Assigned Role</span>
                <span className="font-mono text-cyan-300 font-semibold uppercase">
                  {user?.role || 'user'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0f1629] border border-[#1e2d4f]/80 flex items-center justify-between">
                <span className="text-[#8fa3bf]">Enclave Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {user?.is_active ? 'Operational' : 'Restricted'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0f1629] border border-[#1e2d4f]/80 flex items-center justify-between">
                <span className="text-[#8fa3bf]">Member Since</span>
                <span className="text-[#e8edf5] font-mono">
                  {user?.created_at ? formatKolkataDate(user.created_at) : '—'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0f1629] border border-[#1e2d4f]/80">
                <span className="text-[#8fa3bf] block mb-1">Current Session Login</span>
                <span className="text-[#e8edf5] font-mono text-[11px]">
                  {user?.last_login_at ? formatKolkataDateTime(user.last_login_at) : 'Active Now'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0f1629] border border-[#1e2d4f]/80">
                <span className="text-[#8fa3bf] block mb-1">Previous Session Login</span>
                <span className="text-[#e8edf5] font-mono text-[11px]">
                  {user?.previous_login_at
                    ? formatKolkataDateTime(user.previous_login_at)
                    : 'Initial session recorded'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0f1629] border border-[#1e2d4f]/80 flex items-center justify-between">
                <span className="text-[#8fa3bf]">Database Residency</span>
                <span className="text-cyan-400 font-mono text-[11px] font-semibold">
                  Oracle 21c XE
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── 5. Support & More: 5 Functional Cyber Cards ──────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#e8edf5] flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Support & Platform Resources
          </h2>
          <p className="text-xs text-[#8fa3bf] mt-0.5">
            Interactive user guides, rating reviews, direct feedback submission, and system specifications.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Help & Support */}
          <Card
            hover
            onClick={() => setActiveSupportModal('help')}
            className="p-4 flex flex-col justify-between group border-[#1e2d4f] hover:border-cyan-500/50 transition-all cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-[#e8edf5] text-sm group-hover:text-cyan-300 transition-colors">
                  Help & Support
                </h4>
                <p className="text-xs text-[#8fa3bf] mt-1 leading-relaxed">
                  Interactive module guides & threat defense tutorials.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1e2d4f] flex items-center justify-between text-xs text-cyan-400 font-medium">
              <span>Open Guide</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          {/* 2. Rate & Review */}
          <Card
            hover
            onClick={() => setActiveSupportModal('review')}
            className="p-4 flex flex-col justify-between group border-[#1e2d4f] hover:border-amber-500/50 transition-all cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-[#e8edf5] text-sm group-hover:text-amber-300 transition-colors">
                  Rate & Review
                </h4>
                <p className="text-xs text-[#8fa3bf] mt-1 leading-relaxed">
                  Rate platform effectiveness and share feedback.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1e2d4f] flex items-center justify-between text-xs text-amber-400 font-medium">
              <span>Write Review</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          {/* 3. Send Feedback */}
          <Card
            hover
            onClick={() => setActiveSupportModal('feedback')}
            className="p-4 flex flex-col justify-between group border-[#1e2d4f] hover:border-blue-500/50 transition-all cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-[#e8edf5] text-sm group-hover:text-blue-300 transition-colors">
                  Send Feedback
                </h4>
                <p className="text-xs text-[#8fa3bf] mt-1 leading-relaxed">
                  Report bugs, propose features, or request enhancements.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1e2d4f] flex items-center justify-between text-xs text-blue-400 font-medium">
              <span>Submit Form</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          {/* 4. Privacy & Security */}
          <Card
            hover
            onClick={() => setActiveSupportModal('privacy')}
            className="p-4 flex flex-col justify-between group border-[#1e2d4f] hover:border-emerald-500/50 transition-all cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-[#e8edf5] text-sm group-hover:text-emerald-300 transition-colors">
                  Privacy & Security
                </h4>
                <p className="text-xs text-[#8fa3bf] mt-1 leading-relaxed">
                  Cryptographic standards, AES-256-GCM & zero-trust policies.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1e2d4f] flex items-center justify-between text-xs text-emerald-400 font-medium">
              <span>View Policy</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          {/* 5. About SOR SENTINEL */}
          <Card
            hover
            onClick={() => setActiveSupportModal('about')}
            className="p-4 flex flex-col justify-between group border-[#1e2d4f] hover:border-violet-500/50 transition-all cursor-pointer"
          >
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-[#e8edf5] text-sm group-hover:text-violet-300 transition-colors">
                  About Platform
                </h4>
                <p className="text-xs text-[#8fa3bf] mt-1 leading-relaxed">
                  Version 1.0.0, architecture specs & intelligence mission.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1e2d4f] flex items-center justify-between text-xs text-violet-400 font-medium">
              <span>System Specs</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </div>
      </div>

      {/* ── MODALS SECTION ─────────────────────────────────────────────────── */}

      {/* ── Modal 1: Help & Support ────────────────────────────────────────── */}
      {activeSupportModal === 'help' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#131d35] border border-[#1e2d4f] rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#1e2d4f]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#e8edf5] text-lg">SOR SENTINEL — Operator Guide</h3>
                  <p className="text-xs text-[#8fa3bf]">Comprehensive walkthrough of cybersecurity capabilities</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSupportModal(null)}
                className="p-1 rounded-lg text-[#8fa3bf] hover:text-[#e8edf5] hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guide Tabs */}
            <div className="flex gap-2 border-b border-[#1e2d4f] py-3 overflow-x-auto text-xs">
              {[
                { id: 'url', label: 'URL Scanner' },
                { id: 'text', label: 'Text Credibility' },
                { id: 'vault', label: 'DigiKeeper Vault' },
                { id: 'cubbis', label: 'Cubbis AI Assistant' },
                { id: 'account', label: 'Account & Safety' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHelpTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    helpTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-[#8fa3bf] hover:text-[#e8edf5] hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Guide Content */}
            <div className="py-4 overflow-y-auto space-y-4 text-sm text-[#8fa3bf] leading-relaxed flex-1">
              {helpTab === 'url' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-[#e8edf5] text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Targeted URL Scanner & Redirect Sensor
                  </h4>
                  <p>
                    The URL Scanner checks links against malicious heuristics, redirection chains, and artificial intelligence models.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li><strong className="text-[#e8edf5]">Redirect Traversal:</strong> Inspects shorteners and multiple redirect hops to identify final landing destinations.</li>
                    <li><strong className="text-[#e8edf5]">Phishing & Spoofing Heuristics:</strong> Flags homograph attacks, suspicious subdomains, and counterfeit login forms.</li>
                    <li><strong className="text-[#e8edf5]">AI Verdicts:</strong> Computes structured credibility verdicts (Likely Credible, Questionable, Untrustworthy) and sensitivity levels.</li>
                  </ul>
                </div>
              )}

              {helpTab === 'text' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-[#e8edf5] text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    Source Credibility & Sensitivity Checker
                  </h4>
                  <p>
                    Paste articles, intelligence memos, or messages to uncover misinformation markers and sensitivity scores.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li><strong className="text-[#e8edf5]">Credibility Score:</strong> 0 to 100 benchmark evaluating factual citations, tone bias, and verifiable claims.</li>
                    <li><strong className="text-[#e8edf5]">Sensitivity Rating:</strong> Identifies PII, confidential identifiers, hate speech, and sensitive cyber disclosures.</li>
                    <li><strong className="text-[#e8edf5]">Export Capabilities:</strong> Generate cryptographically sealed PDF reports or CSV audit trails from History.</li>
                  </ul>
                </div>
              )}

              {helpTab === 'vault' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-[#e8edf5] text-base flex items-center gap-2">
                    <Lock className="w-4 h-4 text-violet-400" />
                    DigiKeeper — Secure Document Vault
                  </h4>
                  <p>
                    DigiKeeper stores your sensitive files with zero-trust envelope cryptography.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li><strong className="text-[#e8edf5]">AES-256-GCM Encryption:</strong> Each document is encrypted with a distinct cryptographic key prior to disk write.</li>
                    <li><strong className="text-[#e8edf5]">Authenticated Decryption:</strong> Downloads require ownership verification and real-time key decryption.</li>
                    <li><strong className="text-[#e8edf5]">Cryptographic Shredding:</strong> Deleting a file permanently destroys the file record and its initialization vectors.</li>
                  </ul>
                </div>
              )}

              {helpTab === 'cubbis' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-[#e8edf5] text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Cubbis — AI Cyber Assistant
                  </h4>
                  <p>
                    Cubbis is your on-demand cyber intelligence specialist, powered by Google Gemini with dual-language Hindi & English proficiency.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li><strong className="text-[#e8edf5]">Incident Triage:</strong> Ask Cubbis how to respond to phishing emails, suspicious APKs, or compromised credentials.</li>
                    <li><strong className="text-[#e8edf5]">Markdown Rendering:</strong> Code snippets, tables, checklists, and bulleted incident workflows format automatically.</li>
                    <li><strong className="text-[#e8edf5]">Session Memory:</strong> Switch between conversation threads or clear history with persistent Oracle database storage.</li>
                  </ul>
                </div>
              )}

              {helpTab === 'account' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-[#e8edf5] text-base flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Account Security & Session Hygiene
                  </h4>
                  <p>
                    Best practices to keep your Sentinel account and organization secure.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li><strong className="text-[#e8edf5]">Password Rotation:</strong> Update passwords periodically using the 5-point strength checklist.</li>
                    <li><strong className="text-[#e8edf5]">Session Auditing:</strong> Inspect your Previous Login timestamp to detect unauthorized access attempts.</li>
                    <li><strong className="text-[#e8edf5]">Logout Enforcement:</strong> Always log out when leaving public or shared workstations.</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#1e2d4f] flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setActiveSupportModal(null)}
              >
                Close Guide
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Rate & Review ─────────────────────────────────────────── */}
      {activeSupportModal === 'review' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#131d35] border border-[#1e2d4f] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2d4f]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#e8edf5] text-base">Rate SOR SENTINEL</h3>
                  <p className="text-xs text-[#8fa3bf]">Your rating strengthens platform resilience</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSupportModal(null)}
                className="p-1 rounded-lg text-[#8fa3bf] hover:text-[#e8edf5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Rating Selector */}
              <div className="flex flex-col items-center justify-center py-2 space-y-2">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 rounded-lg transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          (hoverRating || rating) >= star
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-[#4a6180]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-semibold text-amber-300">
                  {ratingDescriptions[hoverRating || rating]}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8fa3bf] uppercase tracking-wider mb-1.5">
                  Review & Comments (Optional)
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience using SOR SENTINEL for threat analysis..."
                  rows={4}
                  className="w-full bg-[#0f1629] border border-[#1e2d4f] rounded-lg p-3 text-sm text-[#e8edf5] placeholder:text-[#4a6180] focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1e2d4f]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSupportModal(null)}
                  disabled={submittingReview}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submittingReview}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Submit Review
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Send Feedback ─────────────────────────────────────────── */}
      {activeSupportModal === 'feedback' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#131d35] border border-[#1e2d4f] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2d4f]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#e8edf5] text-base">Direct Sentinel Feedback</h3>
                  <p className="text-xs text-[#8fa3bf]">Submit feedback to the engineering & security team</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSupportModal(null)}
                className="p-1 rounded-lg text-[#8fa3bf] hover:text-[#e8edf5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8fa3bf] uppercase tracking-wider mb-1.5">
                  Feedback Category
                </label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full bg-[#0f1629] border border-[#1e2d4f] rounded-lg px-3 py-2 text-sm text-[#e8edf5] focus:outline-none focus:border-cyan-500"
                >
                  <option value="Bug Report">Bug Report</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="User Experience (UX)">User Experience (UX)</option>
                  <option value="Security Suggestion">Security Suggestion</option>
                  <option value="General Feedback">General Feedback</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8fa3bf] uppercase tracking-wider mb-1.5">
                  Your Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Describe your suggestion or issue in detail..."
                  rows={4}
                  required
                  className="w-full bg-[#0f1629] border border-[#1e2d4f] rounded-lg p-3 text-sm text-[#e8edf5] placeholder:text-[#4a6180] focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1e2d4f]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSupportModal(null)}
                  disabled={submittingFeedback}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submittingFeedback}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Send Feedback
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 4: Privacy & Security Policy ─────────────────────────────── */}
      {activeSupportModal === 'privacy' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#131d35] border border-[#1e2d4f] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2d4f]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#e8edf5] text-base">Privacy & Cryptographic Architecture</h3>
                  <p className="text-xs text-[#8fa3bf]">Enterprise zero-trust defense specifications</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSupportModal(null)}
                className="p-1 rounded-lg text-[#8fa3bf] hover:text-[#e8edf5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#8fa3bf] leading-relaxed">
              <div className="p-3 rounded-lg bg-[#0f1629] border border-[#1e2d4f] space-y-1">
                <strong className="text-[#e8edf5] block text-sm flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  AES-256-GCM Envelope Encryption
                </strong>
                <p>
                  All vault artifacts inside DigiKeeper are protected with hardware-accelerated AES-256-GCM authenticated encryption. Each payload utilizes an ephemeral initialization vector (IV) and a 128-bit authentication tag to prevent ciphertext tampering.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0f1629] border border-[#1e2d4f] space-y-1">
                <strong className="text-[#e8edf5] block text-sm flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-violet-400" />
                  Oracle Database 21c XE Isolation
                </strong>
                <p>
                  Telemetry, analysis records, and user tables are persisted strictly within an isolated Oracle XE pluggable database (`XEPDB1`). Multi-tenant data segregation is enforced at the query level via deterministic user ID bindings.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0f1629] border border-[#1e2d4f] space-y-1">
                <strong className="text-[#e8edf5] block text-sm flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  Bcrypt Hashing & JWT Token Lifecycle
                </strong>
                <p>
                  Passphrases are salted and hashed using bcrypt with work factor 12. Authentication uses short-lived HS256 JWT access tokens paired with secure refresh tokens to minimize replay attack vectors.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0f1629] border border-[#1e2d4f] space-y-1">
                <strong className="text-[#e8edf5] block text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Zero Telemetry Monetization
                </strong>
                <p>
                  SOR SENTINEL does not sell, license, or transmit user analyses, prompt histories, or vault files to third-party advertising networks. Data remains your sovereign organizational property.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1e2d4f] flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setActiveSupportModal(null)}
              >
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 5: About SOR SENTINEL ────────────────────────────────────── */}
      {activeSupportModal === 'about' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#131d35] border border-[#1e2d4f] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2d4f]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#e8edf5] text-base">About SOR SENTINEL</h3>
                  <p className="text-xs text-[#8fa3bf]">AI-Powered Threat Intelligence Platform</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSupportModal(null)}
                className="p-1 rounded-lg text-[#8fa3bf] hover:text-[#e8edf5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#8fa3bf]">
              <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 to-violet-950/40 border border-cyan-500/30 text-center space-y-1">
                <div className="text-base font-extrabold text-[#e8edf5] font-mono tracking-wider">
                  SOR SENTINEL // v1.0.0
                </div>
                <div className="text-[11px] text-cyan-300 font-mono">
                  Enterprise Cyber Defense & Misinformation Sensor
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between py-1.5 border-b border-[#1e2d4f]">
                  <span>Frontend Architecture</span>
                  <span className="text-[#e8edf5] font-mono">React 18 + TypeScript + Vite</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#1e2d4f]">
                  <span>Backend Architecture</span>
                  <span className="text-[#e8edf5] font-mono">Python 3.12 + FastAPI + SQLAlchemy</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#1e2d4f]">
                  <span>Primary Database</span>
                  <span className="text-[#e8edf5] font-mono">Oracle Database 21c XE (python-oracledb)</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#1e2d4f]">
                  <span>AI Core Engine</span>
                  <span className="text-[#e8edf5] font-mono">OpenRouter + Google Gemini</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#1e2d4f]">
                  <span>Build Status</span>
                  <span className="text-emerald-400 font-mono">Production Release (Active)</span>
                </div>
              </div>

              <p className="text-[11px] text-[#4a6180] leading-relaxed pt-2">
                Designed and engineered for cybersecurity operations, source verification, threat mitigation, and encrypted document stewardship.
              </p>
            </div>

            <div className="pt-2 border-t border-[#1e2d4f] flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setActiveSupportModal(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Remove Profile Picture Confirmation ─────────────────────── */}
      {showRemoveAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#131d35] border border-[#1e2d4f] rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-[#e8edf5] text-base">Remove Profile Picture?</h3>
                <p className="text-xs text-[#8fa3bf]">Restore default initials avatar</p>
              </div>
            </div>

            <p className="text-sm text-[#e8edf5] leading-relaxed">
              Are you sure you want to remove your custom profile picture? This action will revert your profile avatar to the default monogram.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRemoveAvatarModal(false)}
                disabled={avatarLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmRemoveAvatar}
                loading={avatarLoading}
              >
                Remove Picture
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Logout Confirmation ─────────────────────────────────────── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#131d35] border border-[#1e2d4f] rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-[#e8edf5] text-base">Confirm Session Logout</h3>
                <p className="text-xs text-[#8fa3bf]">Identity Enclave Session</p>
              </div>
            </div>

            <p className="text-sm text-[#e8edf5] leading-relaxed">
              Are you sure you want to log out of SOR SENTINEL? Your current cryptographic session token will be cleared.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleLogoutConfirm}
              >
                Confirm Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
