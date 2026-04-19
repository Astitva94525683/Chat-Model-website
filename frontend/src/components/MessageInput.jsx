import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MessageInput({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const ref = useRef(null);

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onInput = (e) => {
    setValue(e.target.value);
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 240) + "px";
    }
  };

  return (
    <div className="shrink-0 border-t border-[#27272A] bg-[#09090B]/80 backdrop-blur-md">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-4">
        <div className={cn(
          "border flex items-end gap-2 p-2 transition-none",
          disabled ? "border-[#27272A] opacity-60" : "border-[#27272A] focus-within:border-[#EAB308]"
        )}>
          <span className="font-mono text-[#EAB308] pl-2 pb-2 select-none">&gt;</span>
          <textarea
            ref={ref}
            value={value}
            onChange={onInput}
            onKeyDown={onKey}
            placeholder={disabled ? "Set webhook URL to start..." : "Type your question and hit Enter..."}
            rows={1}
            disabled={disabled}
            data-testid="message-input"
            className="flex-1 bg-transparent resize-none outline-none font-mono text-sm text-[#FAFAFA] placeholder:text-[#52525B] py-2 min-h-[36px] max-h-60"
          />
          <button
            onClick={submit}
            disabled={disabled || !value.trim()}
            data-testid="send-message-button"
            className={cn(
              "h-10 px-4 flex items-center gap-2 font-sans font-semibold text-xs tracking-wider shrink-0",
              disabled || !value.trim()
                ? "bg-[#27272A] text-[#71717A] cursor-not-allowed"
                : "bg-[#EAB308] text-black hover:bg-[#FACC15]"
            )}
          >
            SEND
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-[#71717A] tracking-[0.15em]">
          <span>[ ENTER ] send &nbsp;·&nbsp; [ SHIFT+ENTER ] newline</span>
          <span>{value.length} chars</span>
        </div>
      </div>
    </div>
  );
}
