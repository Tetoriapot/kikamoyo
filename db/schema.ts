import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    name: text('name').notNull(),
    snapshotJson: text('snapshot_json').notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('projects_owner_updated_idx').on(table.ownerId, table.updatedAt),
  ],
);

export const projectVersions = sqliteTable(
  'project_versions',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    versionNo: integer('version_no').notNull(),
    snapshotJson: text('snapshot_json').notNull(),
    label: text('label').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.versionNo] })],
);

export const shareLinks = sqliteTable(
  'share_links',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    snapshotJson: text('snapshot_json').notNull(),
    createdAt: text('created_at').notNull(),
    revokedAt: text('revoked_at'),
  },
  (table) => [uniqueIndex('share_links_token_hash_idx').on(table.tokenHash)],
);

export const brandPalettes = sqliteTable(
  'brand_palettes',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    name: text('name').notNull(),
    background: text('background').notNull(),
    colorsJson: text('colors_json').notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('brand_palettes_owner_updated_idx').on(
      table.ownerId,
      table.updatedAt,
    ),
  ],
);
