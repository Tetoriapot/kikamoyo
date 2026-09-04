import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';

let schemaReady: Promise<void> | null = null;

function binding() {
  const value = (env as unknown as { DB?: D1Database }).DB;
  if (!value) throw new Error('Database binding is unavailable');
  return value;
}

export function database() {
  return drizzle(binding(), { schema });
}

/** Migrations remain the deployment source of truth; IF NOT EXISTS also makes a fresh local preview usable. */
export function ensureDatabase() {
  schemaReady ??= binding()
    .batch([
      binding().prepare(
        'CREATE TABLE IF NOT EXISTS projects (id text PRIMARY KEY NOT NULL, owner_id text NOT NULL, name text NOT NULL, snapshot_json text NOT NULL, revision integer DEFAULT 1 NOT NULL, created_at text NOT NULL, updated_at text NOT NULL)',
      ),
      binding().prepare(
        'CREATE INDEX IF NOT EXISTS projects_owner_updated_idx ON projects (owner_id, updated_at)',
      ),
      binding().prepare(
        'CREATE TABLE IF NOT EXISTS project_versions (project_id text NOT NULL, version_no integer NOT NULL, snapshot_json text NOT NULL, label text NOT NULL, created_at text NOT NULL, PRIMARY KEY(project_id, version_no), FOREIGN KEY(project_id) REFERENCES projects(id) ON UPDATE no action ON DELETE cascade)',
      ),
      binding().prepare(
        'CREATE TABLE IF NOT EXISTS share_links (id text PRIMARY KEY NOT NULL, owner_id text NOT NULL, token_hash text NOT NULL, snapshot_json text NOT NULL, created_at text NOT NULL, revoked_at text)',
      ),
      binding().prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS share_links_token_hash_idx ON share_links (token_hash)',
      ),
      binding().prepare(
        'CREATE TABLE IF NOT EXISTS brand_palettes (id text PRIMARY KEY NOT NULL, owner_id text NOT NULL, name text NOT NULL, background text NOT NULL, colors_json text NOT NULL, revision integer DEFAULT 1 NOT NULL, created_at text NOT NULL, updated_at text NOT NULL)',
      ),
      binding().prepare(
        'CREATE INDEX IF NOT EXISTS brand_palettes_owner_updated_idx ON brand_palettes (owner_id, updated_at)',
      ),
    ])
    .then(() => undefined);
  return schemaReady;
}
