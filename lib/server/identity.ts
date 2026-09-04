export function authenticatedUserId(request: Request) {
  const userId = request.headers.get('oai-authenticated-user-id');
  if (userId) return userId;
  if (process.env.NODE_ENV !== 'production') return 'local-development-user';
  return null;
}

export function unauthorized() {
  return Response.json({ error: 'sign_in_required' }, { status: 401 });
}
