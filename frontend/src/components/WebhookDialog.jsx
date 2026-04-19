import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Webhook, ExternalLink, Info } from "lucide-react";

export default function WebhookDialog({ open, onOpenChange, initialValue, onSave }) {
  const [url, setUrl] = useState(initialValue || "");

  useEffect(() => { setUrl(initialValue || ""); }, [initialValue, open]);

  const valid = /^https?:\/\/.+/.test(url.trim());
  const isLocalhost = /\/\/(localhost|127\.0\.0\.1)/i.test(url);

  const handleSave = () => {
    if (!valid) return;
    onSave(url.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#121214] border border-[#27272A] rounded-none text-[#FAFAFA] font-sans max-w-xl"
        data-testid="webhook-dialog"
      >
        <DialogHeader>
          <div className="font-mono text-[10px] text-[#EAB308] tracking-[0.3em] mb-1">
            ── CONFIGURE
          </div>
          <DialogTitle className="text-2xl font-sans font-semibold tracking-tight flex items-center gap-2">
            <Webhook className="w-5 h-5 text-[#EAB308]" />
            n8n Webhook URL
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-[#A1A1AA] leading-relaxed">
            Paste the webhook URL from your n8n Webhook node. We&apos;ll POST your chat messages there.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <label className="font-mono text-[10px] text-[#A1A1AA] tracking-[0.2em] block">
            WEBHOOK URL
          </label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-ngrok-url.ngrok-free.app/webhook/xxxx"
            className="h-11 bg-[#09090B] border-[#27272A] rounded-none font-mono text-sm focus-visible:ring-0 focus-visible:border-[#EAB308]"
            data-testid="webhook-url-input"
            autoFocus
          />

          {isLocalhost && (
            <div className="border border-[#EF4444]/40 bg-[#EF4444]/5 p-3 flex items-start gap-2" data-testid="localhost-warning">
              <Info className="w-4 h-4 text-[#EF4444] mt-0.5 shrink-0" />
              <div className="font-mono text-[11px] leading-relaxed text-[#FCA5A5]">
                Localhost URLs won&apos;t work — our backend cannot reach your machine.
                Run <code className="text-[#EAB308]">ngrok http 5678</code> and paste the public URL instead.
              </div>
            </div>
          )}

          <div className="border border-[#27272A] p-3">
            <div className="font-mono text-[10px] text-[#A1A1AA] tracking-[0.2em] mb-2">── QUICK GUIDE</div>
            <ol className="font-mono text-[11px] text-[#A1A1AA] space-y-1 leading-relaxed">
              <li>1. In n8n, open your <span className="text-[#FAFAFA]">Webhook</span> node</li>
              <li>2. Set <span className="text-[#FAFAFA]">HTTP Method</span> to POST</li>
              <li>3. Add a <span className="text-[#FAFAFA]">Respond to Webhook</span> node at the end</li>
              <li>4. Activate the workflow and copy the <span className="text-[#FAFAFA]">Production URL</span></li>
              <li>5. If n8n is local, tunnel it with <span className="text-[#EAB308]">ngrok</span></li>
            </ol>
            <a
              href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] text-[#EAB308] hover:underline"
              data-testid="n8n-docs-link"
            >
              n8n webhook docs
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <DialogFooter className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-none border-[#27272A] bg-transparent hover:bg-[#27272A] hover:text-[#FAFAFA] font-sans text-xs tracking-wider"
            data-testid="webhook-cancel-button"
          >
            CANCEL
          </Button>
          <Button
            onClick={handleSave}
            disabled={!valid}
            className="rounded-none bg-[#EAB308] hover:bg-[#FACC15] text-black font-sans font-semibold text-xs tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="webhook-save-button"
          >
            SAVE WEBHOOK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
