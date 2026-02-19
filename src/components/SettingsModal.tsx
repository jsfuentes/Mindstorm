"use client";

import { useState, useEffect, useRef } from "react";
import { useValidatePath } from "@/hooks/use-validate-path";
import FileList from "./FileList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TemplateSettings = {
  name: string;
  content: string;
};

type Tab = "project" | "templates";

export default function SettingsModal({
  open,
  onClose,
  projectCwd,
  onProjectCwdChange,
}: {
  open: boolean;
  onClose: () => void;
  projectCwd: string;
  onProjectCwdChange: (cwd: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("project");
  const [templateSettings, setTemplateSettings] =
    useState<TemplateSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings/template")
      .then((r) => r.json())
      .then(setTemplateSettings);
  }, [open]);

  if (!open) return null;

  const handleSaveTemplate = async () => {
    if (!templateSettings) return;
    setSaving(true);
    await fetch("/api/settings/template", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(templateSettings),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={onClose}
      data-testid="settings-overlay"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-[800px] h-[600px] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-testid="settings-modal"
      >
        {/* Sidebar */}
        <div
          className="w-48 bg-gray-50 border-r border-gray-200 p-4"
          data-testid="settings-sidebar"
        >
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Settings
          </h2>
          <button
            onClick={() => setTab("project")}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium mb-1 ${
              tab === "project"
                ? "bg-gray-200 text-gray-900"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Project
          </button>
          <button
            onClick={() => setTab("templates")}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
              tab === "templates"
                ? "bg-gray-200 text-gray-900"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            data-testid="settings-templates-tab"
          >
            Templates
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-6 min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {tab === "project" ? "Project" : "Template"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              data-testid="settings-close-button"
            >
              &times;
            </button>
          </div>

          {tab === "project" && (
            <ProjectTab
              cwd={projectCwd}
              onCwdChange={onProjectCwdChange}
            />
          )}

          {tab === "templates" && (
            <TemplateTab
              settings={templateSettings}
              onChange={setTemplateSettings}
              onSave={handleSaveTemplate}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectTab({
  cwd,
  onCwdChange,
}: {
  cwd: string;
  onCwdChange: (cwd: string) => void;
}) {
  const [cwdInput, setCwdInput] = useState(cwd);
  const [filesExpanded, setFilesExpanded] = useState(false);
  const [savedPaths, setSavedPaths] = useState<string[]>([]);
  const [showPathDropdown, setShowPathDropdown] = useState(false);
  const pathValidation = useValidatePath();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync when prop changes (project switch)
  useEffect(() => {
    setCwdInput(cwd);
    pathValidation.reset();
    setFilesExpanded(false);
  }, [cwd]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load saved paths
  useEffect(() => {
    fetch("/api/agents/saved-paths")
      .then((r) => r.json())
      .then((paths: string[]) => setSavedPaths(paths))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowPathDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleValidate() {
    const res = await pathValidation.validate(cwdInput);
    if (res.valid && res.resolvedPath) {
      setCwdInput(res.resolvedPath);
    }
  }

  function handleSave() {
    // Save path to saved-paths
    if (cwdInput) {
      fetch("/api/agents/saved-paths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: cwdInput }),
      }).catch(() => {});
    }
    onCwdChange(cwdInput);
  }

  function handleClear() {
    setCwdInput("");
    pathValidation.reset();
    onCwdChange("");
  }

  const filteredPaths = savedPaths.filter(
    (p) =>
      p !== cwdInput &&
      (!cwdInput || p.toLowerCase().includes(cwdInput.toLowerCase()))
  );

  const pathChanged = cwdInput !== cwd;
  const pathValid = pathValidation.result?.valid === true;
  const canSave = pathChanged && (!cwdInput || pathValid);

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Codebase folder
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Link a folder so insights and questions reference your actual code.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1" ref={dropdownRef}>
            <Input
              value={cwdInput}
              onChange={(e) => {
                setCwdInput(e.target.value);
                setShowPathDropdown(true);
                pathValidation.reset();
              }}
              onFocus={() => {
                if (filteredPaths.length > 0) setShowPathDropdown(true);
              }}
              placeholder="~/Projects/my-repo"
            />
            {showPathDropdown && filteredPaths.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredPaths.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setCwdInput(p);
                      setShowPathDropdown(false);
                      pathValidation.reset();
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
            disabled={!cwdInput || pathValidation.loading}
            onClick={handleValidate}
          >
            {pathValidation.loading ? "..." : "Validate"}
          </Button>
        </div>

        {pathValidation.result && !pathValidation.result.valid && (
          <p className="text-xs text-red-500 mt-1">
            {pathValidation.result.error}
          </p>
        )}
        {pathValidation.result?.valid && (
          <div className="mt-2">
            <FileList
              entries={pathValidation.result.topEntries || []}
              fileCount={pathValidation.result.fileCount || 0}
              expanded={filesExpanded}
              onToggle={() => setFilesExpanded((v) => !v)}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {cwd && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            Remove folder
          </Button>
        )}
        {canSave && (
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        )}
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-1">
          How insights work
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          {cwd
            ? "Questions and ideas are generated by Claude Code running in your project folder. It can read files, understand architecture, and produce insights grounded in your actual codebase."
            : "Questions and ideas are generated from the document text alone. Link a codebase folder above so insights reference your actual code and architecture."}
        </p>
      </div>
    </div>
  );
}

function TemplateTab({
  settings,
  onChange,
  onSave,
  saving,
}: {
  settings: TemplateSettings | null;
  onChange: (s: TemplateSettings) => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (!settings) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <label className="text-sm font-medium text-gray-700 mb-1">Name</label>
      <input
        type="text"
        value={settings.name}
        onChange={(e) => onChange({ ...settings, name: e.target.value })}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400"
        data-testid="template-name-input"
      />

      <label className="text-sm font-medium text-gray-700 mb-1">
        Template
      </label>
      <textarea
        value={settings.content}
        onChange={(e) => onChange({ ...settings, content: e.target.value })}
        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono resize-none min-h-0 focus:outline-none focus:ring-2 focus:ring-gray-400"
        data-testid="template-content-input"
      />

      <div className="mt-4 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50"
          data-testid="settings-save-button"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
