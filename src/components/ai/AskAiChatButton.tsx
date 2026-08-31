"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import api from "@/lib/axios";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import AskAiChatDrawer, {
  AskAiApiClient,
  AskAiChatResponse,
  AskAiSession,
  AskAiMessage,
} from "./AskAiChatDrawer";

/**
 * Admin-app integration wrapper for the portable AskAiChatDrawer.
 * Wires it to this app's real axios client (JWT bearer, /api/proxy/ prefix
 * handled by axios interceptor already) and permission/settings checks.
 *
 * MANDATORY: the button renders only when ai_chat_enabled is true — absent,
 * not disabled, matching the Ask AI Build Plan's "AI is never mandatory"
 * house rule and the column comment on company_settings.ai_chat_enabled.
 */

const askAiApi: AskAiApiClient = {
  sendMessage: async (message, sessionId, currentRoute) => {
    const { data } = await api.post<AskAiChatResponse>("/ai/chat/message", {
      message,
      sessionId,
      currentRoute,
    });
    return data;
  },
  getSessions: async (limit = 20) => {
    const { data } = await api.get<AskAiSession[]>("/ai/chat/sessions", {
      params: { limit },
    });
    return data;
  },
  getMessages: async (sessionId) => {
    const { data } = await api.get<AskAiMessage[]>(
      `/ai/chat/sessions/${sessionId}/messages`,
    );
    return data;
  },
  deleteSession: async (sessionId) => {
    await api.delete(`/ai/chat/sessions/${sessionId}`);
  },
};

export default function AskAiChatButton() {
  const canUse = usePermission(Permissions.Ai.Chat.Use);
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!canUse) return;
    api
      .get<{ chatEnabled: boolean }>("/company/ai-settings")
      .then(({ data }) => setEnabled(data.chatEnabled))
      .catch(() => setEnabled(false));
  }, [canUse]);

  // Absent, not disabled — per the plan's non-negotiable "AI is never mandatory" rule.
  if (!canUse || !enabled) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask AI"
        title="Ask AI"
        data-tour="ask-ai"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          background: "#7c3aed",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(124, 58, 237, 0.4)",
          cursor: "pointer",
          zIndex: 1030,
          transition: "transform 150ms",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <Sparkles size={22} />
      </button>

      <AskAiChatDrawer
        open={open}
        onClose={() => setOpen(false)}
        api={askAiApi}
        currentRoute={pathname}
      />
    </>
  );
}
