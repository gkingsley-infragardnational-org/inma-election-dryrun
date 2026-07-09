export function checkAdmin(request, env) {
  const key = request.headers.get("X-Admin-Key");
  return !!env.ADMIN_KEY && key === env.ADMIN_KEY;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
