import { useState } from "react";
import { Copy, Check, AlertTriangle, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ""; }
}

export default function ChatMessage({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isError = !!message.error;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (isUser) {
    return (
      <div className="fade-up self-end max-w-[90%] sm:max-w-[75%]" data-testid={`chat-message-user-${message.id}`}>
        <div className="flex items-center justify-end gap-2 mb-1 font-mono text-[10px] text-[#A1A1AA] tracking-[0.2em]">
          <span>USER · {formatTime(message.timestamp)}</span>
          <User className="w-3 h-3" />
        </div>
        <div className="bg-[#121214] border border-[#27272A] p-4 font-mono text-sm text-[#FAFAFA] whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant / system
  return (
    <div
      className="fade-up self-start w-full max-w-4xl group"
      data-testid={`chat-message-assistant-${message.id}`}
    >
      <div className={cn(
        "border-l-2 pl-4 py-2",
        isError ? "border-[#EF4444]" : "border-[#EAB308]"
      )}>
        <div className="flex items-center justify-between mb-1 font-mono text-[10px] tracking-[0.2em]">
          <div className="flex items-center gap-2 text-[#A1A1AA]">
            {isError ? (
              <>
                <AlertTriangle className="w-3 h-3 text-[#EF4444]" />
                <span className="text-[#EF4444]">N8N · ERROR · {formatTime(message.timestamp)}</span>
              </>
            ) : (
              <>
                <Bot className="w-3 h-3 text-[#EAB308]" />
                <span>N8N · RESPONSE · {formatTime(message.timestamp)}</span>
              </>
            )}
          </div>
          <button
            onClick={copy}
            className="opacity-0 group-hover:opacity-100 text-[#A1A1AA] hover:text-[#EAB308] p-1"
            data-testid={`copy-message-${message.id}`}
            aria-label="Copy message"
          >
            {copied ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
        <div className={cn(
          "font-mono text-sm whitespace-pre-wrap break-words",
          isError ? "text-[#FCA5A5]" : "text-[#FAFAFA]"
        )}>
          {message.content}
        </div>
      </div>
    </div>
  );
}
