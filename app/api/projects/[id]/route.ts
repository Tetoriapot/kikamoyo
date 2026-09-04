import { and, eq } from 'drizzle-orm';
import { projectVersions, projects } from '@/db/schema';
import { database, ensureDatabase } from '@/lib/server/db';
import { authenticatedUserId, unauthorized } from '@/lib/server/identity';
import { isEditorSnapshot } from '@/lib/pattern-types';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const ownerId = authenticatedUserId(request);
  if (!ownerId) return unauthorized();
  await ensureDatabase();
  const { id } = await context.params;
  const body = (await request.json()) as {
    name?: unknown;
    snapshot?: unknown;
    baseRevision?: unknown;
    label?: unknown;
  };
  if (
    typeof body.name !== 'string' ||
    !body.name.trim() ||
    body.name.length > 120 ||
    !isEditorSnapshot(body.snapshot) ||
    !Number.isInteger(body.baseRevision)
  )
    return Response.json({ error: 'invalid_project' }, { status: 400 });
  const db = database();
  const current = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
    .limit(1);
  const row = current[0];
  if (!row) return Response.json({ error: 'not_found' }, { status: 404 });
  if (row.revision !== body.baseRevision)
    return Response.json(
      {
        error: 'revision_conflict',
        project: {
          ...row,
          snapshot: JSON.parse(row.snapshotJson),
          snapshotJson: undefined,
        },
      },
      { status: 409 },
    );
  const revision = row.revision + 1;
  const now = new Date().toISOString();
  const snapshotJson = JSON.stringify(body.snapshot);
  await db
    .update(projects)
    .set({ name: body.name.trim(), snapshotJson, revision, updatedAt: now })
    .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)));
  await db.insert(projectVersions).values({
    projectId: id,
    versionNo: revision,
    snapshotJson,
    label:
      typeof body.label === 'string'
        ? body.label.slice(0, 120)
        : `版 ${revision}`,
    createdAt: now,
  });
  return Response.json({
    project: {
      id,
      name: body.name.trim(),
      snapshot: body.snapshot,
      revision,
      createdAt: row.createdAt,
      updatedAt: now,
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const ownerId = authenticatedUserId(request);
  if (!ownerId) return unauthorized();
  await ensureDatabase();
  const { id } = await context.params;
  await database()
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)));
  return new Response(null, { status: 204 });
}
