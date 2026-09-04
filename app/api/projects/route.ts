import { desc, eq } from 'drizzle-orm';
import { projectVersions, projects } from '@/db/schema';
import { database, ensureDatabase } from '@/lib/server/db';
import { authenticatedUserId, unauthorized } from '@/lib/server/identity';
import { isEditorSnapshot } from '@/lib/pattern-types';

export async function GET(request: Request) {
  const ownerId = authenticatedUserId(request);
  if (!ownerId) return unauthorized();
  await ensureDatabase();
  const rows = await database()
    .select()
    .from(projects)
    .where(eq(projects.ownerId, ownerId))
    .orderBy(desc(projects.updatedAt))
    .limit(30);
  return Response.json({
    projects: rows.map((row) => ({
      ...row,
      snapshot: JSON.parse(row.snapshotJson),
      snapshotJson: undefined,
    })),
  });
}

export async function POST(request: Request) {
  const ownerId = authenticatedUserId(request);
  if (!ownerId) return unauthorized();
  await ensureDatabase();
  const body = (await request.json()) as { name?: unknown; snapshot?: unknown };
  if (
    typeof body.name !== 'string' ||
    !body.name.trim() ||
    body.name.length > 120 ||
    !isEditorSnapshot(body.snapshot)
  )
    return Response.json({ error: 'invalid_project' }, { status: 400 });
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const snapshotJson = JSON.stringify(body.snapshot);
  if (snapshotJson.length > 500_000)
    return Response.json({ error: 'project_too_large' }, { status: 413 });
  const db = database();
  await db.insert(projects).values({
    id,
    ownerId,
    name: body.name.trim(),
    snapshotJson,
    revision: 1,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(projectVersions).values({
    projectId: id,
    versionNo: 1,
    snapshotJson,
    label: '初版',
    createdAt: now,
  });
  return Response.json(
    {
      project: {
        id,
        name: body.name.trim(),
        snapshot: body.snapshot,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      },
    },
    { status: 201 },
  );
}
