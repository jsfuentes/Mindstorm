"use client";

import { useEffect, useRef } from "react";
import type { AgentMessage } from "@/app/agent.type";

export default function AgentMessages({
  messages,
  streaming,
}: {
  messages: AgentMessage[];
  streaming: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  if (messages.length === 0 && !streaming) return null;

  return (
    <div className="flex-1 overflow-y-auto space-y-3 py-3">
      {messages.map((msg, i) => (
        <div key={i}>
          <div className="text-xs font-medium text-gray-500 mb-1">
            {msg.role === "user" ? "You" : "Agent"}
          </div>
          <div
            className={`text-sm whitespace-pre-wrap rounded-md p-3 ${
              msg.role === "user"
                ? "bg-blue-50 text-gray-800"
                : "bg-gray-50 text-gray-800 font-mono text-xs leading-relaxed"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}

      {streaming && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Agent</div>
          <div className="text-sm whitespace-pre-wrap rounded-md p-3 bg-gray-50 text-gray-800 font-mono text-xs leading-relaxed">
            {streaming}
            <span className="animate-pulse">|</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
