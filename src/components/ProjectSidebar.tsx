"use client";

import { useState, useEffect, useRef } from "react";
import type { Project } from "@/app/project.type";
import { useValidatePath } from "@/hooks/use-validate-path";
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

export default function ProjectSidebar({
  open,
  onOpenChange,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: (opts: { cwd: string; title: string }) => void;
  onDeleteProject: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[340px] sm:max-w-[340px] flex flex-col"
        showCloseButton={false}
      >
        <SheetHeader className="border-b pb-3">
          <SheetTitle>Projects</SheetTitle>
          <SheetDescription>Switch between documents</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {creating && (
            <CreateProjectForm
              onCancel={() => setCreating(false)}
              onCreate={(opts) => {
                setCreating(false);
                onCreateProject(opts);
              }}
            />
          )}
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              isActive={project.id === activeProjectId}
              onSelect={() => onSelectProject(project.id)}
              onDelete={() => onDeleteProject(project.id)}
              canDelete={projects.length > 1}
            />
          ))}
        </div>

        <div className="border-t pt-3 px-4 pb-4">
          <Button
            onClick={() => setCreating(true)}
            className="w-full"
            variant="outline"
            disabled={creating}
          >
            New Project
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CreateProjectForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (opts: { cwd: string; title: string }) => void;
}) {
  const [cwdInput, setCwdInput] = useState("");
  const [title, setTitle] = useState("");
  const [filesExpanded, setFilesExpanded] = useState(false);
  const [savedPaths, setSavedPaths] = useState<string[]>([]);
  const [showPathDropdown, setShowPathDropdown] = useState(false);
  const pathValidation = useValidatePath();
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Auto-derive title from last path segment
  function deriveTitleFromPath(p: string) {
    const clean = p.replace(/\/+$/, "");
    const seg = clean.split("/").pop() || "";
    return seg;
  }

  function handlePathChange(value: string) {
    setCwdInput(value);
    setShowPathDropdown(true);
    // Auto-derive title if user hasn't manually edited it
    if (!title || title === deriveTitleFromPath(cwdInput)) {
      setTitle(deriveTitleFromPath(value));
    }
  }

  function selectSavedPath(p: string) {
    setCwdInput(p);
    setShowPathDropdown(false);
    if (!title || title === deriveTitleFromPath(cwdInput)) {
      setTitle(deriveTitleFromPath(p));
    }
  }

  async function handleValidate() {
    const res = await pathValidation.validate(cwdInput);
    if (res.valid && res.resolvedPath) {
      setCwdInput(res.resolvedPath);
      if (!title || title === deriveTitleFromPath(cwdInput)) {
        setTitle(deriveTitleFromPath(res.resolvedPath));
      }
    }
  }

  function handleCreate() {
    // Save path if provided
    if (cwdInput) {
      fetch("/api/agents/saved-paths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: cwdInput }),
      }).catch(() => {});
    }
    onCreate({ cwd: cwdInput, title: title || "Untitled" });
  }

  const pathValid = pathValidation.result?.valid === true;
  const canCreate = !cwdInput || pathValid;

  const filteredPaths = savedPaths.filter(
    (p) =>
      p !== cwdInput &&
      (!cwdInput || p.toLowerCase().includes(cwdInput.toLowerCase()))
  );

  return (
    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 space-y-3">
      <p className="text-sm font-medium text-gray-700">New Project</p>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">
          Folder path (optional)
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1" ref={dropdownRef}>
            <Input
              value={cwdInput}
              onChange={(e) => handlePathChange(e.target.value)}
              onFocus={() => {
                if (filteredPaths.length > 0) setShowPathDropdown(true);
              }}
              placeholder="~/Projects/my-repo"
              className="text-xs"
            />
            {showPathDropdown && filteredPaths.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredPaths.map((p) => (
                  <button
                    key={p}
                    onClick={() => selectSavedPath(p)}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 font-mono truncate"
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
            className="text-xs"
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

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="text-xs"
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={!canCreate}
          className="flex-1"
        >
          Create
        </Button>
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  isActive,
  onSelect,
  onDelete,
  canDelete,
}: {
  project: Project;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const date = new Date(project.updatedAt);
  const timeStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors ${
        isActive
          ? "bg-blue-50 border-l-2 border-blue-500"
          : "hover:bg-gray-50 border-l-2 border-transparent"
      }`}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate ${
            isActive ? "font-medium text-blue-900" : "text-gray-700"
          }`}
        >
          {project.title}
        </p>
        {project.cwd && (
          <p className="text-xs text-gray-400 font-mono truncate">
            {project.cwd}
          </p>
        )}
        <p className="text-xs text-gray-400">{timeStr}</p>
      </div>
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
          aria-label="Delete project"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M2 4h10M5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M6 6.5v3M8 6.5v3" />
            <path d="M3.5 4l.5 7.5a1 1 0 0 0 1 .5h4a1 1 0 0 0 1-.5L10.5 4" />
          </svg>
        </button>
      )}
    </div>
  );
}
