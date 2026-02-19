"use client";

import { useState, useCallback } from "react";

export default function ChatInput({
  onSubmit,
  queue,
  processingMessage,
}: {
  onSubmit: (message: string) => void;
  queue: string[];
  processingMessage: string | null;
}) {
  const [input, setInput] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setInput("");
  }, [input, onSubmit]);

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="max-w-3xl mx-auto">
        {(processingMessage || queue.length > 0) && (
          <div className="flex flex-col gap-1.5 mb-3" data-testid="message-queue">
            {processingMessage && (
              <div
                className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600"
                data-testid="processing-message"
              >
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse shrink-0" />
                <span className="truncate">{processingMessage}</span>
              </div>
            )}
            {queue.map((msg, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-400"
                data-testid="queued-message"
              >
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full shrink-0" />
                <span className="truncate">{msg}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Type your ideas or commands..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
            data-testid="chat-input"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="rounded-lg bg-gray-900 px-5 py-3 text-sm text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="send-button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
