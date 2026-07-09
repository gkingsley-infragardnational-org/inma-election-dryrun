import { getSettings, listCandidates } from "../_shared/store.js";

// Admin-only live tally: aggregates cast ballots into per-candidate counts.
// Still never touches voter identity — reads only the unlinkable ballot:*
// records. Protect with: an ADMIN_KEY secret set in the Cloudflare dashboard.
export async function onRequestGet(context) {
  const { request, env } = context;
  const adminKey = request.headers.get("X-Admin-Key");

  if (!env.ADMIN_KEY || adminKey !== env.ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const settings = await getSettings(env);
  const candidates = await listCandidates(env);
  const counts = Object.fromEntries(candidates.map((c) => [c.id, 0]));
  let totalBallots = 0;

  let cursor;
  do {
    const list = await env.VOTES.list({ prefix: "ballot:", cursor });
    for (const k of list.keys) {
      const val = await env.VOTES.get(k.name);
      if (!val) continue;
      const ballot = JSON.parse(val);
      totalBallots++;
      for (const sel of ballot.selections) {
        if (sel in counts) counts[sel] += 1;
      }
    }
    cursor = list.cursor;
    if (list.list_complete) break;
  } while (cursor);

  const results = candidates
    .map((c) => ({ id: c.id, name: c.name, ima: c.ima, votes: counts[c.id] }))
    .sort((a, b) => b.votes - a.votes);

  return new Response(
    JSON.stringify({
      electionId: settings.electionId,
      electionName: settings.name,
      maxSelections: settings.maxSelections,
      totalBallotsCast: totalBallots,
      results,
      asOf: new Date().toISOString(),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
