import { and, eq, isNull } from 'drizzle-orm';
import { shareLinks } from '@/db/schema';
import { database, ensureDatabase } from '@/lib/server/db';

type RouteContext = { params: Promise<{ token: string }> };

async function tokenHash(token: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
    ),
  ]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  await ensureDatabase();
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token))
    return Response.json({ error: 'not_found' }, { status: 404 });
  const rows = await database()
    .select({ snapshotJson: shareLinks.snapshotJson })
    .from(shareLinks)
    .where(
      and(
        eq(shareLinks.tokenHash, await tokenHash(token)),
        isNull(shareLinks.revokedAt),
      ),
    )
    .limit(1);
  if (!rows[0]) return Response.json({ error: 'not_found' }, { status: 404 });
  return Response.json({ snapshot: JSON.parse(rows[0].snapshotJson) });
}
