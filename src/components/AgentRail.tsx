"use client";

import type { Agent, AgentStatus } from "@/app/agent.type";

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: "bg-gray-300",
  running: "bg-blue-300/60 animate-pulse",
  complete: "bg-green-500",
  error: "bg-red-500",
};

export default function AgentRail({
  agents,
  activeAgentId,
  onSelectAgent,
  onCreateAgent,
  onOpenProjectSidebar,
}: {
  agents: Agent[];
  activeAgentId: string | null;
  onSelectAgent: (id: string) => void;
  onCreateAgent: () => void;
  onOpenProjectSidebar: () => void;
}) {
  return (
    <div className="w-12 bg-gray-50 border-r border-gray-200 flex flex-col items-center pt-3 gap-2">
      <button
        onClick={onOpenProjectSidebar}
        className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-1"
        aria-label="Projects"
        data-testid="projects-button"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M2 4h12M2 8h12M2 12h12" />
        </svg>
      </button>

      <button
        onClick={onCreateAgent}
        className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
        aria-label="New agent"
        data-testid="new-agent-button"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M7 1v12M1 7h12" />
        </svg>
      </button>

      {agents.map((agent, i) => (
        <button
          key={agent.id}
          onClick={() => onSelectAgent(agent.id)}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white transition-all ${
            STATUS_COLORS[agent.status]
          } ${
            activeAgentId === agent.id
              ? "ring-2 ring-offset-1 ring-blue-400"
              : ""
          }`}
          aria-label={`Agent ${i + 1}`}
          data-testid={`agent-circle-${i}`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}
