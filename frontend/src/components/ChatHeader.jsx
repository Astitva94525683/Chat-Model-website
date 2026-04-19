import { Button } from "@/components/ui/button";
import { RefreshCw, Menu, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChatHeader({ session, webhookUrl, webhookStatus, onEditWebhook, onPing, onOpenSidebar }) {
  const dotColor = {
    reachable: "bg-[#22C55E]",
    unreachable: "bg-[#EF4444]",
    checking: "bg-[#EAB308] animate-pulse",
    unknown: "bg-zinc-600",
  }[webhookStatus] || "bg-zinc-600";

  const statusLabel = {
    reachable: "WEBHOOK · REACHABLE",
    unreachable: "WEBHOOK · UNREACHABLE",
    checking: "WEBHOOK · PINGING",
    unknown: "WEBHOOK · NOT SET",
  }[webhookStatus] || "WEBHOOK · UNKNOWN";

  return (
    <header
      className="h-16 shrink-0 border-b border-[#27272A] bg-[#09090B]/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 gap-3"
      data-testid="chat-header"
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-2 border border-[#27272A] text-[#A1A1AA] hover:text-[#EAB308] hover:border-[#EAB308]"
          data-testid="open-sidebar-button"
          aria-label="Open sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
        <Terminal className="w-4 h-4 text-[#EAB308] shrink-0" />
        <div className="min-w-0">
          <div className="font-sans font-semibold text-sm tracking-tight truncate" data-testid="session-title">
            {session?.title || "New Session"}
          </div>
          <div className="font-mono text-[10px] text-[#A1A1AA] tracking-[0.2em]">
            {session ? `ID · ${session.id.slice(0, 8)}` : "NO SESSION"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onEditWebhook}
          className="hidden sm:flex items-center gap-2 px-3 h-9 border border-[#27272A] hover:border-[#EAB308] group"
          data-testid="webhook-status-pill"
        >
          <span className={cn("status-dot", dotColor)} />
          <span className="font-mono text-[10px] tracking-[0.2em] text-[#A1A1AA] group-hover:text-[#FAFAFA]">
            {statusLabel}
          </span>
        </button>
        <Button
          variant="outline"
          size="icon"
          onClick={onPing}
          className="h-9 w-9 border-[#27272A] hover:border-[#EAB308] hover:bg-transparent hover:text-[#EAB308] rounded-none"
          disabled={!webhookUrl}
          data-testid="ping-webhook-button"
          aria-label="Ping webhook"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", webhookStatus === "checking" && "animate-spin")} />
        </Button>
      </div>
    </header>
  );
}
