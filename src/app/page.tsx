"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ChatInput from "@/components/ChatInput";
import DocumentPanel from "@/components/DocumentPanel";
import Sidebar from "@/components/Sidebar";
import SettingsModal from "@/components/SettingsModal";
import ConfirmClearModal from "@/components/ConfirmClearModal";
import AgentRail from "@/components/AgentRail";
import AgentPanel from "@/components/AgentPanel";
import ProjectSidebar from "@/components/ProjectSidebar";
import type { Question, Idea } from "@/app/session.type";
import type { Agent } from "@/app/agent.type";
import type { Project } from "@/app/project.type";
import { Toaster, toast } from "sonner";

export default function Home() {
  const [documentHtml, setDocumentHtml] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [history, setHistory] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [processingMessage, setProcessingMessage] = useState<string | null>(
    null
  );

  // Agent state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const [agentStreaming, setAgentStreaming] = useState("");
  const agentsRef = useRef(agents);
  agentsRef.current = agents;

  // Project state
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectCwd, setActiveProjectCwd] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSidebarOpen, setProjectSidebarOpen] = useState(false);

  const [loaded, setLoaded] = useState(false);

  const latestDocRef = useRef(documentHtml);
  latestDocRef.current = documentHtml;
  const historyRef = useRef(history);
  historyRef.current = history;
  const activeProjectRef = useRef(activeProjectId);
  activeProjectRef.current = activeProjectId;
  const activeProjectCwdRef = useRef(activeProjectCwd);
  activeProjectCwdRef.current = activeProjectCwd;
  const prevDocTextRef = useRef<string | null>(null);
  const editSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load active project on mount
  useEffect(() => {
    fetch("/api/projects/active")
      .then((r) => r.json())
      .then((data) => {
        if (data.project) {
          setActiveProjectId(data.project.id);
          setActiveProjectCwd(data.project.cwd || "");
          setDocumentHtml(data.project.documentHtml || "");
          setHistory(data.project.history || []);
          setAgents(data.agents || []);
          setProjects(data.projects || []);

          // If empty doc, load template
          if (!data.project.documentHtml) {
            loadTemplateHtml().then((html) => {
              if (html) setDocumentHtml(html);
            });
          }
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInsights = useCallback(async (html: string, cwd?: string) => {
    if (!html || html.includes("Empty document")) return;
    setInsightsLoading(true);
    try {
      const body: Record<string, string> = { documentHtml: html };
      if (cwd) body.cwd = cwd;
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setQuestions(data.questions || []);
      setIdeas(data.ideas || []);
    } catch {
      // Silently handle — sidebar will retain previous state
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  // Fetch insights when the document text actually changes
  useEffect(() => {
    if (!loaded || !documentHtml || documentHtml.includes("Empty document")) return;

    // Extract plain text to compare content, ignoring HTML markup changes
    const tmp = document.createElement("div");
    tmp.innerHTML = documentHtml;
    const currentText = tmp.textContent || "";

    if (currentText === prevDocTextRef.current) return;
    prevDocTextRef.current = currentText;

    fetchInsights(documentHtml, activeProjectCwdRef.current);
  }, [loaded, documentHtml, activeProjectCwd, fetchInsights]);

  const processMessageRef = useRef<
    ((msg: string) => Promise<void>) | null
  >(null);
  processMessageRef.current = async (message: string) => {
    const newHistory = [
      ...historyRef.current,
      { role: "user" as const, content: message },
    ];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          documentHtml: latestDocRef.current,
          history: newHistory,
        }),
      });
      const data = await res.json();

      const updatedHtml = data.documentHtml || latestDocRef.current;
      const updatedHistory = [
        ...newHistory,
        { role: "assistant" as const, content: updatedHtml },
      ];
      setDocumentHtml(updatedHtml);
      setHistory(updatedHistory);

      // Persist session to disk
      const pid = activeProjectRef.current;
      if (pid) {
        fetch("/api/session", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentHtml: updatedHtml,
            history: updatedHistory,
            projectId: pid,
          }),
        }).catch(() => {});
      }
    } catch {
      // Silently handle
    }
  };

  // Process queue: pick up the next message when idle
  useEffect(() => {
    if (processingMessage !== null || messageQueue.length === 0) return;

    const next = messageQueue[0];
    setMessageQueue((prev) => prev.slice(1));
    setProcessingMessage(next);

    processMessageRef.current!(next).finally(() => {
      setProcessingMessage(null);
    });
  }, [messageQueue, processingMessage]);

  const handleSubmit = useCallback((message: string) => {
    setMessageQueue((prev) => [...prev, message]);
  }, []);

  const loadTemplateHtml = useCallback(async () => {
    const res = await fetch("/api/settings/template");
    const template = await res.json();
    if (!template.content) return "";
    return template.content
      .split("\n\n")
      .map((block: string) => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        if (!trimmed.startsWith("[") && !trimmed.includes("\n") && trimmed.length < 100) {
          return `<h2>${trimmed}</h2>`;
        }
        return `<p>${trimmed}</p>`;
      })
      .filter(Boolean)
      .join("\n");
  }, []);

  // Handle inline edits from the block editor
  const handleDocumentEdit = useCallback((html: string) => {
    setDocumentHtml(html);

    // Debounced auto-save to session (2s)
    if (editSaveTimerRef.current) clearTimeout(editSaveTimerRef.current);
    editSaveTimerRef.current = setTimeout(() => {
      const pid = activeProjectRef.current;
      if (!pid) return;
      fetch("/api/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentHtml: html,
          history: historyRef.current,
          projectId: pid,
        }),
      }).catch(() => {});
    }, 2000);
  }, []);

  // Handle per-block AI commands (rewrite/condense/expand)
  const COMMAND_LABELS: Record<string, string> = {
    rewrite: "Rewriting",
    condense: "Condensing",
    expand: "Expanding",
  };

  const handleBlockAiCommand = useCallback(
    (blockHtml: string, command: string): Promise<string> => {
      const label = COMMAND_LABELS[command] ?? "Processing";

      const promise = fetch("/api/block-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockHtml, command }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.html) throw new Error("No response from AI");
          return data.html as string;
        });

      toast.promise(promise, {
        loading: `${label} section...`,
        success: "Done!",
        error: "Failed to update section",
      });

      return promise;
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // --- Agent handlers ---
  const persistAgents = useCallback((updated: Agent[]) => {
    const pid = activeProjectRef.current;
    if (!pid) return;
    fetch("/api/agents", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agents: updated, projectId: pid }),
    }).catch(() => {});
  }, []);

  const handleCreateAgent = useCallback(() => {
    const id = crypto.randomUUID();
    const agent: Agent = {
      id,
      name: `Agent ${agentsRef.current.length + 1}`,
      cwd: "",
      sessionId: crypto.randomUUID(),
      status: "idle",
      messages: [],
    };
    const updated = [...agentsRef.current, agent];
    setAgents(updated);
    setActiveAgentId(id);
    setAgentPanelOpen(true);
    setProjectSidebarOpen(false);
    persistAgents(updated);
  }, [persistAgents]);

  const handleUpdateAgent = useCallback(
    (id: string, updates: Partial<Agent>) => {
      const updated = agentsRef.current.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      );
      setAgents(updated);
      persistAgents(updated);
    },
    [persistAgents]
  );

  const handleDeleteAgent = useCallback(
    (id: string) => {
      const updated = agentsRef.current.filter((a) => a.id !== id);
      setAgents(updated);
      setAgentPanelOpen(false);
      setActiveAgentId(null);
      fetch(`/api/agents/${id}`, { method: "DELETE" }).catch(() => {});
      persistAgents(updated);
    },
    [persistAgents]
  );

  const handleRunAgent = useCallback(
    async (id: string, prompt: string, isFollowUp = false) => {
      const agent = agentsRef.current.find((a) => a.id === id);
      if (!agent) return;

      // Add user message + set running
      const withUserMsg = agentsRef.current.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "running" as const,
              messages: [...a.messages, { role: "user" as const, content: prompt }],
            }
          : a
      );
      setAgents(withUserMsg);
      agentsRef.current = withUserMsg;
      setAgentStreaming("");

      try {
        const res = await fetch("/api/agents/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            cwd: agent.cwd,
            sessionId: agent.sessionId,
            isFollowUp,
          }),
        });

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "done") continue;
              if (parsed.type === "error") {
                fullText += `\n[Error: ${parsed.error}]`;
                setAgentStreaming(fullText);
                continue;
              }
              // Claude stream-json: look for assistant result text
              if (parsed.type === "result" && parsed.result) {
                fullText = parsed.result;
                setAgentStreaming(fullText);
              } else if (parsed.type === "content_block_delta") {
                fullText += parsed.delta?.text || "";
                setAgentStreaming(fullText);
              } else if (parsed.type === "assistant" && parsed.message) {
                fullText += parsed.message;
                setAgentStreaming(fullText);
              }
            } catch {
              // Raw text line from claude
              if (data.trim() && !data.startsWith("{")) {
                fullText += data;
                setAgentStreaming(fullText);
              }
            }
          }
        }

        // Finalize: add assistant message, set complete
        const finalAgents = agentsRef.current.map((a) =>
          a.id === id
            ? {
                ...a,
                status: "complete" as const,
                messages: [
                  ...a.messages,
                  { role: "assistant" as const, content: fullText || "(No response)" },
                ],
              }
            : a
        );
        setAgents(finalAgents);
        agentsRef.current = finalAgents;
        setAgentStreaming("");
        persistAgents(finalAgents);
      } catch (err) {
        const errAgents = agentsRef.current.map((a) =>
          a.id === id ? { ...a, status: "error" as const } : a
        );
        setAgents(errAgents);
        agentsRef.current = errAgents;
        setAgentStreaming("");
        persistAgents(errAgents);
        toast.error(`Agent error: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    },
    [persistAgents]
  );

  const handleFollowUp = useCallback(
    (id: string, message: string) => {
      handleRunAgent(id, message, true);
    },
    [handleRunAgent]
  );

  const handleSelectAgent = useCallback((id: string) => {
    setActiveAgentId(id);
    setAgentPanelOpen(true);
    setProjectSidebarOpen(false);
  }, []);

  const handleCopy = useCallback(() => {
    const tmp = document.createElement("div");
    tmp.innerHTML = documentHtml;
    navigator.clipboard.writeText(tmp.textContent || "");
  }, [documentHtml]);

  const handleClear = useCallback(async () => {
    setClearConfirmOpen(false);
    const pid = activeProjectRef.current;
    if (pid) {
      fetch("/api/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentHtml: "", history: [], projectId: pid }),
      }).catch(() => {});
    }
    // Reset state and reload template
    setHistory([]);
    setQuestions([]);
    setIdeas([]);
    const html = await loadTemplateHtml();
    setDocumentHtml(html);
  }, [loadTemplateHtml]);

  // --- Project handlers ---
  const handleOpenProjectSidebar = useCallback(() => {
    setProjectSidebarOpen(true);
    setAgentPanelOpen(false);
  }, []);

  const handleSelectProject = useCallback(async (id: string) => {
    if (id === activeProjectRef.current) {
      setProjectSidebarOpen(false);
      return;
    }

    try {
      const res = await fetch("/api/projects/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      });
      const data = await res.json();

      setActiveProjectId(data.project.id);
      setActiveProjectCwd(data.project.cwd || "");
      setDocumentHtml(data.project.documentHtml || "");
      setHistory(data.project.history || []);
      setAgents(data.agents || []);
      setActiveAgentId(null);
      setAgentPanelOpen(false);
      setProjectSidebarOpen(false);

      // Reset insights
      prevDocTextRef.current = null;
      setQuestions([]);
      setIdeas([]);
    } catch {
      toast.error("Failed to switch project");
    }
  }, []);

  const handleCreateProject = useCallback(async (opts: { cwd: string; title: string }) => {
    try {
      const templateHtml = await loadTemplateHtml();
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateHtml, cwd: opts.cwd, title: opts.title }),
      });
      const newProject = await res.json();

      setProjects((prev) => [
        { id: newProject.id, title: newProject.title, cwd: newProject.cwd, updatedAt: newProject.updatedAt },
        ...prev,
      ]);
      setActiveProjectId(newProject.id);
      setActiveProjectCwd(newProject.cwd || "");
      setDocumentHtml(templateHtml);
      setHistory([]);
      setAgents([]);
      setActiveAgentId(null);
      setAgentPanelOpen(false);
      setProjectSidebarOpen(false);

      // Reset insights
      prevDocTextRef.current = null;
      setQuestions([]);
      setIdeas([]);
    } catch {
      toast.error("Failed to create project");
    }
  }, [loadTemplateHtml]);

  const handleProjectCwdChange = useCallback(
    async (cwd: string) => {
      const pid = activeProjectRef.current;
      if (!pid) return;

      setActiveProjectCwd(cwd);
      setProjects((prev) =>
        prev.map((p) => (p.id === pid ? { ...p, cwd } : p))
      );

      try {
        await fetch(`/api/projects/${pid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cwd }),
        });

        // Re-fetch insights with new cwd context
        prevDocTextRef.current = null;
        if (latestDocRef.current) {
          fetchInsights(latestDocRef.current, cwd);
        }
      } catch {
        toast.error("Failed to update project folder");
      }
    },
    [fetchInsights]
  );

  const handleDeleteProject = useCallback(
    async (id: string) => {
      if (projects.length <= 1) return;

      try {
        await fetch(`/api/projects/${id}`, { method: "DELETE" });

        const remaining = projects.filter((p) => p.id !== id);
        setProjects(remaining);

        // If deleting the active project, switch to the first remaining
        if (id === activeProjectRef.current && remaining.length > 0) {
          handleSelectProject(remaining[0].id);
        }
      } catch {
        toast.error("Failed to delete project");
      }
    },
    [projects, handleSelectProject]
  );

  const activeAgent = agents.find((a) => a.id === activeAgentId) ?? null;

  return (
    <div className="flex h-screen" data-testid="app-container">
      {/* Agent Rail */}
      <AgentRail
        agents={agents}
        activeAgentId={activeAgentId}
        onSelectAgent={handleSelectAgent}
        onCreateAgent={handleCreateAgent}
        onOpenProjectSidebar={handleOpenProjectSidebar}
      />

      {/* Agent Slide-out Panel */}
      <AgentPanel
        agent={activeAgent}
        open={agentPanelOpen}
        onOpenChange={setAgentPanelOpen}
        onUpdateAgent={handleUpdateAgent}
        onDeleteAgent={handleDeleteAgent}
        onRunAgent={handleRunAgent}
        onFollowUp={handleFollowUp}
        streaming={agentStreaming}
      />

      {/* Project Sidebar */}
      <ProjectSidebar
        open={projectSidebarOpen}
        onOpenChange={setProjectSidebarOpen}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* Document Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            aria-label="Copy document"
            data-testid="copy-button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="7" width="10" height="10" rx="2" />
              <path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            </svg>
          </button>
          <button
            onClick={() => setClearConfirmOpen(true)}
            className="p-2 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100"
            aria-label="Clear document"
            data-testid="clear-button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h14M7 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M8 10v5M12 10v5" />
              <path d="M5 6l1 11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-11" />
            </svg>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            aria-label="Settings"
            data-testid="settings-button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
              <path d="M16.167 12.5a1.375 1.375 0 0 0 .275 1.517l.05.05a1.667 1.667 0 1 1-2.358 2.358l-.05-.05a1.375 1.375 0 0 0-1.517-.275 1.375 1.375 0 0 0-.834 1.258v.142a1.667 1.667 0 1 1-3.333 0v-.075a1.375 1.375 0 0 0-.9-1.258 1.375 1.375 0 0 0-1.517.275l-.05.05a1.667 1.667 0 1 1-2.358-2.358l.05-.05A1.375 1.375 0 0 0 3.9 12.567a1.375 1.375 0 0 0-1.258-.834h-.142a1.667 1.667 0 0 1 0-3.333h.075a1.375 1.375 0 0 0 1.258-.9 1.375 1.375 0 0 0-.275-1.517l-.05-.05A1.667 1.667 0 1 1 5.867 3.575l.05.05a1.375 1.375 0 0 0 1.517.275h.066a1.375 1.375 0 0 0 .833-1.258v-.142a1.667 1.667 0 0 1 3.334 0v.075a1.375 1.375 0 0 0 .833 1.258 1.375 1.375 0 0 0 1.517-.275l.05-.05a1.667 1.667 0 1 1 2.358 2.358l-.05.05a1.375 1.375 0 0 0-.275 1.517v.067a1.375 1.375 0 0 0 1.258.833h.142a1.667 1.667 0 0 1 0 3.334h-.075a1.375 1.375 0 0 0-1.258.833Z" />
            </svg>
          </button>
        </div>
        <DocumentPanel
          html={documentHtml}
          onHtmlChange={handleDocumentEdit}
          onAiCommand={handleBlockAiCommand}
        />
        <ChatInput
          onSubmit={handleSubmit}
          queue={messageQueue}
          processingMessage={processingMessage}
        />
      </div>

      {/* Right: Sidebar */}
      <Sidebar
        questions={questions}
        ideas={ideas}
        loading={insightsLoading}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        projectCwd={activeProjectCwd}
        onProjectCwdChange={handleProjectCwdChange}
      />
      <ConfirmClearModal
        open={clearConfirmOpen}
        onConfirm={handleClear}
        onCancel={() => setClearConfirmOpen(false)}
      />

      <Toaster position="top-center" richColors />
    </div>
  );
}
