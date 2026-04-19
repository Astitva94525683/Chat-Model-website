import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { api, getStoredWebhook, setStoredWebhook } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import ChatHeader from "@/components/ChatHeader";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import EmptyState from "@/components/EmptyState";
import WebhookDialog from "@/components/WebhookDialog";

export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(getStoredWebhook());
  const [webhookStatus, setWebhookStatus] = useState("unknown"); // unknown | reachable | unreachable | checking
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pingTimer = useRef(null);

  // Load sessions on mount
  const loadSessions = useCallback(async () => {
    try {
      const { data } = await api.get("/sessions");
      setSessions(data);
      return data;
    } catch (e) {
      console.error(e);
      return [];
    }
  }, []);

  useEffect(() => {
    (async () => {
      const list = await loadSessions();
      if (list.length > 0) {
        setActiveId(list[0].id);
      }
      if (!getStoredWebhook()) {
        setWebhookDialogOpen(true);
      }
    })();
  }, [loadSessions]);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      try {
        const { data } = await api.get(`/sessions/${activeId}/messages`);
        setMessages(data);
      } catch (e) {
        console.error(e);
        setMessages([]);
      }
    })();
  }, [activeId]);

  // Ping webhook for status (debounced)
  const pingWebhook = useCallback(async (url) => {
    if (!url) { setWebhookStatus("unknown"); return; }
    setWebhookStatus("checking");
    try {
      const { data } = await api.post("/webhook/ping", { webhook_url: url });
      setWebhookStatus(data.reachable ? "reachable" : "unreachable");
    } catch {
      setWebhookStatus("unreachable");
    }
  }, []);

  useEffect(() => {
    if (pingTimer.current) clearTimeout(pingTimer.current);
    if (webhookUrl) {
      pingTimer.current = setTimeout(() => pingWebhook(webhookUrl), 400);
    } else {
      setWebhookStatus("unknown");
    }
    return () => pingTimer.current && clearTimeout(pingTimer.current);
  }, [webhookUrl, pingWebhook]);

  const handleSaveWebhook = (url) => {
    setStoredWebhook(url);
    setWebhookUrl(url);
    setWebhookDialogOpen(false);
    toast.success("Webhook saved", { description: url.slice(0, 60) + (url.length > 60 ? "..." : "") });
  };

  const handleNewChat = async () => {
    try {
      const { data } = await api.post("/sessions", { title: "New Chat", webhook_url: webhookUrl || null });
      setSessions((s) => [data, ...s]);
      setActiveId(data.id);
      setMessages([]);
      setSidebarOpen(false);
    } catch (e) {
      toast.error("Could not create chat session");
    }
  };

  const handleDeleteSession = async (id) => {
    try {
      await api.delete(`/sessions/${id}`);
      setSessions((s) => s.filter((x) => x.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      toast.success("Chat deleted");
    } catch {
      toast.error("Failed to delete chat");
    }
  };

  const handleSend = async (text) => {
    if (!text.trim()) return;
    if (!webhookUrl) {
      toast.error("Set your webhook URL first");
      setWebhookDialogOpen(true);
      return;
    }

    // Ensure we have an active session
    let sessionId = activeId;
    if (!sessionId) {
      try {
        const { data } = await api.post("/sessions", { title: "New Chat", webhook_url: webhookUrl });
        setSessions((s) => [data, ...s]);
        setActiveId(data.id);
        sessionId = data.id;
      } catch {
        toast.error("Failed to create session");
        return;
      }
    }

    // Optimistic append user message
    const tempUser = {
      id: `tmp-${Date.now()}`,
      session_id: sessionId,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      error: false,
    };
    setMessages((m) => [...m, tempUser]);
    setSending(true);

    try {
      const { data } = await api.post("/chat", {
        session_id: sessionId,
        message: text,
        webhook_url: webhookUrl,
      });
      // Replace temp message and append assistant
      setMessages((m) => {
        const filtered = m.filter((x) => x.id !== tempUser.id);
        return [...filtered, data.user_message, data.assistant_message];
      });
      // Refresh session list for updated titles / order
      loadSessions();
    } catch (e) {
      setMessages((m) => [
        ...m.filter((x) => x.id !== tempUser.id),
        tempUser,
        {
          id: `err-${Date.now()}`,
          session_id: sessionId,
          role: "assistant",
          content: `[Request failed] ${e?.response?.data?.detail || e.message}`,
          timestamp: new Date().toISOString(),
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeId) || null;

  return (
    <div className="flex h-screen w-full bg-[#09090B] text-[#FAFAFA] overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={(id) => { setActiveId(id); setSidebarOpen(false); }}
        onNewChat={handleNewChat}
        onDelete={handleDeleteSession}
        webhookStatus={webhookStatus}
        webhookUrl={webhookUrl}
        onEditWebhook={() => setWebhookDialogOpen(true)}
        open={sidebarOpen}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <ChatHeader
          session={activeSession}
          webhookUrl={webhookUrl}
          webhookStatus={webhookStatus}
          onEditWebhook={() => setWebhookDialogOpen(true)}
          onPing={() => pingWebhook(webhookUrl)}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <div className="flex-1 overflow-y-auto" data-testid="chat-messages-container">
          {messages.length === 0 && !sending ? (
            <EmptyState
              hasWebhook={!!webhookUrl}
              onSetWebhook={() => setWebhookDialogOpen(true)}
              onQuickStart={(t) => handleSend(t)}
            />
          ) : (
            <MessageList messages={messages} loading={sending} />
          )}
        </div>

        <MessageInput onSend={handleSend} disabled={sending || !webhookUrl} />
      </main>

      <WebhookDialog
        open={webhookDialogOpen}
        onOpenChange={setWebhookDialogOpen}
        initialValue={webhookUrl}
        onSave={handleSaveWebhook}
      />
    </div>
  );
}
