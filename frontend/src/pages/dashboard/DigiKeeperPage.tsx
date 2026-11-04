// SOR SENTINEL — DigiKeeper Secure Document Vault Page
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { digikeeperApi, extractErrorMessage } from '../../services/api';
import type { DigiKeeperDocument, DocumentCategory } from '../../types';
import {
  ShieldCheck, Lock, Upload, Download, Trash2, Search,
  FileText, AlertTriangle, X, CheckCircle2, File, HardDrive, RefreshCw,
  Sparkles, Key, Check, ShieldAlert, FolderLock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/index';
import toast from 'react-hot-toast';

const CATEGORIES: DocumentCategory[] = [
  'Aadhaar',
  'PAN',
  'Certificates',
  'Marksheets',
  'Personal PDFs',
  'Other',
];

const categoryBadgeStyles: Record<string, string> = {
  Aadhaar: 'bg-blue-500/15 text-blue-400 border-blue-500/30 font-rajdhani font-bold tracking-wider uppercase',
  PAN: 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-rajdhani font-bold tracking-wider uppercase',
  Certificates: 'bg-purple-500/15 text-purple-400 border-purple-500/30 font-rajdhani font-bold tracking-wider uppercase',
  Marksheets: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-rajdhani font-bold tracking-wider uppercase',
  'Personal PDFs': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-rajdhani font-bold tracking-wider uppercase',
  Other: 'bg-white/5 text-[#8fa3bf] border-[#1e2d4f] font-rajdhani font-bold tracking-wider uppercase',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  if (!iso) return 'Just now';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function DigiKeeperPage() {
  const [documents, setDocuments] = useState<DigiKeeperDocument[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('Aadhaar');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete modal state
  const [documentToDelete, setDocumentToDelete] = useState<DigiKeeperDocument | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Downloading indicator
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await digikeeperApi.list({
        category: selectedCategory || undefined,
        search: searchQuery.trim() || undefined,
        sort_by: sortBy || 'date',
        sort_order: sortOrder,
      });
      setDocuments(res.data.items || []);
      setTotalCount(res.data.total || 0);
      setCategoryCounts(res.data.categories || {});
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a document file (.pdf, .png, .jpg, .jpeg).');
      return;
    }

    const ext = uploadFile.name.substring(uploadFile.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.png', '.jpg', '.jpeg'].includes(ext)) {
      setUploadError('Only PDF, PNG, and JPEG files are supported.');
      return;
    }

    if (uploadFile.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds 25 MB limit.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      await digikeeperApi.upload(uploadFile, uploadCategory, uploadTitle);
      toast.success('Document encrypted (AES-256-GCM) and committed to Oracle BLOB storage.');
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadCategory('Aadhaar');
      fetchDocuments();
    } catch (err) {
      setUploadError(extractErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  // Handle Download
  const handleDownload = async (doc: DigiKeeperDocument) => {
    setDownloadingId(doc.id);
    try {
      await digikeeperApi.download(doc.id, doc.original_filename);
      toast.success(`Decrypted and downloaded: ${doc.original_filename}`);
    } catch (err) {
      toast.error(`Download failed: ${extractErrorMessage(err)}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;
    setDeleting(true);
    try {
      await digikeeperApi.delete(documentToDelete.id);
      toast.success('Document ciphertext purged permanently from database.');
      setDocumentToDelete(null);
      fetchDocuments();
    } catch (err) {
      toast.error(`Delete failed: ${extractErrorMessage(err)}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-16">
      {/* ── 1. Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <FolderLock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-[#e8edf5] tracking-tight font-space">
                DigiKeeper Vault
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#8fa3bf] mt-0.5 font-plex">
              Zero-disk envelope encryption and authenticated database storage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto font-outfit">
          <button
            onClick={() => fetchDocuments()}
            className="p-2.5 rounded-xl bg-[#131d35] border border-[#1e2d4f] text-[#8fa3bf] hover:text-[#e8edf5] hover:bg-white/5 transition-colors font-outfit"
            title="Refresh Vault Contents"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setUploadError('');
              setIsUploadOpen(true);
            }}
            leftIcon={<Upload className="w-4 h-4" />}
            className="shadow-lg shadow-cyan-500/20 font-outfit"
          >
            Deposit Document
          </Button>
        </div>
      </div>

      {/* ── 2. Category Filter Tabs & Search Console ─────────────────────────── */}
      <div className="space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === ''
                ? 'bg-cyan-500 text-[#0a0f1a] border-cyan-400 shadow-sm shadow-cyan-500/20'
                : 'bg-[#131d35] text-[#8fa3bf] border-[#1e2d4f] hover:text-[#e8edf5] hover:bg-white/5'
            }`}
          >
            <span>All Documents</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              selectedCategory === '' ? 'bg-[#0a0f1a]/30 text-[#0a0f1a] font-bold' : 'bg-white/10 text-[#8fa3bf]'
            }`}>
              {totalCount}
            </span>
          </button>

          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat] || 0;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? '' : cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-500 text-[#0a0f1a] border-cyan-400 shadow-sm shadow-cyan-500/20'
                    : 'bg-[#131d35] text-[#8fa3bf] border-[#1e2d4f] hover:text-[#e8edf5] hover:bg-white/5'
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-[#0a0f1a]/30 text-[#0a0f1a] font-bold' : 'bg-white/10 text-[#8fa3bf]'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Sort Bar */}
        <Card className="p-3 border-[#1e2d4f] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#4a6180] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search filename or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#0a0f1a] border border-[#1e2d4f] text-[#e8edf5] placeholder-[#4a6180] focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end font-mono text-xs">
            <span className="text-[#8fa3bf]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size')}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[#0a0f1a] border border-[#1e2d4f] text-cyan-400 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="date">Upload Date</option>
              <option value="name">Filename</option>
              <option value="size">File Size</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-[#0a0f1a] border border-[#1e2d4f] text-cyan-400 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </Card>
      </div>

      {/* ── 4. Document Grid / List ─────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5 border-[#1e2d4f] animate-pulse space-y-3">
              <div className="h-5 bg-[#1e2d4f] rounded w-2/3"></div>
              <div className="h-4 bg-[#1e2d4f]/60 rounded w-1/3"></div>
              <div className="h-10 bg-[#1e2d4f]/40 rounded"></div>
            </Card>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="p-12 text-center border-[#1e2d4f] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#e8edf5]">Your secure vault is empty</h3>
            <p className="text-xs text-[#8fa3bf] mt-1 max-w-md mx-auto leading-relaxed">
              {searchQuery || selectedCategory
                ? 'No documents matched your active category or search query. Try resetting filters.'
                : 'Deposit your Aadhaar, PAN card, educational credentials, and sensitive PDFs securely with hardware-accelerated AES-256-GCM encryption.'}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Deposit First Document
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const isPdf = doc.mime_type.includes('pdf') || doc.original_filename.toLowerCase().endsWith('.pdf');
            const badgeStyle = categoryBadgeStyles[doc.category] || categoryBadgeStyles.Other;
            const isThisDownloading = downloadingId === doc.id;

            return (
              <Card
                key={doc.id}
                className="p-5 border-[#1e2d4f] hover:border-cyan-500/40 transition-all flex flex-col justify-between group shadow-lg space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${isPdf ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                        {isPdf ? <FileText className="w-5 h-5" /> : <File className="w-5 h-5" />}
                      </div>
                      <div className="truncate">
                        <h4 className="text-sm font-bold text-[#e8edf5] truncate group-hover:text-cyan-300 transition-colors" title={doc.title || doc.original_filename}>
                          {doc.title || doc.original_filename}
                        </h4>
                        <p className="text-[11px] font-mono text-[#4a6180] truncate" title={doc.original_filename}>
                          {doc.original_filename}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border whitespace-nowrap shrink-0 ${badgeStyle}`}>
                      {doc.category}
                    </span>
                  </div>

                  {/* Metadata telemetry */}
                  <div className="space-y-1.5 py-3 border-y border-[#1e2d4f] text-xs font-mono">
                    <div className="flex justify-between text-[#8fa3bf]">
                      <span>Size:</span>
                      <span className="text-[#e8edf5] font-semibold">{formatBytes(doc.file_size)}</span>
                    </div>
                    <div className="flex justify-between text-[#8fa3bf]">
                      <span>Deposited:</span>
                      <span className="text-[#e8edf5]">{formatDate(doc.created_at)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#8fa3bf]">
                      <span>SHA-256:</span>
                      <span className="text-emerald-400 text-[10px] flex items-center gap-1" title={doc.sha256_hash}>
                        <ShieldCheck className="w-3 h-3" />
                        {doc.sha256_hash.substring(0, 8)}...{doc.sha256_hash.substring(56)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#8fa3bf]">
                      <span>Cipher:</span>
                      <span className="text-cyan-400 text-[10px]">{doc.encryption_version}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-1 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    disabled={isThisDownloading}
                    leftIcon={<Download className={`w-3.5 h-3.5 ${isThisDownloading ? 'animate-bounce text-cyan-400' : ''}`} />}
                    className="flex-1 text-xs"
                  >
                    {isThisDownloading ? 'Decrypting...' : 'Download'}
                  </Button>

                  <button
                    onClick={() => setDocumentToDelete(doc)}
                    className="p-2 rounded-lg text-[#8fa3bf] hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                    title="Delete permanently from vault"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── 5. Upload Document Modal ─────────────────────────────────────────── */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#0f1629] border border-[#1e2d4f] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d4f] bg-[#131d35]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#e8edf5]">Deposit to Encrypted Vault</h3>
                  <p className="text-xs text-[#8fa3bf]">Authenticated envelope encryption with AES-256-GCM</p>
                </div>
              </div>
              <button
                onClick={() => !uploading && setIsUploadOpen(false)}
                className="text-[#8fa3bf] hover:text-[#e8edf5] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* File Selection Dropzone */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#8fa3bf] mb-1.5">
                  Select Document File <span className="text-red-400">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-[#1e2d4f] hover:border-cyan-500/50 rounded-2xl p-6 text-center transition-all bg-[#0a0f1a] hover:bg-[#131d35]/40"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setUploadFile(e.target.files[0]);
                        setUploadError('');
                      }
                    }}
                  />
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-cyan-400" />
                      <div className="text-left font-mono">
                        <p className="text-sm font-bold text-[#e8edf5] truncate max-w-xs">{uploadFile.name}</p>
                        <p className="text-xs text-cyan-400">{formatBytes(uploadFile.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-[#e8edf5]">Click to browse document file</p>
                      <p className="text-xs text-[#4a6180]">Supports PDF, PNG, or JPEG up to 25 MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#8fa3bf] mb-1.5">
                  Document Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[#0a0f1a] border border-[#1e2d4f] text-[#e8edf5] focus:outline-none focus:border-cyan-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#131d35]">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#8fa3bf] mb-1.5">
                  Document Title / Identifier (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aadhaar Card 2026, University Degree Certificate"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  maxLength={150}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[#0a0f1a] border border-[#1e2d4f] text-[#e8edf5] placeholder-[#4a6180] focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#1e2d4f]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={uploading || !uploadFile}
                  loading={uploading}
                  leftIcon={<Lock className="w-4 h-4" />}
                >
                  {uploading ? 'Encrypting & Storing...' : 'Encrypt & Deposit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. Delete Confirmation Modal ─────────────────────────────────────── */}
      {documentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0f1629] border border-red-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#e8edf5]">Purge Encrypted Document?</h3>
                <p className="text-xs text-[#8fa3bf]">Irreversible Cryptographic Destruction</p>
              </div>
            </div>

            <p className="text-xs text-[#e8edf5] bg-[#131d35] p-3 rounded-xl border border-[#1e2d4f] leading-relaxed">
              Document <strong className="text-cyan-300 font-mono">{documentToDelete.title || documentToDelete.original_filename}</strong> ({documentToDelete.category}) will be deleted permanently from Oracle BLOB storage and its key initialization vectors destroyed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDocumentToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                loading={deleting}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Purge Permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
