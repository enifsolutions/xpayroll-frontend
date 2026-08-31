"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Send,
  Sparkles,
  History,
  Plus,
  ChevronDown,
  ChevronUp,
  Wrench,
  Trash2,
  ArrowLeft,
} from "lucide-react";

/**
 * AskAiChatDrawer — portable Ask AI chat panel.
 *
 * Framework-agnostic by design: styled-jsx keeps every style scoped to this
 * file (no Tailwind, no Bootstrap, no external CSS needed), so this same
 * file can be copied into any Next.js app — the XpayRoll admin dashboard
 * today, the Employee Self-Service portal later — and it will look and
 * behave identically. The host app supplies its own authenticated API
 * calls via props; this component has no idea whether that's a JWT bearer
 * token or a cookie-based session underneath.
 */

// ---------------------------------------------------------------------------
// Types — match the real backend DTOs (camelCase, as ASP.NET Core serializes
// them), confirmed against live API responses, not assumed.
// ---------------------------------------------------------------------------

export interface AskAiToolCall {
  tool: string;
  args: Record<string, unknown> | null;
  rowCount: number;
  latencyMs: number;
}

export interface AskAiChatResponse {
  answer: string;
  toolsCalled: AskAiToolCall[];
  tokensUsed: number;
  sessionId: string;
}

export interface AskAiSession {
  id: string;
  title: string | null;
  messageCount: number;
  totalTokens: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface AskAiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsCalledJson: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
}

/** The portability boundary — the host app implements this however its own auth works. */
export interface AskAiApiClient {
  sendMessage: (message: string, sessionId?: string, currentRoute?: string) => Promise<AskAiChatResponse>;
  getSessions: (limit?: number) => Promise<AskAiSession[]>;
  getMessages: (sessionId: string) => Promise<AskAiMessage[]>;
  deleteSession: (sessionId: string) => Promise<void>;
}

export interface AskAiChatDrawerProps {
  open: boolean;
  onClose: () => void;
  api: AskAiApiClient;
  /** Current route, so "how do I use this page?" can work contextually. Optional. */
  currentRoute?: string;
  /** Called when the user picks a starter prompt or types their own — lets the host log analytics if it wants. Optional. */
  onSend?: (message: string) => void;
}

const STARTER_PROMPTS = [
  "How do I run a monthly payroll?",
  "Where do I add a new employee?",
  "Why is an employee's EPF showing zero?",
  "Payroll cost trend for the last 6 months",
  "Which department has the highest overtime?",
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Minimal, dependency-free markdown-ish renderer — supports **bold**, `code`,
 * "## " headers, and "- "/"1. " list items, which covers everything the
 * system prompt and help_topics content actually produce. Deliberately not
 * a full markdown parser (no external dependency, stays portable).
 */
function renderContent(text: string) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    const items = listBuffer.map((item, i) => (
      <li key={i}>{renderInline(item)}</li>
    ));
    elements.push(
      listType === "ol" ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>
    );
    listBuffer = [];
    listType = null;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      flushList(`list-${idx}`);
      elements.push(<h4 key={idx}>{renderInline(trimmed.slice(3))}</h4>);
    } else if (/^-\s+/.test(trimmed)) {
      if (listType !== "ul") flushList(`list-${idx}`);
      listType = "ul";
      listBuffer.push(trimmed.replace(/^-\s+/, ""));
    } else if (/^\d+\.\s+/.test(trimmed)) {
      if (listType !== "ol") flushList(`list-${idx}`);
      listType = "ol";
      listBuffer.push(trimmed.replace(/^\d+\.\s+/, ""));
    } else if (trimmed === "") {
      flushList(`list-${idx}`);
    } else {
      flushList(`list-${idx}`);
      elements.push(<p key={idx}>{renderInline(trimmed)}</p>);
    }
  });
  flushList("list-final");

  return elements;
}

