// SOR SENTINEL — Core TypeScript Types

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'user' | 'admin';
  is_active: boolean;
  is_verified?: boolean;
  avatar_url?: string;
  created_at: string;
  last_login_at?: string;
  previous_login_at?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface SignupInitiateResponse {
  requires_verification: boolean;
  email: string;
  message: string;
}

export interface VerifyResetOtpResponse {
  reset_token: string;
  message: string;
}

export interface AnalysisFinding {
  id: number;
  analysis_id?: number;
  finding_type: 'credibility_concern' | 'misleading_indicator' | 'sensitive_content' | 'recommendation' | string;
  category?: string;
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | string;
  confidence?: 'low' | 'medium' | 'high' | string;
  confidence_level?: number;
  evidence?: string;
  created_at: string;
}

export interface SourceReference {
  id: number;
  analysis_id?: number;
  title?: string;
  url?: string;
  description?: string;
  relevance?: string;
  reference_type?: string;
  created_at: string;
}

export type AssessmentType =
  | 'Likely Credible'
  | 'Potentially Misleading'
  | 'Requires Verification'
  | 'Contains Sensitive Content'
  | 'Insufficient Information'
  | string;

export type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed' | string;
export type AnalysisType = 'text' | 'url' | string;

export interface Analysis {
  id: number;
  user_id: number;
  analysis_type: AnalysisType;
  input_text?: string;
  text_content?: string;
  input_url?: string;
  url_analyzed?: string;
  status: AnalysisStatus;
  overall_assessment?: AssessmentType;
  summary?: string;
  credibility_score?: number;
  sensitivity_level?: SensitivityLevel;
  uncertainty_note?: string;
  evidence_limitations?: string[];
  ai_model_used?: string;
  processing_time_ms?: number;
  error_message?: string;
  error_code?: string;
  request_id?: string;
  created_at: string;
  updated_at: string;
  findings: AnalysisFinding[];
  source_references: SourceReference[];
}

export type AnalysisResponse = Analysis;

export interface AnalysisSummary {
  id: number;
  analysis_type: AnalysisType;
  input_url?: string;
  input_text_preview?: string;
  input_preview?: string;
  status: AnalysisStatus;
  overall_assessment?: AssessmentType;
  credibility_score?: number;
  sensitivity_level?: SensitivityLevel;
  created_at: string;
}

export interface PaginatedAnalyses {
  items: AnalysisSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DashboardSummary {
  total_analyses: number;
  text_analyses: number;
  url_analyses: number;
  completed_analyses: number;
  failed_analyses: number;
  recent_analyses: RecentAnalysisItem[];
  assessment_distribution: Record<string, number>;
  sensitivity_distribution: Record<string, number>;
}

export interface RecentAnalysisItem {
  id: number;
  analysis_type: AnalysisType;
  overall_assessment?: AssessmentType;
  credibility_score?: number;
  sensitivity_level?: SensitivityLevel;
  created_at: string;
  status: AnalysisStatus;
}

export interface ActivityDataPoint {
  date: string;
  count: number;
  label?: string;
}

export interface DashboardActivity {
  data: ActivityDataPoint[];
  period_days: number;
  view?: 'daily' | 'weekly' | 'monthly' | string;
}

export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ApiError {
  detail: string;
  errors?: Array<{ field: string; message: string }>;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// ── Admin Types ───────────────────────────────────────────────────────────────
export interface AdminOverview {
  total_users: number;
  active_users: number;
  total_analyses: number;
  analyses_today: number;
  pending_messages: number;
  db_status: string;
  ai_status: string;
}

export interface AdminUserListItem {
  id: number;
  full_name: string;
  email: string;
  role: 'user' | 'admin' | string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
  analysis_count: number;
}

export interface AdminAnalysesItem {
  id: number;
  user_id: number;
  analysis_type: string;
  status: string;
  overall_assessment?: string;
  credibility_score?: number;
  sensitivity_level?: string;
  created_at: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  user_id?: number;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  created_at: string;
}

// ── DigiKeeper Types ─────────────────────────────────────────────────────────
export type DocumentCategory =
  | 'Aadhaar'
  | 'PAN'
  | 'Certificates'
  | 'Marksheets'
  | 'Personal PDFs'
  | 'Other';

export interface DigiKeeperDocument {
  id: number;
  owner_user_id: number;
  original_filename: string;
  category: DocumentCategory | string;
  title?: string;
  mime_type: string;
  file_size: number;
  sha256_hash: string;
  encryption_version: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  items: DigiKeeperDocument[];
  total: number;
  categories: Record<string, number>;
}

export interface DocumentUploadResponse {
  message: string;
  document: DigiKeeperDocument;
}

export interface DocumentDeleteResponse {
  message: string;
  deleted_id: number;
}

// ── Cubbis AI Cyber Assistant Types ──────────────────────────────────────────
export interface CubbisMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  model_used?: string;
  created_at: string;
}

export interface CubbisConversation {
  id: number;
  title: string;
  language: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface CubbisConversationDetail {
  id: number;
  title: string;
  language: string;
  created_at: string;
  updated_at: string;
  messages: CubbisMessage[];
}

export interface CubbisChatRequest {
  message: string;
  conversation_id?: number;
  language?: 'en' | 'hi';
  analysis_context?: string;
}

export interface CubbisChatResponse {
  conversation_id: number;
  message_id: number;
  role: string;
  content: string;
  model_used?: string;
  created_at?: string;
}

export interface CubbisConversationListResponse {
  items: CubbisConversation[];
  total: number;
}

export interface CubbisDeleteResponse {
  message: string;
  deleted_id?: number;
}
