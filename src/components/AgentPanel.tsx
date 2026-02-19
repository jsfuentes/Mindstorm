"use client";

import { useState, useRef, useEffect } from "react";
import type { Agent } from "@/app/agent.type";
import { useValidatePath } from "@/hooks/use-validate-path";
import AgentMessages from "./AgentMessages";
import FileList from "./FileList";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AgentPanel({
  agent,
  open,
  onOpenChange,
  onUpdateAgent,
  onDeleteAgent,
  onRunAgent,
  onFollowUp,
  streaming,
}: {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateAgent: (id: string, updates: Partial<Agent>) => void;
  onDeleteAgent: (id: string) => void;
  onRunAgent: (id: string, prompt: string) => void;
  onFollowUp: (id: string, message: string) => void;
  streaming: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [followUpText, setFollowUpText] = useState("");
  const [filesExpanded, setFilesExpanded] = useState(false);
  const [savedPaths, setSavedPaths] = useState<string[]>([]);
  const [showPathDropdown, setShowPathDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const pathValidation = useValidatePath();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevAgentId = useRef<string | null>(null);

  // Reset validation state when switching agents
  useEffect(() => {
    if (agent && agent.id !== prevAgentId.current) {
      prevAgentId.current = agent.id;
      pathValidation.reset();
      setFilesExpanded(false);
      setPrompt("");
      setShowSettings(false);
    }
  }, [agent?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load saved paths on mount
  useEffect(() => {
    fetch("/api/agents/saved-paths")
      .then((r) => r.json())
      .then((paths: string[]) => setSavedPaths(paths))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPathDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!agent) return null;

  const hasRun = agent.messages.length > 0;
  const isRunning = agent.status === "running";

  function savePath(p: string) {
    if (!savedPaths.includes(p)) {
      setSavedPaths((prev) => [p, ...prev]);
    }
    fetch("/api/agents/saved-paths", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: p }),
    }).catch(() => {});
  }

  function runAgent() {
    if (prompt.trim() && agent!.cwd) {
      savePath(agent!.cwd);
      onRunAgent(agent!.id, prompt.trim());
      setPrompt("");
      onOpenChange(false);
    }
  }

  const filteredPaths = savedPaths.filter(
    (p) => p !== agent.cwd && (!agent.cwd || p.toLowerCase().includes(agent.cwd.toLowerCase()))
  );

  // After first run: wider panel, chat-focused layout
  const panelWidth = hasRun ? "w-[640px] sm:max-w-[640px]" : "w-[480px] sm:max-w-[480px]";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className={`${panelWidth} flex flex-col`}
        showCloseButton={false}
      >
        <SheetHeader className="flex-row items-center justify-between gap-2 border-b pb-3">
          <div>
            <SheetTitle>{agent.name}</SheetTitle>
            {!hasRun && (
              <SheetDescription>Read-only code agent</SheetDescription>
            )}
            {hasRun && (
              <SheetDescription className="font-mono text-xs truncate max-w-[400px]">
                {agent.cwd}
              </SheetDescription>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasRun && (
              <button
                onClick={() => setShowSettings((v) => !v)}
                className={`p-1.5 rounded-md transition-colors ${
                  showSettings
                    ? "text-gray-700 bg-gray-100"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
                aria-label="Settings"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                  <path d="M13 10a1.1 1.1 0 0 0 .22 1.21l.04.04a1.33 1.33 0 1 1-1.89 1.89l-.04-.04A1.1 1.1 0 0 0 9.5 13.77v.06a1.33 1.33 0 0 1-2.67 0v-.03a1.1 1.1 0 0 0-.72-1 1.1 1.1 0 0 0-1.21.22l-.04.04a1.33 1.33 0 1 1-1.89-1.89l.04-.04A1.1 1.1 0 0 0 3.23 9.5h-.06a1.33 1.33 0 0 1 0-2.67h.03a1.1 1.1 0 0 0 1-.72 1.1 1.1 0 0 0-.22-1.21l-.04-.04a1.33 1.33 0 1 1 1.89-1.89l.04.04A1.1 1.1 0 0 0 7.5 3.23V3.17a1.33 1.33 0 0 1 2.67 0v.03a1.1 1.1 0 0 0 .67 1 1.1 1.1 0 0 0 1.21-.22l.04-.04a1.33 1.33 0 1 1 1.89 1.89l-.04.04A1.1 1.1 0 0 0 13.77 7.5h.06a1.33 1.33 0 0 1 0 2.67h-.03a1.1 1.1 0 0 0-1 .67Z" />
                </svg>
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteAgent(agent.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        </SheetHeader>

        {/* Path config — always shown before first run, collapsible after */}
        {(!hasRun || showSettings) && (
          <PathConfig
            agent={agent}
            hasRun={hasRun}
            pathValidation={pathValidation}
            filteredPaths={filteredPaths}
            showPathDropdown={showPathDropdown}
            setShowPathDropdown={setShowPathDropdown}
            filesExpanded={filesExpanded}
            setFilesExpanded={setFilesExpanded}
            dropdownRef={dropdownRef}
            onUpdateAgent={onUpdateAgent}
          />
        )}

        {/* Initial prompt (before first run) */}
        {!hasRun && (
          <div className="px-4 space-y-2">
            <label className="text-sm font-medium text-gray-700">Prompt</label>
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What would you like the agent to investigate?"
              className="w-full h-28 rounded-md border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) {
                  e.preventDefault();
                  runAgent();
                }
              }}
            />
            <Button
              onClick={runAgent}
              disabled={!prompt.trim() || !agent.cwd || isRunning}
              className="w-full"
            >
              Run Agent
            </Button>
          </div>
        )}

        {/* Conversation thread */}
        {hasRun && (
          <div className="flex-1 overflow-hidden flex flex-col px-4 min-h-0">
            <AgentMessages
              messages={agent.messages}
              streaming={streaming}
            />
          </div>
        )}

        {/* Follow-up input */}
        {hasRun && !isRunning && (
          <div className="px-4 pb-4 flex gap-2">
            <Input
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              placeholder="Follow up..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && followUpText.trim()) {
                  onFollowUp(agent.id, followUpText.trim());
                  setFollowUpText("");
                }
              }}
            />
            <Button
              onClick={() => {
                if (followUpText.trim()) {
                  onFollowUp(agent.id, followUpText.trim());
                  setFollowUpText("");
                }
              }}
              disabled={!followUpText.trim()}
              size="sm"
            >
              Send
            </Button>
          </div>
        )}

        {isRunning && (
          <div className="px-4 pb-4">
            <p className="text-xs text-gray-400 animate-pulse">
              Agent is running...
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PathConfig({
  agent,
  hasRun,
  pathValidation,
  filteredPaths,
  showPathDropdown,
  setShowPathDropdown,
  filesExpanded,
  setFilesExpanded,
  dropdownRef,
  onUpdateAgent,
}: {
  agent: Agent;
  hasRun: boolean;
  pathValidation: ReturnType<typeof useValidatePath>;
  filteredPaths: string[];
  showPathDropdown: boolean;
  setShowPathDropdown: (v: boolean) => void;
  filesExpanded: boolean;
  setFilesExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onUpdateAgent: (id: string, updates: Partial<Agent>) => void;
}) {
  return (
    <div className="px-4 space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Repository path
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1" ref={dropdownRef}>
          <Input
            value={agent.cwd}
            onChange={(e) => {
              onUpdateAgent(agent.id, { cwd: e.target.value });
              setShowPathDropdown(true);
            }}
            onFocus={() => {
              if (filteredPaths.length > 0) setShowPathDropdown(true);
            }}
            placeholder="/Users/you/Projects/repo"
            disabled={hasRun}
          />
          {showPathDropdown && filteredPaths.length > 0 && !hasRun && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
              {filteredPaths.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    onUpdateAgent(agent.id, { cwd: p });
                    setShowPathDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 font-mono truncate"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!agent.cwd || pathValidation.loading || hasRun}
          onClick={async () => {
            const res = await pathValidation.validate(agent.cwd);
            if (res.valid && res.resolvedPath) {
              onUpdateAgent(agent.id, { cwd: res.resolvedPath });
            }
          }}
        >
          {pathValidation.loading ? "..." : "Validate"}
        </Button>
      </div>
      <p className="text-xs text-gray-400">
        Use an absolute path, e.g. ~/Projects/my-repo
      </p>
      {pathValidation.result && !pathValidation.result.valid && (
        <p className="text-xs text-red-500">
          {pathValidation.result.error}
        </p>
      )}
      {pathValidation.result?.valid && (
        <FileList
          entries={pathValidation.result.topEntries || []}
          fileCount={pathValidation.result.fileCount || 0}
          expanded={filesExpanded}
          onToggle={() => setFilesExpanded((v: boolean) => !v)}
        />
      )}
    </div>
  );
}

