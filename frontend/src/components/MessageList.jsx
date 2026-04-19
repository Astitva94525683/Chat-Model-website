import { useEffect, useRef } from "react";
import ChatMessage from "@/components/ChatMessage";

export default function MessageList({ messages, loading }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-4">
      {messages.map((m) => (
        <ChatMessage key={m.id} message={m} />
      ))}
      {loading && (
        <div className="fade-up self-start w-full max-w-4xl">
          <div className="border-l-2 border-[#EAB308] pl-4 py-2">
            <div className="font-mono text-[10px] text-[#A1A1AA] tracking-[0.2em] mb-1">
              N8N · PROCESSING
            </div>
            <div className="font-mono text-sm text-[#FAFAFA] flex items-center">
              <span className="text-[#EAB308] mr-2">&gt;</span>
              <span>awaiting response</span>
              <span className="ml-1 dot text-[#EAB308]">.</span>
              <span className="dot text-[#EAB308]">.</span>
              <span className="dot text-[#EAB308]">.</span>
            </div>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
