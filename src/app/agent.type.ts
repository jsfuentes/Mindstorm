export type AgentStatus = "idle" | "running" | "complete" | "error";

export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

export type Agent = {
  id: string;
  name: string;
  cwd: string;
  sessionId: string;
  status: AgentStatus;
  messages: AgentMessage[];
};
