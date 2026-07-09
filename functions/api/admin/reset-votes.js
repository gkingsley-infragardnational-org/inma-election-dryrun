import { checkAdmin, unauthorized } from "../../_shared/auth.js";
import { json } from "../../_shared/crypto.js";

// Destructive test-mode reset: clears all cast ballots and returns every
// voter to a fresh, not-yet-voted state (PINs are untouched, so the same
// roster can be reused for the real election after testing). Requires
// { confirm: "RESET" } in the request body as a safeguard against
// accidental clicks. Does NOT touch candidates or election settings.
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAdmin(request, env)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.confirm !== "RESET") {
    return json({ error: 'Type RESET exactly to confirm this destructive action.' }, 400);
  }

  let ballotsDeleted = 0;
  let cursor;
  do {
    const list = await env.VOTES.list({ prefix: "ballot:", cursor });
    for (const k of list.keys) {
      await env.VOTES.delete(k.name);
      ballotsDeleted++;
    }
    cursor = list.cursor;
    if (list.list_complete) break;
  } while (cursor);

  let votersReset = 0;
  cursor = undefined;
  do {
    const list = await env.VOTES.list({ prefix: "voter:", cursor });
    for (const k of list.keys) {
      const raw = await env.VOTES.get(k.name);
      if (!raw) continue;
      const voter = JSON.parse(raw);
      voter.hasVoted = false;
      voter.locked = false;
      voter.failedAttempts = 0;
      delete voter.votedAt;
      delete voter.lockedAt;
      await env.VOTES.put(k.name, JSON.stringify(voter));
      votersReset++;
    }
    cursor = list.cursor;
    if (list.list_complete) break;
  } while (cursor);

  let sessionsCleared = 0;
  cursor = undefined;
  do {
    const list = await env.VOTES.list({ prefix: "session:", cursor });
    for (const k of list.keys) {
      await env.VOTES.delete(k.name);
      sessionsCleared++;
    }
    cursor = list.cursor;
    if (list.list_complete) break;
  } while (cursor);

  return json({ ok: true, ballotsDeleted, votersReset, sessionsCleared });
}
