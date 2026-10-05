import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ENTITIES } from './schema.mjs';

const SQL = { str: 'TEXT', text: 'TEXT', enum: 'TEXT', ts: 'TEXT', day: 'TEXT', json: 'TEXT', ref: 'TEXT', int: 'INTEGER', bool: 'INTEGER', real: 'REAL' };

export const DB_PATH = process.env.LIFEOS_DB ?? '/data/lifeos.db';
mkdirSync(dirname(DB_PATH), { recursive: true });
export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

/** Ordered, append-only migrations. Never edit an applied migration; add a new one. */
const MIGRATIONS = [
  {
    id: '001_core',
    up() {
      db.exec(`
        CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL,
          settings TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL);
        CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL, expires_at TEXT NOT NULL, user_agent TEXT);
        CREATE INDEX idx_sessions_user ON sessions(user_id);
        CREATE TABLE activity (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          entity TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, title TEXT, domain TEXT, at TEXT NOT NULL, meta TEXT, actor TEXT NOT NULL DEFAULT 'user');
        CREATE INDEX idx_activity_user_at ON activity(user_id, at DESC);
        CREATE INDEX idx_activity_entity ON activity(user_id, entity, entity_id);
        CREATE TABLE integrations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'disconnected', scopes TEXT, last_sync_at TEXT, error TEXT, created_at TEXT NOT NULL, UNIQUE(user_id, provider));
      `);
      for (const [name, spec] of Object.entries(ENTITIES)) {
        const cols = Object.entries(spec.fields).map(([c, f]) => `${c} ${SQL[f.t]}`);
        const unique = spec.unique ? `, UNIQUE(user_id, ${spec.unique.join(', ')})` : '';
        db.exec(`CREATE TABLE ${name} (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT, ${cols.join(', ')}${unique});
          CREATE INDEX idx_${name}_user ON ${name}(user_id, archived_at);`);
        for (const [c, f] of Object.entries(spec.fields)) {
          if (f.t === 'ref' || ['due_at', 'start_at', 'day', 'status'].includes(c)) db.exec(`CREATE INDEX idx_${name}_${c} ON ${name}(user_id, ${c});`);
        }
      }
    },
  },
  {
    id: '002_extend_model',
    // Adds new columns / tables declared in schema.mjs (measurement model, task types, custom domains, attachments…).
    up() { syncSchema(); backfill(); },
  },
  { id: '003_custom_domain_slug', up() { syncSchema(); } },
];
function syncSchema() {
      for (const [name, spec] of Object.entries(ENTITIES)) {
        const existing = db.prepare(`PRAGMA table_info(${name})`).all().map((c) => c.name);
        if (!existing.length) {
          const cols = Object.entries(spec.fields).map(([c, f]) => `${c} ${SQL[f.t]}`);
          const unique = spec.unique ? `, UNIQUE(user_id, ${spec.unique.join(', ')})` : '';
          db.exec(`CREATE TABLE ${name} (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT, ${cols.join(', ')}${unique});
            CREATE INDEX idx_${name}_user ON ${name}(user_id, archived_at);`);
          continue;
        }
        for (const [c, f] of Object.entries(spec.fields)) if (!existing.includes(c)) db.exec(`ALTER TABLE ${name} ADD COLUMN ${c} ${SQL[f.t]}`);
      }
}
function backfill() {
      db.exec(`UPDATE tasks SET status = CASE WHEN done_at IS NOT NULL THEN 'completed' ELSE 'planned' END WHERE status IS NULL;
        UPDATE tasks SET task_type = 'standard' WHERE task_type IS NULL;
        UPDATE deadlines SET type = 'commitment' WHERE type IS NULL;
        UPDATE goals SET goal_type = 'outcome', measure_type = 'milestones', direction = 'increase', method = 'work', is_vision = 0 WHERE goal_type IS NULL;
        UPDATE habits SET kind = 'binary', counts_to_goal = 0 WHERE kind IS NULL;
        UPDATE focus_sessions SET kind = 'deep_work', interruptions = 0 WHERE kind IS NULL;
        UPDATE projects SET priority = 'medium' WHERE priority IS NULL;
        UPDATE milestones SET domain = 'personal' WHERE domain IS NULL;
        UPDATE decisions SET decided_on = substr(created_at, 1, 10) WHERE decided_on IS NULL;`);
}

export function migrate() {
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const done = new Set(db.prepare('SELECT id FROM _migrations').all().map((r) => r.id));
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    db.exec('BEGIN');
    try {
      m.up();
      db.prepare('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)').run(m.id, new Date().toISOString());
      db.exec('COMMIT');
      console.log(`[db] applied migration ${m.id}`);
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}

let depth = 0;
/** Nestable transaction (inner calls join the outer one). */
export function tx(fn) {
  if (depth > 0) return fn();
  db.exec('BEGIN');
  depth++;
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  } finally {
    depth--;
  }
}
