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
  refreshToken: string,
  options: {
    refreshTokenExpiryMs?: number,
    path?: string,
    refreshTokenKey?: string,
  }
): Response {
  const isForcedLogout = !accessToken && !refreshToken;

  // TODO: check if path should only match the baseUrl of authServer. There should be no reason to have it for other routes
  const headers = new Headers({
    "Set-Cookie": `${options.refreshTokenKey ?? 'refreshToken'}=${refreshToken}; HttpOnly; Path=${options.path ?? '/'}; Max-Age=${options.refreshTokenExpiryMs ??  1000 * 60 * 60 * 24}`, // default to 24 hours
    contentType: "application/json",
  });

  const payload = isForcedLogout
    ? { success: true, message: "Logged out successfully" }
    : { success: true, accessToken }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers,
  });
}
