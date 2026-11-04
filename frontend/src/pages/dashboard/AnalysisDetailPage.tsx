// SOR SENTINEL — Individual Threat Analysis Detail Page
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { analysisApi, extractErrorMessage } from '@/services/api';
import type { AnalysisResponse } from '@/types';
import AnalysisResultPanel from '@/components/analysis/AnalysisResultPanel';
import {
  ArrowLeft, Trash2, AlertCircle, Shield, FileText, Globe,
  Download, Printer, Share2, Check, Clock, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/index';
import toast from 'react-hot-toast';

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    analysisApi.getAnalysis(Number(id))
      .then((res) => setAnalysis(res.data))
      .catch((err) => setError(extractErrorMessage(err) || 'Analysis record not found or inaccessible.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await analysisApi.deleteAnalysis(Number(id));
      toast.success('Analysis record deleted from enclave.');
      navigate('/dashboard/history');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    toast.success('Dossier link copied to clipboard');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-16">
      {/* ── Breadcrumb & Navigation Bar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2 text-xs font-mono text-[#8fa3bf]">
          <Link
            to="/dashboard/history"
            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Investigation History</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-[#4a6180]" />
          <span className="text-[#e8edf5] font-semibold">
            Dossier #TR-{String(id).padStart(5, '0')}
          </span>
        </div>

        {analysis && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              leftIcon={copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            >
              {copiedLink ? 'Copied' : 'Share'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              className="hidden sm:inline-flex"
            >
              Print Dossier
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-400 hover:text-red-300 hover:border-red-500/40"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* ── Loading Skeleton ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-6">
          <Card className="p-6 h-28 flex items-center justify-center">
            <div className="flex items-center gap-3 text-cyan-400 text-sm font-mono">
              <span className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>Decrypting & loading threat dossier from Oracle XE...</span>
            </div>
          </Card>
        </div>
      )}

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      {!loading && error && (
        <Card className="p-6 border-red-500/30 bg-red-950/20 space-y-3">
          <div className="flex items-start gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-red-300 text-base">Record Retrieval Error</h3>
              <p className="text-sm text-red-200/90">{error}</p>
            </div>
          </div>
          <div className="pt-2">
            <Link to="/dashboard/history">
              <Button size="sm" variant="secondary" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
                Return to History
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ── Analysis Result Presentation ─────────────────────────────────────── */}
      {!loading && analysis && (
        <AnalysisResultPanel analysis={analysis} />
      )}

      {/* ── Delete Confirmation Dialog ───────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#131d35] border border-[#1e2d4f] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-[#e8edf5] text-base">Delete Analysis Record?</h3>
                <p className="text-xs text-[#8fa3bf]">Irreversible Enclave Action</p>
              </div>
            </div>

            <p className="text-sm text-[#e8edf5] leading-relaxed">
              Are you sure you want to permanently delete Analysis <strong>#{id}</strong>? The record and all related threat findings will be purged from the database.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                loading={deleting}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
