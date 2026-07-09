import { getSettings } from "../_shared/store.js";

// Admin-only CSV export of cast ballots (selections + timestamp only —
// no voter identity, by design).
export async function onRequestGet(context) {
  const { request, env } = context;
  const adminKey = request.headers.get("X-Admin-Key");

  if (!env.ADMIN_KEY || adminKey !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const settings = await getSettings(env);
  const ballots = [];
  let cursor;
  do {
    const list = await env.VOTES.list({ prefix: "ballot:", cursor });
    for (const k of list.keys) {
      const val = await env.VOTES.get(k.name);
      if (val) ballots.push(JSON.parse(val));
    }
    cursor = list.cursor;
    if (list.list_complete) break;
  } while (cursor);

  const header = "castAt,electionId,selections\n";
  const rows = ballots
    .map((b) => `${b.castAt},${b.electionId},"${b.selections.join("|")}"`)
    .join("\n");

  return new Response(header + rows + "\n", {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${settings.electionId}-ballots.csv"`,
    },
  });
}
