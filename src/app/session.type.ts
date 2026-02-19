export type Question = {
  id: string;
  text: string;
  importance: number;
};

export type Idea = {
  id: string;
  text: string;
  relevance: number;
};

export type SessionState = {
  documentHtml: string;
  questions: Question[];
  ideas: Idea[];
  history: { role: "user" | "assistant"; content: string }[];
};
