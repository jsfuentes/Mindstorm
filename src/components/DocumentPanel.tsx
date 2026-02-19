"use client";

import dynamic from "next/dynamic";

const BlockEditor = dynamic(() => import("./BlockEditor"), { ssr: false });

export default function DocumentPanel({
  html,
  onHtmlChange,
  onAiCommand,
}: {
  html: string;
  onHtmlChange: (html: string) => void;
  onAiCommand: (blockHtml: string, command: string) => Promise<string>;
}) {
  const isEmpty = !html || html.includes("Empty document");

  return (
    <div className="flex-1 overflow-y-auto p-8" data-testid="document-panel">
      <div className="max-w-3xl mx-auto">
        {isEmpty ? (
          <div className="text-gray-400 text-center mt-32">
            <p className="text-lg">Start brainstorming</p>
            <p className="text-sm mt-2">
              Type your ideas below to begin building your document
            </p>
          </div>
        ) : (
          <BlockEditor
            html={html}
            onHtmlChange={onHtmlChange}
            onAiCommand={onAiCommand}
          />
        )}
      </div>
    </div>
  );
}
