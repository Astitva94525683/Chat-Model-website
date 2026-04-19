import { Button } from "@/components/ui/button";
import { Plus, Trash2, MessageSquare, Webhook, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const StatusBadge = ({ status }) => {
  const map = {
    reachable:  { color: "bg-[#22C55E]", label: "ONLINE" },
    unreachable:{ color: "bg-[#EF4444]", label: "OFFLINE" },
    checking:   { color: "bg-[#EAB308] animate-pulse", label: "PING..." },
    unknown:    { color: "bg-zinc-600", label: "NO HOOK" },
  };
  const s = map[status] || map.unknown;
  return (
    <span className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-[#A1A1AA]" data-testid="webhook-status-sidebar">
      <span className={cn("status-dot", s.color)} />
      {s.label}
    </span>
  );
};

export default function Sidebar({
  sessions, activeId, onSelect, onNewChat, onDelete,
  webhookStatus, webhookUrl, onEditWebhook, open,
}) {
  return (
    <aside
      className={cn(
        "w-72 border-r border-[#27272A] bg-[#0B0B0D] flex flex-col shrink-0",
        "fixed md:static inset-y-0 left-0 z-40 transform transition-transform md:transform-none",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
      data-testid="sidebar"
    >
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-[#27272A]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#EAB308] flex items-center justify-center">
            <Webhook className="w-4 h-4 text-black" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-sans font-semibold text-sm tracking-tight">HOOKCHAT</div>
            <div className="font-mono text-[9px] text-[#A1A1AA] tracking-[0.2em]">N8N · WEBHOOK TESTER</div>
          </div>
        </div>
      </div>

      {/* New chat button */}
      <div className="p-3 border-b border-[#27272A]">
        <Button
          onClick={onNewChat}
          className="w-full h-10 bg-[#EAB308] hover:bg-[#FACC15] text-black rounded-none font-sans font-semibold text-sm tracking-wide"
          data-testid="new-chat-button"
        >
          <Plus className="w-4 h-4 mr-2" strokeWidth={2.5} />
          NEW CHAT
        </Button>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-4 py-2 font-mono text-[10px] text-[#A1A1AA] tracking-[0.2em]">
          ── HISTORY ({sessions.length})
        </div>
        {sessions.length === 0 && (
          <div className="px-4 py-6 text-xs text-[#71717A] font-mono">
            No chats yet.<br/>Click NEW CHAT to begin.
          </div>
        )}
        <ul>
          {sessions.map((s) => {
            const active = s.id === activeId;
            return (
              <li key={s.id}>
                <button
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 flex items-center gap-3 group",
                    "border-l-2 transition-none",
                    active
                      ? "border-[#EAB308] bg-[#121214] text-[#FAFAFA]"
                      : "border-transparent text-[#A1A1AA] hover:border-[#EAB308]/50 hover:bg-[#121214] hover:text-[#FAFAFA]"
                  )}
                  data-testid={`chat-history-item-${s.id}`}
                >
                  <MessageSquare className={cn("w-3.5 h-3.5 shrink-0", active ? "text-[#EAB308]" : "")} />
                  <span className="flex-1 font-mono text-xs truncate">{s.title || "New Chat"}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onDelete(s.id); } }}
                    className="opacity-0 group-hover:opacity-100 text-[#A1A1AA] hover:text-[#EF4444] p-1 cursor-pointer"
                    data-testid={`delete-chat-${s.id}`}
                    aria-label="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Webhook footer */}
      <div className="p-3 border-t border-[#27272A] bg-[#0B0B0D]">
        <button
          onClick={onEditWebhook}
          className="w-full flex items-start gap-3 p-3 border border-[#27272A] hover:border-[#EAB308] text-left transition-none"
          data-testid="edit-webhook-button-sidebar"
        >
          <Settings className="w-4 h-4 mt-0.5 text-[#EAB308]" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-sans text-xs font-semibold">WEBHOOK</span>
              <StatusBadge status={webhookStatus} />
            </div>
            <div className="font-mono text-[10px] text-[#A1A1AA] break-all leading-tight">
              {webhookUrl ? webhookUrl : "-- not configured --"}
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}
