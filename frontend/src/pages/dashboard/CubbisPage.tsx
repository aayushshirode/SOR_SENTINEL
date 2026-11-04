// SOR SENTINEL — Cubbis AI Cyber Assistant Page
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cubbisApi, extractErrorMessage } from '../../services/api';
import type {
  CubbisMessage,
  CubbisConversation,
  CubbisChatResponse,
} from '../../types';
import {
  Bot,
  Sparkles,
  Send,
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  Shield,
  ShieldAlert,
  Globe,
  MessageSquare,
  KeyRound,
  FileSearch,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AssistantMarkdownMessageProps {
  content: string;
}

const isSafeUrl = (url?: string): boolean => {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return false;
  }
  return true;
};

const AssistantMarkdownMessage: React.FC<AssistantMarkdownMessageProps> = React.memo(({ content }) => {
  return (
    <div className="markdown-content font-plex text-xs sm:text-sm leading-relaxed text-slate-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            if (!isSafeUrl(href)) {
              return (
                <span
                  className="text-slate-400 underline decoration-dotted cursor-not-allowed font-plex"
                  title="Link blocked for security"
                >
                  {children}
                </span>
              );
            }
            const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium transition-colors break-words font-plex"
                {...props}
              >
                {children}
              </a>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-base sm:text-lg font-bold text-white mt-3.5 mb-2 pb-1 border-b border-[#1e2d4f] font-space">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm sm:text-base font-bold text-cyan-300 mt-3 mb-1.5 font-space">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-semibold text-white mt-2.5 mb-1 font-space">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold text-slate-200 mt-2 mb-1 font-space">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 leading-relaxed text-slate-200 break-words font-plex">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-300">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-2.5 space-y-1 text-slate-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-2.5 space-y-1 text-slate-200">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cyan-500/60 pl-3 my-2.5 text-slate-300 italic bg-cyan-500/5 py-1.5 rounded-r">
              {children}
            </blockquote>
          ),
          pre: ({ children, ...props }) => (
            <pre
              className="p-3.5 rounded-xl bg-[#0a101d] border border-[#1e2d4f] overflow-x-auto my-2.5 text-xs font-mono text-cyan-200 scrollbar-thin"
              {...props}
            >
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }: React.ComponentPropsWithoutRef<'code'>) => {
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = match || (typeof children === 'string' && children.includes('\n'));
            if (isBlock) {
              return (
                <code className={`${className || ''} font-mono text-xs`} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-[#0a101d] border border-[#1e2d4f] text-cyan-300 font-mono text-[11px] sm:text-xs break-all"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-[#1e2d4f]">
              <table className="w-full text-left text-xs border-collapse divide-y divide-[#1e2d4f]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#0f1629] text-[#e8edf5] font-semibold">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#1e2d4f]/60 bg-[#131d35]/40 text-slate-300">
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold text-white tracking-wider border-b border-[#1e2d4f]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-[#1e2d4f]/60 text-slate-300 whitespace-normal">
              {children}
            </td>
          ),
          hr: () => <hr className="border-[#1e2d4f] my-3" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

AssistantMarkdownMessage.displayName = 'AssistantMarkdownMessage';

const QUICK_PROMPTS = [
  {
    icon: <FileSearch className="w-4 h-4 text-cyan-400" />,
    label: 'Explain a suspicious message',
    prompt: 'I received a suspicious SMS/message asking me to click a link to update my bank KYC immediately or my account will be blocked. Can you analyze what tactics are being used and what I should do?',
  },
  {
    icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
    label: 'How can I recognize phishing?',
    prompt: 'What are the top telltale signs of a phishing email or website, and how can I distinguish authentic communications from fake ones?',
  },
  {
    icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
    label: 'What should I do if my account is hacked?',
    prompt: 'I suspect my email or social media account has been compromised. What are the immediate emergency incident response steps I must take right now?',
  },
  {
    icon: <KeyRound className="w-4 h-4 text-emerald-400" />,
    label: 'How do I create strong passwords?',
    prompt: 'What makes a password practically uncrackable, and what are the best practices for using passphrases and password managers securely?',
  },
  {
    icon: <UserCheck className="w-4 h-4 text-purple-400" />,
    label: 'How can I protect my personal info?',
    prompt: 'How can I prevent identity theft and keep sensitive documents like Aadhaar, PAN, SSN, and financial records safe online?',
  },
];

export default function CubbisPage() {
  const [conversations, setConversations] = useState<CubbisConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<CubbisMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Clear modal states
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [conversationToDelete, setConversationToDelete] = useState<CubbisConversation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load user conversation list
  const loadConversations = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const res = await cubbisApi.listConversations();
      setConversations(res.data.items || []);
    } catch {
      // Silent catch on history load
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load specific conversation messages
  const selectConversation = async (convId: number) => {
    setCurrentConversationId(convId);
    setErrorMessage(null);
    setLastFailedMessage(null);
    try {
      const res = await cubbisApi.getConversation(convId);
      setMessages(res.data.messages || []);
      if (res.data.language === 'hi' || res.data.language === 'en') {
        setLanguage(res.data.language);
      }
    } catch (err) {
      toast.error('Failed to load conversation: ' + extractErrorMessage(err));
    }
  };

  // Start a fresh conversation
  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setInputMessage('');
    setErrorMessage(null);
    setLastFailedMessage(null);
    textareaRef.current?.focus();
  };

  // Submit message
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputMessage;
    const trimmed = rawText.trim();
    if (!trimmed || isLoading) return;

    // Optimistic UI: display user message immediately
    const tempUserMsg: CubbisMessage = {
      id: Date.now(),
      conversation_id: currentConversationId || 0,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputMessage('');
    setIsLoading(true);
    setErrorMessage(null);
    setLastFailedMessage(null);

    try {
      const res = await cubbisApi.chat({
        message: trimmed,
        conversation_id: currentConversationId || undefined,
        language: language,
      });

      const assistantMsg: CubbisMessage = {
        id: res.data.message_id,
        conversation_id: res.data.conversation_id,
        role: 'assistant',
        content: res.data.content,
        model_used: res.data.model_used,
        created_at: res.data.created_at || new Date().toISOString(),
      };

      // Set active conversation ID and append assistant message
      if (!currentConversationId) {
        setCurrentConversationId(res.data.conversation_id);
      }
      setMessages((prev) => [...prev, assistantMsg]);
      // Refresh conversation list in sidebar
      loadConversations();
    } catch (err) {
      const msg = extractErrorMessage(err);
      setErrorMessage(msg);
      setLastFailedMessage(trimmed);
      toast.error('Cubbis AI response error: ' + msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Retry last failed prompt
  const handleRetry = () => {
    if (lastFailedMessage) {
      // Remove temporary failing user message from view if exists
      setMessages((prev) => prev.slice(0, -1));
      handleSendMessage(lastFailedMessage);
    }
  };

  // Handle Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Copy message content
  const handleCopy = (content: string, id: number) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Delete single conversation
  const handleDeleteConversation = async (convId: number) => {
    try {
      await cubbisApi.deleteConversation(convId);
      toast.success('Conversation deleted');
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (currentConversationId === convId) {
        handleNewChat();
      }
      setConversationToDelete(null);
    } catch (err) {
      toast.error('Delete failed: ' + extractErrorMessage(err));
    }
  };

  // Clear all conversations
  const handleClearAllHistory = async () => {
    try {
      await cubbisApi.clearHistory();
      toast.success('All conversation history cleared');
      setConversations([]);
      handleNewChat();
      setShowClearConfirm(false);
    } catch (err) {
      toast.error('Failed to clear history: ' + extractErrorMessage(err));
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] max-w-7xl mx-auto rounded-2xl overflow-hidden border border-[#1e2d4f] bg-[#0a0f1a] text-[#e8edf5]">
      {/* ── Left Sidebar / Conversation History ──────────────────────────── */}
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-200 ease-in-out shrink-0 bg-[#0f1629] border-r border-[#1e2d4f] flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-[#1e2d4f] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Bot className="w-5 h-5" />
            </div>
            <span className="font-bold text-white text-sm tracking-wide">Cubbis History</span>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#0a1120] font-semibold text-xs transition-colors shadow-sm"
            title="Start new chat"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {isHistoryLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-[#131d35] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-cyan-400" />
              No saved conversations yet. Start a new cybersecurity chat below!
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`group flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  currentConversationId === c.id
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-300 hover:bg-[#131d35] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-cyan-400" />
                  <span className="truncate font-medium">{c.title || 'Conversation'}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConversationToDelete(c);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Clear All History footer */}
        {conversations.length > 0 && (
          <div className="p-3 border-t border-[#1e2d4f]">
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All History
            </button>
          </div>
        )}
      </div>

      {/* ── Main Chat Area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0f1a]">
        {/* Header Bar */}
        <div className="h-16 px-4 sm:px-6 border-b border-[#1e2d4f] flex items-center justify-between bg-[#0f1629]/90 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title={sidebarOpen ? 'Close sidebar' : 'Open history sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight font-space">Cubbis</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-rajdhani font-bold uppercase tracking-wider">
                  AI CYBER ASSISTANT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-plex">
                Interactive threat education, incident response, and cybersecurity triage
              </p>
            </div>
          </div>

          {/* Language Switcher Pill */}
          <div className="flex items-center gap-2 font-outfit">
            <div className="flex items-center p-1 rounded-lg bg-[#131d35] border border-[#1e2d4f]">
              <Globe className="w-3.5 h-3.5 text-slate-400 mx-1.5" />
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded text-xs font-outfit font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-cyan-500 text-[#0a1120] font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-2 py-0.5 rounded text-xs font-outfit font-medium transition-colors ${
                  language === 'hi'
                    ? 'bg-cyan-500 text-[#0a1120] font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                हिंदी
              </button>
            </div>

            <button
              onClick={handleNewChat}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors sm:hidden"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin">
          {messages.length === 0 ? (
            /* Landing Screen / Welcome View */
            <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
              <div className="inline-flex p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10">
                <Bot className="w-12 h-12" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {language === 'hi' ? 'नमस्ते! मैं Cubbis हूँ' : 'Welcome to Cubbis AI Cyber Assistant'}
                </h3>
                <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
                  {language === 'hi'
                    ? 'आपका व्यक्तिगत साइबर सुरक्षा सहायक। मैं आपको फ़िशिंग, संदिग्ध संदेशों, धोखाधड़ी और खाते की सुरक्षा से संबंधित व्यावहारिक समाधान प्रदान करता हूँ।'
                    : 'Your personal cybersecurity education and incident response companion. Ask about suspicious messages, fake links, account recovery, or security hygiene.'}
                </p>
              </div>

              {/* Quick Prompts Grid */}
              <div className="pt-2 text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
                  {language === 'hi' ? 'सुझाए गए विषय (क्लिक करें):' : 'Suggested Security Queries:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {QUICK_PROMPTS.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(qp.prompt)}
                      className="p-3 rounded-xl bg-[#131d35] border border-[#1e2d4f] hover:border-cyan-500/40 hover:bg-[#162340] text-left transition-all duration-150 flex items-start gap-2.5 group shadow-sm"
                    >
                      <span className="p-1.5 rounded-lg bg-black/20 shrink-0 mt-0.5">{qp.icon}</span>
                      <div>
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors block">
                          {qp.label}
                        </span>
                        <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {qp.prompt}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Active Conversation Messages */
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id || i}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isUser
                          ? 'bg-cyan-500 text-[#0a1120] font-bold text-xs'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isUser ? 'YOU' : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`relative max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-cyan-500/15 border border-cyan-500/30 text-white rounded-tr-none'
                          : 'bg-[#131d35] border border-[#1e2d4f] text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                      ) : (
                        <AssistantMarkdownMessage content={msg.content} />
                      )}

                      {/* Footer Info for Assistant */}
                      {!isUser && (
                        <div className="mt-3 pt-2 border-t border-[#1e2d4f]/60 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1 font-mono text-cyan-400">
                            <Shield className="w-3 h-3" />
                            {msg.model_used || 'Gemini 3 Flash'}
                          </span>
                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-[#131d35] border border-[#1e2d4f] text-xs text-slate-400 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Cubbis is thinking & consulting cybersecurity guidelines...</span>
                  </div>
                </div>
              )}

              {/* Error Banner with Retry */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  {lastFailedMessage && (
                    <button
                      onClick={handleRetry}
                      className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-medium text-xs transition-colors shrink-0"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input Bar */}
        <div className="p-4 border-t border-[#1e2d4f] bg-[#0f1629]/70 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-2xl bg-[#131d35] border border-[#1e2d4f] focus-within:border-cyan-500/50 shadow-lg transition-colors">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  language === 'hi'
                    ? 'संदिग्ध संदेश, फ़िशिंग लिंक या साइबर सुरक्षा के बारे में पूछें... (Enter भेजें, Shift+Enter नई पंक्ति)'
                    : 'Ask about suspicious emails, fake SMS, compromised accounts, or safety tips... (Enter to send, Shift+Enter for newline)'
                }
                rows={2}
                disabled={isLoading}
                className="w-full pl-4 pr-14 py-3 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none scrollbar-none"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                className="absolute right-3 bottom-3 p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-[#0a1120] font-bold transition-all duration-150 shadow-md shadow-cyan-500/20"
                title="Send message"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 mt-1.5">
              <span>
                {language === 'hi'
                  ? 'Cubbis AI शैक्षिक सुरक्षा सलाह देता है। महत्वपूर्ण खातों में दो-चरणीय सत्यापन (2FA) ऑन रखें।'
                  : 'Cubbis offers educational cybersecurity advice. Always enable 2FA on critical accounts.'}
              </span>
              <span className="hidden sm:inline">Shift + Enter for new line</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Clear All History Confirmation ────────────────────────── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0f1629] border border-red-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/10 text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Clear All History?</h4>
                <p className="text-xs text-slate-400">All saved conversations will be permanently wiped.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllHistory}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Single Conversation Confirmation ────────────────── */}
      {conversationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0f1629] border border-red-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/10 text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Delete Conversation?</h4>
                <p className="text-xs text-slate-400 truncate max-w-[200px]">
                  "{conversationToDelete.title}"
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConversationToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConversation(conversationToDelete.id)}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
