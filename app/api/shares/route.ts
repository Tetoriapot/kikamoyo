import { shareLinks } from '@/db/schema';
import { database, ensureDatabase } from '@/lib/server/db';
import { authenticatedUserId, unauthorized } from '@/lib/server/identity';
import { isEditorSnapshot } from '@/lib/pattern-types';

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
}

async function tokenHash(token: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
    ),
  ]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(request: Request) {
  const ownerId = authenticatedUserId(request);
  if (!ownerId) return unauthorized();
  await ensureDatabase();
  const body = (await request.json()) as { snapshot?: unknown };
  if (!isEditorSnapshot(body.snapshot))
    return Response.json({ error: 'invalid_snapshot' }, { status: 400 });
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = base64Url(bytes);
  const now = new Date().toISOString();
  await database()
    .insert(shareLinks)
    .values({
      id: crypto.randomUUID(),
      ownerId,
      tokenHash: await tokenHash(token),
      snapshotJson: JSON.stringify(body.snapshot),
      createdAt: now,
    });
  return Response.json({ token }, { status: 201 });
}
