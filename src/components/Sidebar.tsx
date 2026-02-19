"use client";

import { useState } from "react";
import type { Question, Idea } from "@/app/session.type";

type Tab = "questions" | "ideas";

export default function Sidebar({
  questions,
  ideas,
  loading,
}: {
  questions: Question[];
  ideas: Idea[];
  loading: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("questions");

  return (
    <aside
      className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col overflow-y-auto"
      data-testid="sidebar"
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <TabButton
          active={activeTab === "questions"}
          onClick={() => setActiveTab("questions")}
          label="Questions"
          loading={activeTab === "questions" && loading}
          testId="tab-questions"
        />
        <TabButton
          active={activeTab === "ideas"}
          onClick={() => setActiveTab("ideas")}
          label="Ideas"
          loading={false}
          testId="tab-ideas"
        />
      </div>

      {/* Content */}
      <div className="p-5">
        {activeTab === "questions" && (
          <div data-testid="questions-panel">
            {questions.length === 0 ? (
              <p className="text-sm text-gray-400" data-testid="questions-empty">
                Questions will appear here as you add content
              </p>
            ) : (
              <ul className="space-y-2" data-testid="questions-list">
                {questions.map((q) => (
                  <li
                    key={q.id}
                    className="text-sm text-gray-700 bg-white rounded-md p-3 border border-gray-100"
                  >
                    {q.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === "ideas" && (
          <div data-testid="ideas-panel">
            {ideas.length === 0 ? (
              <p className="text-sm text-gray-400" data-testid="ideas-empty">
                Ideas will appear here as you add content
              </p>
            ) : (
              <ul className="space-y-2" data-testid="ideas-list">
                {ideas.map((idea) => (
                  <li
                    key={idea.id}
                    className="text-sm text-gray-700 bg-white rounded-md p-3 border border-gray-100"
                  >
                    {idea.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  label,
  loading,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  loading: boolean;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`flex-1 py-3 text-sm font-medium transition-colors ${
        active
          ? "text-gray-900 border-b-2 border-gray-900"
          : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {label}
      {loading && (
        <span className="text-xs text-gray-400 ml-1.5">updating...</span>
      )}
    </button>
  );
}