function renderInline(text: string): (string | JSX.Element)[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function ToolTransparency({ tools }: { tools: AskAiToolCall[] }) {
  const [open, setOpen] = useState(false);
  if (tools.length === 0) return null;

  return (
    <div className="tool-transparency">
      <button className="tool-toggle" onClick={() => setOpen((v) => !v)}>
        <Wrench size={12} />
        <span>
          Used {tools.length} tool{tools.length !== 1 ? "s" : ""}
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="tool-list">
          {tools.map((t, i) => (
            <div key={i} className="tool-item">
              <span className="tool-name">{t.tool}</span>
              <span className="tool-meta">
                {t.rowCount} row{t.rowCount !== 1 ? "s" : ""} · {t.latencyMs}ms
              </span>
            </div>
          ))}
        </div>
      )}
      <style jsx>{`
        .tool-transparency {
          margin-top: 8px;
          font-size: 11.5px;
        }
        .tool-toggle {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: none;
          color: var(--askai-text-muted);
          cursor: pointer;
          padding: 2px 0;
          font-size: 11.5px;
        }
        .tool-toggle:hover {
          color: var(--askai-accent);
        }
        .tool-list {
          margin-top: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-left: 4px;
          border-left: 2px solid var(--askai-border);
        }
        .tool-item {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          padding: 2px 8px;
          color: var(--askai-text-muted);
        }
        .tool-name {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          color: var(--askai-text);
        }
      `}</style>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="thinking-row">
      <div className="thinking-avatar">
        <Sparkles size={13} />
      </div>
      <div className="thinking-dots">
        <span />
        <span />
        <span />
      </div>
      <style jsx>{`
        .thinking-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 0;
        }
        .thinking-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--askai-accent);
          color: white;
          flex-shrink: 0;
          animation: askai-glow 1.6s ease-in-out infinite;
        }
        .thinking-dots {
          display: flex;
          gap: 4px;
        }
        .thinking-dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--askai-accent);
          opacity: 0.4;
          animation: askai-bounce 1.2s ease-in-out infinite;
        }
        .thinking-dots span:nth-child(2) {
          animation-delay: 0.15s;
        }
        .thinking-dots span:nth-child(3) {
          animation-delay: 0.3s;
        }
        @keyframes askai-glow {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(124, 58, 237, 0);
          }
        }
        @keyframes askai-bounce {
          0%,
          60%,
          100% {
            opacity: 0.4;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
}

export default function AskAiChatDrawer({
  open,
  onClose,
  api,
  currentRoute,
  onSend,
}: AskAiChatDrawerProps) {
  const [view, setView] = useState<"chat" | "history">("chat");
  const [sessions, setSessions] = useState<AskAiSession[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; tools?: AskAiToolCall[] }[]
  >([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const loadSessions = async () => {
    setLoadingHistory(true);
    try {
      const result = await api.getSessions(20);
      setSessions(result);
    } catch {
      // Non-fatal — history is a convenience, not core functionality.
    } finally {
      setLoadingHistory(false);
    }
  };

  const openHistory = () => {
    setView("history");
    loadSessions();
  };

  const openSession = async (id: string) => {
    setView("chat");
    setSessionId(id);
    try {
      const msgs = await api.getMessages(id);
      setMessages(
        msgs.map((m) => ({
          role: m.role,
          content: m.content,
          tools: m.toolsCalledJson ? JSON.parse(m.toolsCalledJson) : undefined,
        }))
      );
    } catch {
      setMessages([]);
    }
  };

  const startNewChat = () => {
    setView("chat");
    setSessionId(undefined);
    setMessages([]);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteSession(id);
      setSessions((s) => s.filter((x) => x.id !== id));
      if (id === sessionId) startNewChat();
    } catch {
      // Silent — the session stays in the list, user can retry.
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    onSend?.(trimmed);
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);

    try {
      const response = await api.sendMessage(trimmed, sessionId, currentRoute);
      setSessionId(response.sessionId);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: response.answer, tools: response.toolsCalled },
      ]);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ??
        "Something went wrong reaching Ask AI. Try again in a moment.";
      setMessages((m) => [...m, { role: "assistant", content: message, tools: [] }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {open && <div className="askai-backdrop" onClick={onClose} />}

      <div className={`askai-drawer ${open ? "askai-open" : ""}`}>
        <div className="askai-header">
          {view === "history" ? (
            <button className="askai-icon-btn" onClick={() => setView("chat")} aria-label="Back to chat">
              <ArrowLeft size={16} />
            </button>
          ) : (
            <div className="askai-title-group">
              <div className="askai-title-icon">
                <Sparkles size={15} />
              </div>
              <span className="askai-title">Ask AI</span>
            </div>
          )}

          <div className="askai-header-actions">
            {view === "chat" && (
              <>
                <button className="askai-icon-btn" onClick={startNewChat} aria-label="New chat" title="New chat">
                  <Plus size={16} />
                </button>
                <button className="askai-icon-btn" onClick={openHistory} aria-label="Chat history" title="History">
                  <History size={16} />
                </button>
              </>
            )}
            <button className="askai-icon-btn" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {view === "history" ? (
          <div className="askai-history">
            {loadingHistory ? (
              <div className="askai-empty-state">Loading…</div>
            ) : sessions.length === 0 ? (
              <div className="askai-empty-state">No previous chats yet.</div>
            ) : (
              sessions.map((s) => (
                <button key={s.id} className="askai-history-item" onClick={() => openSession(s.id)}>
                  <div className="askai-history-item-main">
                    <span className="askai-history-title">{s.title || "New chat"}</span>
                    <span className="askai-history-meta">
                      {s.messageCount} message{s.messageCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    className="askai-history-delete"
                    onClick={(e) => deleteSession(s.id, e)}
                    aria-label="Delete chat"
                  >
                    <Trash2 size={13} />
                  </button>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="askai-body">
              {messages.length === 0 && !sending ? (
                <div className="askai-starter">
                  <div className="askai-starter-icon">
                    <Sparkles size={20} />
                  </div>
                  <p className="askai-starter-heading">Ask about your data, or how to do something</p>
                  <div className="askai-starter-chips">
                    {STARTER_PROMPTS.map((p) => (
                      <button key={p} className="askai-chip" onClick={() => send(p)}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="askai-messages">
                  {messages.map((m, i) => (
                    <div key={i} className={`askai-msg-row askai-msg-${m.role}`}>
                      {m.role === "assistant" && (
                        <div className="askai-avatar">
                          <Sparkles size={12} />
                        </div>
                      )}
                      <div className="askai-bubble">
                        <div className="askai-bubble-content">{renderContent(m.content)}</div>
                        {m.role === "assistant" && m.tools && <ToolTransparency tools={m.tools} />}
                      </div>
                    </div>
                  ))}
                  {sending && <ThinkingIndicator />}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <div className="askai-composer">
              <textarea
                ref={inputRef}
                className="askai-input"
                placeholder="Ask a question…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={sending}
              />
              <button
                className="askai-send-btn"
                onClick={() => send(input)}
                disabled={sending || !input.trim()}
                aria-label="Send"
              >
                <Send size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        :root {
          --askai-accent: #7c3aed;
          --askai-accent-soft: #f5f3ff;
          --askai-surface: #ffffff;
          --askai-surface-alt: #f9fafb;
          --askai-border: #e5e7eb;
          --askai-text: #111827;
          --askai-text-muted: #6b7280;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --askai-surface: #111827;
            --askai-surface-alt: #1f2937;
            --askai-border: #374151;
            --askai-text: #f9fafb;
            --askai-text-muted: #9ca3af;
            --askai-accent-soft: rgba(124, 58, 237, 0.14);
          }
        }
      `}</style>

      <style jsx>{`
        .askai-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 1040;
        }
        .askai-drawer {
          position: fixed;
          top: 0;
          right: 0;
          height: 100%;
          width: 100%;
          max-width: 420px;
          background: var(--askai-surface);
          color: var(--askai-text);
          box-shadow: -8px 0 30px rgba(0, 0, 0, 0.15);
          z-index: 1050;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 280ms cubic-bezier(0.32, 0.72, 0, 1);
          font-family: inherit;
        }
        .askai-open {
          transform: translateX(0);
        }
        .askai-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--askai-border);
          flex-shrink: 0;
        }
        .askai-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .askai-title-icon {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          background: var(--askai-accent);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .askai-title {
          font-weight: 600;
          font-size: 14px;
        }
        .askai-header-actions {
          display: flex;
          gap: 2px;
        }
        .askai-icon-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--askai-text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 150ms, color 150ms;
        }
        .askai-icon-btn:hover {
          background: var(--askai-surface-alt);
          color: var(--askai-text);
        }

        .askai-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .askai-starter {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 14px;
          padding: 0 8px;
        }
        .askai-starter-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: var(--askai-accent-soft);
          color: var(--askai-accent);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .askai-starter-heading {
          font-size: 13.5px;
          color: var(--askai-text-muted);
          margin: 0;
          max-width: 260px;
        }
        .askai-starter-chips {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          max-width: 300px;
        }
        .askai-chip {
          text-align: left;
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid var(--askai-border);
          background: var(--askai-surface);
          color: var(--askai-text);
          font-size: 12.5px;
          cursor: pointer;
          transition: border-color 150ms, background 150ms;
        }
        .askai-chip:hover {
          border-color: var(--askai-accent);
          background: var(--askai-accent-soft);
        }

        .askai-messages {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .askai-msg-row {
          display: flex;
          gap: 8px;
          animation: askai-msg-in 220ms ease-out;
        }
        @keyframes askai-msg-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .askai-msg-user {
          justify-content: flex-end;
        }
        .askai-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--askai-accent);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .askai-bubble {
          max-width: 80%;
          border-radius: 14px;
          padding: 9px 13px;
          font-size: 13px;
          line-height: 1.55;
        }
        .askai-msg-user .askai-bubble {
          background: var(--askai-accent);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .askai-msg-assistant .askai-bubble {
          background: var(--askai-surface-alt);
          border: 1px solid var(--askai-border);
          border-bottom-left-radius: 4px;
        }
        .askai-bubble-content :global(p) {
          margin: 0 0 6px 0;
        }
        .askai-bubble-content :global(p:last-child) {
          margin-bottom: 0;
        }
        .askai-bubble-content :global(h4) {
          font-size: 12.5px;
          font-weight: 700;
          margin: 10px 0 4px 0;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          opacity: 0.75;
        }
        .askai-bubble-content :global(h4:first-child) {
          margin-top: 0;
        }
        .askai-bubble-content :global(ul),
        .askai-bubble-content :global(ol) {
          margin: 4px 0 8px 0;
          padding-left: 18px;
        }
        .askai-bubble-content :global(li) {
          margin-bottom: 2px;
        }
        .askai-bubble-content :global(code) {
          background: rgba(0, 0, 0, 0.08);
          padding: 1px 5px;
          border-radius: 4px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 11.5px;
        }
        .askai-msg-user .askai-bubble-content :global(code) {
          background: rgba(255, 255, 255, 0.2);
        }

        .askai-composer {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 12px 14px;
          border-top: 1px solid var(--askai-border);
          flex-shrink: 0;
        }
        .askai-input {
          flex: 1;
          resize: none;
          border: 1px solid var(--askai-border);
          border-radius: 12px;
          padding: 9px 12px;
          font-size: 13px;
          font-family: inherit;
          color: var(--askai-text);
          background: var(--askai-surface);
          max-height: 100px;
          outline: none;
          transition: border-color 150ms;
        }
        .askai-input:focus {
          border-color: var(--askai-accent);
        }
        .askai-send-btn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: none;
          background: var(--askai-accent);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: opacity 150ms, transform 150ms;
        }
        .askai-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .askai-send-btn:not(:disabled):hover {
          transform: scale(1.05);
        }

        .askai-history {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .askai-history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 10px;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
          transition: background 150ms;
        }
        .askai-history-item:hover {
          background: var(--askai-surface-alt);
        }
        .askai-history-item-main {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .askai-history-title {
          font-size: 13px;
          color: var(--askai-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .askai-history-meta {
          font-size: 11px;
          color: var(--askai-text-muted);
        }
        .askai-history-delete {
          border: none;
          background: transparent;
          color: var(--askai-text-muted);
          padding: 4px;
          border-radius: 6px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .askai-history-delete:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .askai-empty-state {
          text-align: center;
          padding: 40px 16px;
          color: var(--askai-text-muted);
          font-size: 13px;
        }

        @media (prefers-reduced-motion: reduce) {
          .askai-drawer,
          .askai-msg-row,
          .thinking-avatar,
          .thinking-dots span {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </>
  );
}
