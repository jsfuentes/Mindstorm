import { getDb } from "./db";
import { deriveTitle } from "./project-helpers";

// --- Row types (DB shape) ---

type ProjectRow = {
  id: string;
  title: string;
  cwd: string;
  document_html: string;
  history: string;
  created_at: string;
  updated_at: string;
};

type ProjectListRow = {
  id: string;
  title: string;
  cwd: string;
  updated_at: string;
};

type AgentRow = {
  id: string;
  project_id: string;
  name: string;
  cwd: string;
  session_id: string;
  status: string;
  messages: string;
};

// --- Helpers ---

function toAgent(r: AgentRow) {
  return {
    id: r.id,
    name: r.name,
    cwd: r.cwd,
    sessionId: r.session_id,
    status: r.status,
    messages: JSON.parse(r.messages),
  };
}

function toProject(r: ProjectRow) {
  return {
    id: r.id,
    title: r.title,
    cwd: r.cwd,
    documentHtml: r.document_html,
    history: JSON.parse(r.history),
    updatedAt: r.updated_at,
  };
}

function toProjectListItem(r: ProjectListRow) {
  return { id: r.id, title: r.title, cwd: r.cwd, updatedAt: r.updated_at };
}

// --- Projects ---

export function listProjects() {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, title, cwd, updated_at FROM projects ORDER BY updated_at DESC"
    )
    .all() as ProjectListRow[];
  return rows.map(toProjectListItem);
}

export function getProject(id: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(id) as ProjectRow | undefined;
  return row ? toProject(row) : null;
}

export function createProject(opts: {
  title?: string;
  cwd?: string;
  templateHtml?: string;
}) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const title = opts.title || "Untitled";
  const cwd = opts.cwd || "";

  db.prepare(
    `INSERT INTO projects (id, title, cwd, document_html, history, created_at, updated_at)
     VALUES (?, ?, ?, ?, '[]', ?, ?)`
  ).run(id, title, cwd, opts.templateHtml || "", now, now);

  setActiveProjectId(id);
  return { id, title, cwd, updatedAt: now };
}

export function updateProject(id: string, updates: { cwd?: string }) {
  const db = getDb();
  if (updates.cwd !== undefined) {
    db.prepare(
      "UPDATE projects SET cwd = ?, updated_at = ? WHERE id = ?"
    ).run(updates.cwd, new Date().toISOString(), id);
  }
}

export function deleteProject(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);

  // If this was the active project, switch to most recent
  const active = getActiveProjectId();
  if (active === id) {
    const next = db
      .prepare("SELECT id FROM projects ORDER BY updated_at DESC LIMIT 1")
      .get() as { id: string } | undefined;
    if (next) {
      setActiveProjectId(next.id);
    } else {
      db.prepare(
        "DELETE FROM app_state WHERE key = 'active_project_id'"
      ).run();
    }
  }
}

export function projectExists(id: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM projects WHERE id = ?")
    .get(id) as { id: string } | undefined;
  return !!row;
}

// --- Active project ---

export function getActiveProjectId(): string | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_state WHERE key = 'active_project_id'")
    .get() as { value: string } | undefined;
  return row?.value;
}

export function setActiveProjectId(id: string) {
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO app_state (key, value) VALUES ('active_project_id', ?)"
  ).run(id);
}

export function getActiveProjectData() {
  const db = getDb();
  let projectId = getActiveProjectId();

  if (!projectId) {
    const latest = db
      .prepare("SELECT id FROM projects ORDER BY updated_at DESC LIMIT 1")
      .get() as { id: string } | undefined;

    if (latest) {
      projectId = latest.id;
    } else {
      projectId = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO projects (id, title, document_html, history, created_at, updated_at)
         VALUES (?, 'Untitled', '', '[]', ?, ?)`
      ).run(projectId, now, now);
    }
    setActiveProjectId(projectId);
  }

  const project = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(projectId) as ProjectRow | undefined;

  if (!project) return null;

  const agents = getAgentsByProject(projectId);
  const projects = listProjects();

  return { project: toProject(project), agents, projects };
}

export function switchActiveProject(id: string) {
  setActiveProjectId(id);
  const project = getProject(id);
  if (!project) return null;
  const agents = getAgentsByProject(id);
  return { project, agents };
}

// --- Session ---

export function getSession(projectId: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT document_html, history FROM projects WHERE id = ?")
    .get(projectId) as
    | { document_html: string; history: string }
    | undefined;
  if (!row) return { documentHtml: "", history: [] };
  return { documentHtml: row.document_html, history: JSON.parse(row.history) };
}

export function updateSession(
  projectId: string,
  documentHtml: string,
  history: unknown[]
) {
  const db = getDb();
  const title = deriveTitle(documentHtml || "");
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE projects SET document_html = ?, history = ?, title = ?, updated_at = ? WHERE id = ?"
  ).run(
    documentHtml || "",
    JSON.stringify(history || []),
    title,
    now,
    projectId
  );
}

// --- Agents ---

export function getAgentsByProject(projectId: string) {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM agents WHERE project_id = ?")
    .all(projectId) as AgentRow[];
  return rows.map(toAgent);
}

export function upsertAgents(
  agents: {
    id: string;
    name: string;
    cwd?: string;
    sessionId?: string;
    status?: string;
    messages?: unknown[];
  }[],
  projectId: string
) {
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO agents (id, project_id, name, cwd, session_id, status, messages)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       cwd = excluded.cwd,
       session_id = excluded.session_id,
       status = excluded.status,
       messages = excluded.messages`
  );

  const existingIds = db
    .prepare("SELECT id FROM agents WHERE project_id = ?")
    .all(projectId) as { id: string }[];
  const incomingIds = new Set(agents.map((a) => a.id));
  const toDelete = existingIds.filter((r) => !incomingIds.has(r.id));

  const transaction = db.transaction(() => {
    for (const a of agents) {
      upsert.run(
        a.id,
        projectId,
        a.name,
        a.cwd || "",
        a.sessionId || "",
        a.status || "idle",
        JSON.stringify(a.messages || [])
      );
    }
    if (toDelete.length > 0) {
      const del = db.prepare("DELETE FROM agents WHERE id = ?");
      for (const r of toDelete) {
        del.run(r.id);
      }
    }
  });
  transaction();
}

export function deleteAgent(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM agents WHERE id = ?").run(id);
}

// --- Saved paths ---

export function getSavedPaths(): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT path FROM saved_paths ORDER BY id DESC")
    .all() as { path: string }[];
  return rows.map((r) => r.path);
}

export function addSavedPath(newPath: string) {
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO saved_paths (path) VALUES (?)").run(
    newPath
  );
}

// --- Templates ---

export function getTemplate() {
  const db = getDb();
  const row = db
    .prepare("SELECT name, content FROM templates WHERE id = 'default'")
    .get() as { name: string; content: string } | undefined;
  return row || { name: "", content: "" };
}

export function updateTemplate(name: string, content: string) {
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO templates (id, name, content) VALUES ('default', ?, ?)"
  ).run(name, content);
}

export function getTemplateContent(): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT content FROM templates WHERE id = 'default'")
    .get() as { content: string } | undefined;
  return row?.content ?? null;
}
