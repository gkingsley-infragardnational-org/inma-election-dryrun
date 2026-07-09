// Admin-only turnout export: which voter IDs have voted and when — no
// selections included. Used to reconcile ballot count vs. voter count
// without ever linking a voter to their choices. Protect with:
//   wrangler pages secret put ADMIN_KEY
export async function onRequestGet(context) {
  const { request, env } = context;
  const adminKey = request.headers.get("X-Admin-Key");

  if (!env.ADMIN_KEY || adminKey !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const voters = [];
  let cursor;
  do {
    const list = await env.VOTES.list({ prefix: "voter:", cursor });
    for (const k of list.keys) {
      const val = await env.VOTES.get(k.name);
      if (val) {
        const v = JSON.parse(val);
        voters.push({
          voterId: k.name.replace("voter:", ""),
          hasVoted: !!v.hasVoted,
          votedAt: v.votedAt || "",
          locked: !!v.locked,
          failedAttempts: v.failedAttempts || 0,
        });
      }
    }
    cursor = list.cursor;
    if (list.list_complete) break;
  } while (cursor);

  const header = "voterId,hasVoted,votedAt,locked,failedAttempts\n";
  const rows = voters
    .map((v) => `${v.voterId},${v.hasVoted},${v.votedAt},${v.locked},${v.failedAttempts}`)
    .join("\n");

  return new Response(header + rows + "\n", {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="turnout-audit.csv"`,
    },
  });
}
