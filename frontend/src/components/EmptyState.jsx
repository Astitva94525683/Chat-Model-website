import { Webhook, Zap, Terminal, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const SAMPLE_PROMPTS = [
  "What can you do?",
  "Summarize the latest n8n changelog",
  "Give me a SQL query to find duplicate rows",
  "Explain webhooks like I'm five",
];

export default function EmptyState({ hasWebhook, onSetWebhook, onQuickStart }) {
  return (
    <div className="h-full w-full grid-bg flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Overline */}
        <div className="font-mono text-[10px] text-[#EAB308] tracking-[0.3em] mb-3">
          ── N8N · WEBHOOK · CHAT · TESTER
        </div>

        {/* Hero */}
        <h1 className="font-sans font-semibold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-none mb-4">
          Chat with your <br/>
          <span className="text-[#EAB308]">n8n workflow<span className="blink-cursor"></span></span>
        </h1>
        <p className="font-mono text-sm text-[#A1A1AA] max-w-xl mb-8 leading-relaxed">
          Every message you send is forwarded to the n8n webhook URL you configured.
          The workflow&apos;s response lands right here in real time. No LLM on our end —
          your n8n workflow does all the thinking.
        </p>

        {!hasWebhook ? (
          <div className="border border-[#EAB308]/40 bg-[#EAB308]/5 p-5 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#EAB308]" />
              <span className="font-sans font-semibold text-sm tracking-tight">STEP 1 · CONFIGURE WEBHOOK</span>
            </div>
            <p className="font-mono text-xs text-[#A1A1AA] mb-4 leading-relaxed">
              Paste your n8n webhook URL to get started. If your n8n runs on <code className="text-[#EAB308]">localhost</code>,
              expose it with <code className="text-[#EAB308]">ngrok</code> first and paste the public URL here.
            </p>
            <Button
              onClick={onSetWebhook}
              className="h-10 bg-[#EAB308] hover:bg-[#FACC15] text-black rounded-none font-sans font-semibold text-xs tracking-wider"
              data-testid="empty-set-webhook-button"
            >
              <Webhook className="w-4 h-4 mr-2" />
              SET WEBHOOK URL
            </Button>
          </div>
        ) : (
          <div className="border border-[#27272A] p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="w-4 h-4 text-[#EAB308]" />
              <span className="font-sans font-semibold text-sm tracking-tight">TRY A PROMPT</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => onQuickStart(p)}
                  data-testid={`quick-prompt-${p.slice(0, 10).replace(/\s/g, "-").toLowerCase()}`}
                  className="flex items-center justify-between text-left border border-[#27272A] hover:border-[#EAB308] px-3 py-3 group"
                >
                  <span className="font-mono text-xs text-[#A1A1AA] group-hover:text-[#FAFAFA]">{p}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#71717A] group-hover:text-[#EAB308] shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="font-mono text-[10px] text-[#52525B] tracking-[0.2em] mt-8">
          v1.0 · BUILT FOR TESTING · NO LLM ON SERVER
        </div>
      </div>
    </div>
  );
}
