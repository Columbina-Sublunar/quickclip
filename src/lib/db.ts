import Database from "@tauri-apps/plugin-sql";
import type { Category, Snippet, SnippetCreateInput, SnippetUpdateInput } from "./types";
import { generateId } from "./id";

let db: Database | null = null;

async function addColumnIfMissing(conn: Database, table: string, column: string, def: string) {
  const rows = await conn.select<{ name: string }[]>(`PRAGMA table_info(${table})`);
  if (!rows.some(r => r.name === column)) {
    await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
}

export async function getDb(): Promise<Database> {
  if (!db) {
    const conn = await Database.load("sqlite:quickclip.db");
    try {
      await initSchema(conn);
      db = conn;
    } catch (e) {
      console.error("Failed to initialize database schema:", e);
      throw e;
    }
  }
  return db;
}

async function initSchema(conn: Database) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS snippets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text', 'file')),
      content TEXT NOT NULL DEFAULT '',
      file_path TEXT,
      file_type TEXT,
      category_id TEXT NOT NULL,
      remark TEXT NOT NULL DEFAULT '',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);

  const rows = await conn.select<{ sql: string }[]>(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='snippets'"
  );
  const createSql = rows[0]?.sql ?? "";
  if (createSql.includes("CHECK(file_type IN")) {
    await conn.execute("DROP TABLE IF EXISTS snippets_old");
    await conn.execute("ALTER TABLE snippets RENAME TO snippets_old");
    await conn.execute(`
      CREATE TABLE snippets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('text', 'file')),
        content TEXT NOT NULL DEFAULT '',
        file_path TEXT,
        file_type TEXT,
        category_id TEXT NOT NULL,
        remark TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );
    `);
    await conn.execute("INSERT INTO snippets SELECT * FROM snippets_old");
    await conn.execute("DROP TABLE snippets_old");
  }

  await addColumnIfMissing(conn, "categories", "is_pinned", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing(conn, "snippets", "is_pinned", "INTEGER NOT NULL DEFAULT 0");

  await conn.execute("CREATE INDEX IF NOT EXISTS idx_snippets_category ON snippets(category_id)");
  await conn.execute("CREATE INDEX IF NOT EXISTS idx_snippets_search ON snippets(title, content, remark)");
}

export async function listCategories(): Promise<Category[]> {
  const d = await getDb();
  return d.select<Category[]>(
    "SELECT id, name, sort_order, is_pinned, created_at FROM categories ORDER BY is_pinned DESC, sort_order ASC, created_at ASC"
  );
}

export async function createCategory(category: Category): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT INTO categories (id, name, sort_order, is_pinned, created_at) VALUES ($1, $2, $3, $4, $5)",
    [category.id, category.name, category.sort_order, category.is_pinned, category.created_at]
  );
}

export async function updateCategory(id: string, updates: Partial<Omit<Category, "id">>): Promise<void> {
  const d = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.sort_order !== undefined) {
    fields.push("sort_order = ?");
    values.push(updates.sort_order);
  }
  if (updates.is_pinned !== undefined) {
    fields.push("is_pinned = ?");
    values.push(updates.is_pinned);
  }
  if (fields.length === 0) return;
  values.push(id);
  await d.execute(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteCategory(id: string): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM categories WHERE id = $1", [id]);
}

export async function listSnippets(categoryId?: string): Promise<Snippet[]> {
  const d = await getDb();
  if (categoryId) {
    return d.select<Snippet[]>(
      "SELECT id, title, type, content, file_path, file_type, category_id, remark, is_pinned, created_at, updated_at FROM snippets WHERE category_id = $1 ORDER BY is_pinned DESC, updated_at DESC",
      [categoryId]
    );
  }
  return d.select<Snippet[]>(
    "SELECT id, title, type, content, file_path, file_type, category_id, remark, is_pinned, created_at, updated_at FROM snippets ORDER BY is_pinned DESC, updated_at DESC"
  );
}

export async function searchSnippets(query: string): Promise<Snippet[]> {
  const d = await getDb();
  const pattern = `%${query}%`;
  return d.select<Snippet[]>(
    "SELECT id, title, type, content, file_path, file_type, category_id, remark, is_pinned, created_at, updated_at FROM snippets WHERE title LIKE $1 OR content LIKE $1 OR remark LIKE $1 ORDER BY is_pinned DESC, updated_at DESC",
    [pattern]
  );
}

