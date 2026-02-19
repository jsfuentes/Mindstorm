import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "mindstorm.db");

const DEFAULT_TEMPLATE = `The quality bar: Could another engineer on the team deliver roughly the same solution from this doc? If yes, you're done. If no, you need to break down the work further.

Context

[Background on the project. Why? What currently exists?]

Target Outcomes

[How do we know when this project is complete?]

Non Goals

[If there are pieces that are somewhat ambiguous, clearly define what we are not targeting here.]

Problems

[What challenges/questions do we need to resolve in order to meet our success criteria?]

How do we know if there are errors?

How do we communicate error states?

Be careful not to bleed solutions here.

Solutions

[Nearly 1:1 mapping from problem to solution. Go deep technically here. Function stubs, API definitions, pseudocode encouraged.]

Rollout plan

How do we ship safely? Feature flags, migrations, rollback plan

Observability (required)

What metrics, logs, and alerts do we need? How will we know if this is working? How will we debug issues in production?

Risks and mitigations

What could break? How do we detect and recover?

Open questions

What do you need input on from reviewers?

Flow Diagram [Optional]

[Excalidraw or mermaid of the flow if useful.]`;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  // Create tables
  _db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled',
      cwd TEXT NOT NULL DEFAULT '',
      document_html TEXT NOT NULL DEFAULT '',
      history TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      cwd TEXT NOT NULL DEFAULT '',
      session_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'idle',
      messages TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_paths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY DEFAULT 'default',
      name TEXT NOT NULL,
      content TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed default template if none exists
  const tmpl = _db
    .prepare("SELECT id FROM templates WHERE id = 'default'")
    .get();
  if (!tmpl) {
    _db.prepare(
      "INSERT INTO templates (id, name, content) VALUES ('default', 'Spec Template', ?)"
    ).run(DEFAULT_TEMPLATE);
  }

  // Add cwd column to projects if missing (migration for existing DBs)
  try {
    _db.exec("ALTER TABLE projects ADD COLUMN cwd TEXT NOT NULL DEFAULT ''");
  } catch {
    // Column already exists — ignore
  }

  return _db;
}
