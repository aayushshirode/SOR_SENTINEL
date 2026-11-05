// SOR SENTINEL — Cubbis AI Cyber Assistant Page (Claude-Inspired Redesign)
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cubbisApi, extractErrorMessage } from '../../services/api';
import type {
  CubbisMessage,
  CubbisConversation,
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
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Search,
  Lock,
  ArrowUp,
  RotateCcw
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

// Syntax-highlighted Code Block with Language Header and Copy Action
const CodeBlock: React.FC<{
  className?: string;
  children?: React.ReactNode;
}> = ({ className, children }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'code';
  const codeString = String(children).replace(/\n$/, '');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="cubbis-code-block my-3 rounded-xl overflow-hidden border border-[#1e2d4f] bg-[#070c17] shadow-md">
      <div className="cubbis-code-header flex items-center justify-between px-3.5 py-1.5 bg-[#0f172a] border-b border-[#1e2d4f] text-[11px] font-mono text-[#8fa3bf]">
        <span className="uppercase text-cyan-400 font-bold tracking-wider">{language}</span>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/5 text-[#8fa3bf] hover:text-white transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-cyan-200 scrollbar-thin">
        <code>{codeString}</code>
      </pre>
    </div>
  );
};

const AssistantMarkdownMessage: React.FC<AssistantMarkdownMessageProps> = React.memo(({ content }) => {
  return (
    <div className="markdown-content font-plex text-xs sm:text-sm leading-relaxed text-[#c8d6e5]">
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
            <h1 className="text-base sm:text-lg font-bold text-[#e8edf5] mt-4 mb-2 pb-1 border-b border-[#1e2d4f] font-space">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm sm:text-base font-bold text-cyan-300 mt-3.5 mb-1.5 font-space">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-semibold text-[#e8edf5] mt-3 mb-1 font-space">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold text-[#c8d6e5] mt-2 mb-1 font-space">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 leading-relaxed text-[#c8d6e5] break-words font-plex">
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
            <ul className="list-disc pl-5 mb-2.5 space-y-1 text-[#c8d6e5]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-2.5 space-y-1 text-[#c8d6e5]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cyan-500/60 pl-3 my-2.5 text-[#8fa3bf] italic bg-cyan-500/5 py-1.5 rounded-r">
              {children}
            </blockquote>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children, ...props }: React.ComponentPropsWithoutRef<'code'>) => {
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = match || (typeof children === 'string' && children.includes('\n'));
            if (isBlock) {
              return <CodeBlock className={className}>{children}</CodeBlock>;
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
            <tbody className="divide-y divide-[#1e2d4f]/60 bg-[#131d35]/40 text-[#c8d6e5]">
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold text-white tracking-wider border-b border-[#1e2d4f]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-[#1e2d4f]/60 text-[#c8d6e5] whitespace-normal">
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

// The 4 Specified Suggested Queries
const SUGGESTED_QUERIES = [
  {
    icon: <FileSearch className="w-5 h-5 text-cyan-400" />,
    title: 'Explain a suspicious message.',
    description: 'Analyze urgency cues, fake KYC warnings, and malicious links in incoming messages.',
    prompt:
      'I received a suspicious SMS/message asking me to click a link to update my bank KYC immediately or my account will be blocked. Can you analyze what tactics are being used and what I should do?',
  },
  {
    icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
    title: 'How can I recognize phishing?',
    description: 'Detect spoofed sender addresses, suspicious domain variations, and deceptive portals.',
    prompt:
      'What are the top telltale signs of a phishing email or website, and how can I distinguish authentic communications from fake ones?',
  },
  {
    icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
    title: 'What should I do if my account is compromised?',
    description: 'Emergency incident response: credential revocation, active session termination, and recovery.',
    prompt:
      'I suspect my email or social media account has been compromised. What are the immediate emergency incident response steps I must take right now?',
  },
  {
    icon: <KeyRound className="w-5 h-5 text-emerald-400" />,
    title: 'How can I secure my online accounts?',
    description: 'Best practices for hardware 2FA, password vaults, passphrases, and account isolation.',
    prompt:
      'What are the most effective best practices to secure my online accounts, passwords, 2FA, and sensitive personal information against modern cyber threats?',
  },
];

const SUGGESTED_QUERIES_HI = [
  {
    icon: <FileSearch className="w-5 h-5 text-cyan-400" />,
    title: 'संदिग्ध संदेश का विश्लेषण करें।',
    description: 'आपातकालीन बैंक KYC और फर्जी लिंक वाले संदेशों की जांच करें।',
    prompt:
      'मुझे एक संदिग्ध संदेश मिला है जिसमें बैंक KYC तुरंत अपडेट करने के लिए कहा गया है। कृपया बताएं कि इसमें कौन सी धोखाधड़ी है और मुझे क्या करना चाहिए?',
  },
  {
    icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
    title: 'फ़िशिंग हमलों को कैसे पहचानें?',
    description: 'फर्जी वेबसाइट्स और ईमेल की पहचान करने के मुख्य तरीके।',
    prompt:
      'फ़िशिंग ईमेल या वेबसाइट के मुख्य संकेत क्या हैं, और मैं असली और नकली संदेशों में अंतर कैसे कर सकता हूँ?',
  },
  {
    icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
    title: 'यदि खाता हैक हो जाए तो क्या करें?',
    description: 'आपातकालीन कदम: पासवर्ड बदलना, सत्र समाप्त करना और खाता पुनर्प्राप्त करना।',
    prompt:
      'मुझे संदेह है कि मेरा ईमेल या सोशल मीडिया अकाउंट हैक हो गया है। मुझे तुरंत कौन से आपातकालीन कदम उठाने चाहिए?',
  },
  {
    icon: <KeyRound className="w-5 h-5 text-emerald-400" />,
    title: 'अपने ऑनलाइन खातों को कैसे सुरक्षित करें?',
    description: 'मजबूत पासवर्ड, 2FA और व्यक्तिगत डेटा सुरक्षा के सर्वोत्तम तरीके।',
    prompt:
      'आधुनिक साइबर खतरों से अपने ऑनलाइन खातों, पासवर्ड और संवेदनशील जानकारी को सुरक्षित रखने के सर्वोत्तम तरीके क्या हैं?',
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
  const [historySearch, setHistorySearch] = useState<string>('');

  // Clear modal states
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [conversationToDelete, setConversationToDelete] = useState<CubbisConversation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, []);

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

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!historySearch.trim()) return conversations;
    const q = historySearch.toLowerCase();
    return conversations.filter((c) => (c.title || 'Conversation').toLowerCase().includes(q));
  }, [conversations, historySearch]);

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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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

      if (!currentConversationId) {
        setCurrentConversationId(res.data.conversation_id);
      }
      setMessages((prev) => [...prev, assistantMsg]);
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
    toast.success('Response copied to clipboard');
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

  const queriesToDisplay = language === 'hi' ? SUGGESTED_QUERIES_HI : SUGGESTED_QUERIES;

  return (
    <div className="flex h-[calc(100vh-5rem)] max-w-7xl mx-auto rounded-2xl overflow-hidden border border-[#1e2d4f] bg-[#0a0f1a] text-[#e8edf5] shadow-2xl">
      {/* ── Left Sidebar / Collapsible Conversation History ──────────────── */}
      <div
        className={`cubbis-sidebar ${
          sidebarOpen ? 'w-72 sm:w-80' : 'w-0'
        } transition-all duration-200 ease-in-out shrink-0 bg-[#0f1629] border-r border-[#1e2d4f] flex flex-col overflow-hidden`}
      >
        {/* Sidebar Header & New Chat Button */}
        <div className="p-4 border-b border-[#1e2d4f] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Bot className="w-5 h-5" />
              </div>
              <span className="font-bold text-white text-sm tracking-wide font-space">
                Cubbis History
              </span>
            </div>
            <button
              onClick={handleNewChat}
              className="cubbis-newchat-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0a1120] font-bold text-xs transition-colors shadow-sm font-outfit"
              title="Start a new chat"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Search/Filter Conversations */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#4a6180] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chat history..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-[#0a0f1a] border border-[#1e2d4f] text-[#e8edf5] placeholder-[#4a6180] focus:outline-none focus:border-cyan-500 font-sans"
            />
            {historySearch && (
              <button
                onClick={() => setHistorySearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8fa3bf] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {isHistoryLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-[#131d35] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#8fa3bf] space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-cyan-400" />
              <p>
                {historySearch
                  ? 'No chats match your search query.'
                  : 'No saved conversations yet. Start a cybersecurity consultation!'}
              </p>
            </div>
          ) : (
            filteredConversations.map((c) => (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                  currentConversationId === c.id
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-300 hover:bg-[#131d35] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#8fa3bf] group-hover:text-cyan-400" />
                  <span className="truncate font-medium">{c.title || 'Cyber Consultation'}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConversationToDelete(c);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 text-[#8fa3bf] hover:text-red-400 transition-opacity"
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
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-[#8fa3bf] hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20 font-outfit"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All History</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Main Conversational Area ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0f1a] relative">
        {/* Header Bar */}
        <div className="cubbis-chat-header h-16 px-4 sm:px-6 border-b border-[#1e2d4f] flex items-center justify-between bg-[#0f1629]/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-[#8fa3bf] hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-[#1e2d4f]"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand history sidebar'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>

            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight font-space">
                  Cubbis
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-rajdhani font-semibold tracking-wide">
                  Cyber AI Companion
                </span>
              </div>
              <p className="text-[11px] text-[#8fa3bf] hidden sm:block font-plex">
                Incident response, threat education, and cybersecurity hygiene
              </p>
            </div>
          </div>

          {/* Right Header Controls: Language Pill + New Chat */}
          <div className="flex items-center gap-2.5 font-outfit">
            <div className="flex items-center p-1 rounded-xl bg-[#131d35] border border-[#1e2d4f]">
              <Globe className="w-3.5 h-3.5 text-[#8fa3bf] mx-1.5" />
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-outfit font-medium transition-all ${
                  language === 'en'
                    ? 'bg-cyan-500 text-[#0a1120] font-bold shadow-sm'
                    : 'text-[#8fa3bf] hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-2.5 py-1 rounded-lg text-xs font-outfit font-medium transition-all ${
                  language === 'hi'
                    ? 'bg-cyan-500 text-[#0a1120] font-bold shadow-sm'
                    : 'text-[#8fa3bf] hover:text-white'
                }`}
              >
                हिंदी
              </button>
            </div>

            <button
              onClick={handleNewChat}
              className="p-2 rounded-xl text-[#8fa3bf] hover:text-white hover:bg-white/5 border border-[#1e2d4f] transition-colors sm:hidden"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Messages Scroll Area ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 scrollbar-thin">
          {messages.length === 0 ? (
            /* ── Claude-Inspired Welcome View ── */
            <div className="max-w-3xl mx-auto py-8 sm:py-12 space-y-8 animate-fade-in">
              <div className="text-center space-y-3">
                <div className="inline-flex p-4 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-xl shadow-cyan-500/10">
                  <Bot className="w-12 h-12" />
                </div>

                <h3 className="text-2xl font-extrabold text-[#e8edf5] tracking-tight font-space">
                  {language === 'hi'
                    ? 'नमस्ते! मैं Cubbis हूँ — आपका साइबर सुरक्षा सहायक'
                    : 'How can Cubbis assist your cybersecurity today?'}
                </h3>
                <p className="text-xs sm:text-sm text-[#8fa3bf] max-w-xl mx-auto leading-relaxed font-plex">
                  {language === 'hi'
                    ? 'संदिग्ध संदेशों, फ़िशिंग ईमेल, खाता हैक की घटनाओं और डिजिटल सुरक्षा के बारे में वास्तविक समय में विशेषज्ञ मार्गदर्शन प्राप्त करें।'
                    : 'Get real-time expert triage for suspicious communications, phishing threats, account compromise response, and personal digital defense hygiene.'}
                </p>
              </div>

              {/* The 4 Specified Suggested Queries */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 justify-center">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-[#8fa3bf] font-rajdhani">
                    {language === 'hi'
                      ? 'सुझाए गए विषय (तत्काल विश्लेषण हेतु क्लिक करें)'
                      : 'Suggested Cybersecurity Queries (Click to submit prompt)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {queriesToDisplay.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q.prompt)}
                      className="cubbis-query-card p-4 rounded-2xl bg-[#131d35]/70 border border-[#1e2d4f] hover:border-cyan-500/50 hover:bg-[#131d35] text-left transition-all duration-200 flex items-start gap-3.5 group shadow-md hover:shadow-cyan-500/10"
                    >
                      <div className="query-icon-box p-2.5 rounded-xl bg-[#0a0f1a] border border-[#1e2d4f] shrink-0 mt-0.5 group-hover:border-cyan-500/30 transition-colors">
                        {q.icon}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#e8edf5] group-hover:text-cyan-300 transition-colors font-space">
                          {q.title}
                        </h4>
                        <p className="text-xs text-[#8fa3bf] line-clamp-2 mt-1 font-plex leading-relaxed">
                          {q.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── Active Conversation Stream (Spacious, Claude Pattern) ── */
            <div className="max-w-3xl sm:max-w-4xl mx-auto space-y-6">
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id || i}
                    className={`flex items-start gap-3 sm:gap-4 ${
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        isUser
                          ? 'bg-cyan-500 text-[#0a1120] font-bold text-xs'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isUser ? 'YOU' : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble Container */}
                    <div
                      className={`relative max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 sm:p-5 shadow-sm transition-all ${
                        isUser
                          ? 'cubbis-user-msg bg-cyan-500/15 border border-cyan-500/30 text-white rounded-tr-none'
                          : 'cubbis-assistant-msg bg-[#131d35]/80 border border-[#1e2d4f] text-[#c8d6e5] rounded-tl-none'
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-[#e8edf5]">
                          {msg.content}
                        </div>
                      ) : (
                        <AssistantMarkdownMessage content={msg.content} />
                      )}

                      {/* Footer Info for Assistant: Model tag & Copy */}
                      {!isUser && (
                        <div className="mt-3.5 pt-2.5 border-t border-[#1e2d4f]/60 flex items-center justify-between text-[11px] text-[#8fa3bf]">
                          <span className="flex items-center gap-1.5 font-mono text-cyan-400">
                            <Shield className="w-3.5 h-3.5" />
                            <span>{msg.model_used || 'Gemini 2.5 Flash'}</span>
                          </span>

                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-white/5 hover:text-white transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
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

              {/* Typing / Thinking Indicator */}
              {isLoading && (
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-[#131d35]/80 border border-[#1e2d4f] text-xs text-[#8fa3bf] flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                    <span className="font-plex">
                      Cubbis is consulting cybersecurity guidelines & incident databases...
                    </span>
                  </div>
                </div>
              )}

              {/* Error Banner with Retry */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  {lastFailedMessage && (
                    <button
                      onClick={handleRetry}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-medium text-xs transition-colors shrink-0 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Claude-Style Floating Bottom Message Dock ─────────────────── */}
        <div className="cubbis-dock-wrapper p-4 sm:p-5 bg-gradient-to-t from-[#0a0f1a] via-[#0a0f1a]/95 to-transparent shrink-0">
          <div className="max-w-3xl sm:max-w-4xl mx-auto space-y-2">
            <div className="cubbis-dock-card relative rounded-2xl bg-[#131d35]/95 border border-[#1e2d4f] focus-within:border-cyan-500/50 shadow-2xl backdrop-blur-md transition-all">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  adjustTextareaHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  language === 'hi'
                    ? 'संदिग्ध संदेश, फ़िशिंग लिंक या साइबर सुरक्षा के बारे में पूछें... (Enter भेजें, Shift+Enter नई पंक्ति)'
                    : 'Ask about suspicious emails, fake SMS, compromised accounts, or safety tips... (Enter to send, Shift+Enter for newline)'
                }
                rows={1}
                disabled={isLoading}
                style={{ minHeight: '52px', maxHeight: '180px' }}
                className="w-full pl-4 pr-16 py-3.5 bg-transparent text-xs sm:text-sm text-[#e8edf5] placeholder-[#8fa3bf]/60 resize-none focus:outline-none scrollbar-thin font-plex"
              />

              {/* Circular Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                className="absolute right-3.5 bottom-3 p-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-[#0a1120] font-bold transition-all duration-150 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:cursor-not-allowed"
                title="Send prompt"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0a1120]" />
                ) : (
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            </div>

            {/* Helper Disclaimer Subtitle */}
            <div className="flex items-center justify-between text-[11px] text-[#8fa3bf] px-2 font-plex">
              <span>
                {language === 'hi'
                  ? 'Cubbis AI शैक्षिक सुरक्षा सलाह देता है। महत्वपूर्ण खातों में 2FA अवश्य चालू रखें।'
                  : 'Cubbis offers educational cybersecurity guidance. Always verify critical alerts directly.'}
              </span>
              <span className="hidden sm:inline font-mono text-[10px]">
                Shift + Enter for new line
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Clear All History Confirmation ────────────────────────── */}
      {showClearConfirm && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="modal-surface w-full max-w-sm bg-[#0f1629] border border-red-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/10 text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Clear All History?</h4>
                <p className="text-xs text-[#8fa3bf]">
                  All saved conversations will be permanently purged.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 font-outfit">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs text-[#8fa3bf] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllHistory}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-red-500/20"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Single Conversation Confirmation ────────────────── */}
      {conversationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#0f1629] border border-red-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/10 text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Delete Conversation?</h4>
                <p className="text-xs text-[#8fa3bf] truncate max-w-[200px]">
                  "{conversationToDelete.title || 'Cyber Consultation'}"
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 font-outfit">
              <button
                onClick={() => setConversationToDelete(null)}
                className="px-3 py-1.5 text-xs text-[#8fa3bf] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConversation(conversationToDelete.id)}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-red-500/20"
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