export async function createSnippet(snippet: SnippetCreateInput): Promise<Snippet> {
  const d = await getDb();
  const now = Date.now();
  const id = generateId();
  const fullSnippet: Snippet = {
    id,
    title: snippet.title,
    type: snippet.type,
    content: snippet.content ?? "",
    file_path: snippet.file_path ?? null,
    file_type: snippet.file_type ?? null,
    category_id: snippet.category_id,
    remark: snippet.remark ?? "",
    is_pinned: snippet.is_pinned ?? 0,
    created_at: now,
    updated_at: now,
  };
  await d.execute(
    "INSERT INTO snippets (id, title, type, content, file_path, file_type, category_id, remark, is_pinned, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
    [
      fullSnippet.id,
      fullSnippet.title,
      fullSnippet.type,
      fullSnippet.content,
      fullSnippet.file_path,
      fullSnippet.file_type,
      fullSnippet.category_id,
      fullSnippet.remark,
      fullSnippet.is_pinned,
      fullSnippet.created_at,
      fullSnippet.updated_at,
    ]
  );
  return fullSnippet;
}

export async function updateSnippet(id: string, updates: SnippetUpdateInput): Promise<void> {
  const d = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.title !== undefined) {
    fields.push("title = ?");
    values.push(updates.title);
  }
  if (updates.type !== undefined) {
    fields.push("type = ?");
    values.push(updates.type);
  }
  if (updates.content !== undefined) {
    fields.push("content = ?");
    values.push(updates.content);
  }
  if (updates.file_path !== undefined) {
    fields.push("file_path = ?");
    values.push(updates.file_path);
  }
  if (updates.file_type !== undefined) {
    fields.push("file_type = ?");
    values.push(updates.file_type);
  }
  if (updates.category_id !== undefined) {
    fields.push("category_id = ?");
    values.push(updates.category_id);
  }
  if (updates.remark !== undefined) {
    fields.push("remark = ?");
    values.push(updates.remark);
  }
  if (updates.is_pinned !== undefined) {
    fields.push("is_pinned = ?");
    values.push(updates.is_pinned);
  }
  if (fields.length === 0) return;

  fields.push("updated_at = ?");
  values.push(Date.now());
  values.push(id);

  await d.execute(`UPDATE snippets SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteSnippet(id: string): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM snippets WHERE id = $1", [id]);
}

export async function getSnippet(id: string): Promise<Snippet | null> {
  const d = await getDb();
  const rows = await d.select<Snippet[]>(
    "SELECT id, title, type, content, file_path, file_type, category_id, remark, is_pinned, created_at, updated_at FROM snippets WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

// ---------- Import / Export helpers ----------

export async function deleteAllCategories(): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM snippets");
  await d.execute("DELETE FROM categories");
}

export async function upsertCategory(cat: Category): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT INTO categories (id, name, sort_order, is_pinned, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT(id) DO UPDATE SET name=excluded.name, sort_order=excluded.sort_order, is_pinned=excluded.is_pinned, created_at=excluded.created_at",
    [cat.id, cat.name, cat.sort_order, cat.is_pinned, cat.created_at]
  );
}

export async function upsertSnippet(snip: Snippet): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT INTO snippets (id, title, type, content, file_path, file_type, category_id, remark, is_pinned, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT(id) DO UPDATE SET title=excluded.title, type=excluded.type, content=excluded.content, file_path=excluded.file_path, file_type=excluded.file_type, category_id=excluded.category_id, remark=excluded.remark, is_pinned=excluded.is_pinned, created_at=excluded.created_at, updated_at=excluded.updated_at",
    [snip.id, snip.title, snip.type, snip.content, snip.file_path, snip.file_type, snip.category_id, snip.remark, snip.is_pinned, snip.created_at, snip.updated_at]
  );
}

export async function listAllCategoriesAndSnippets(): Promise<{ categories: Category[]; snippets: Snippet[] }> {
  const d = await getDb();
  const categories = await d.select<Category[]>(
    "SELECT id, name, sort_order, is_pinned, created_at FROM categories ORDER BY sort_order ASC, created_at ASC"
  );
  const snippets = await d.select<Snippet[]>(
    "SELECT id, title, type, content, file_path, file_type, category_id, remark, is_pinned, created_at, updated_at FROM snippets ORDER BY created_at ASC"
  );
  return { categories, snippets };
}
