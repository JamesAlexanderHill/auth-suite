export function json(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function error(message: string, status: number = 400): Response {
  return json({ error: message }, status);
}

export function tokenResponse(
  accessToken: string,
  refreshToken: string
): Response {
  return new Response(JSON.stringify({ accessToken }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
