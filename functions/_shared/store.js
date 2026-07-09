// Shared KV data-access helpers. Candidates, voters, and election settings
// all live in the same VOTES KV namespace so the whole app runs on one
// binding. Everything here is admin-editable at runtime via the admin
// console — nothing about candidates or roster size is hardcoded anymore.

const DEFAULT_SETTINGS = {
  electionId: "UNSET-ELECTION",
  name: "INMA Election",
  maxSelections: 1,
};

export async function getSettings(env) {
  const raw = await env.VOTES.get("settings:election");
  return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
}

export async function saveSettings(env, partial) {
  const current = await getSettings(env);
  const updated = {
    electionId:
      typeof partial.electionId === "string" && partial.electionId.trim()
        ? partial.electionId.trim()
        : current.electionId,
    name:
      typeof partial.name === "string" && partial.name.trim()
        ? partial.name.trim()
        : current.name,
    maxSelections:
      Number.isInteger(partial.maxSelections) && partial.maxSelections > 0
        ? partial.maxSelections
        : current.maxSelections,
  };
  await env.VOTES.put("settings:election", JSON.stringify(updated));
  return updated;
}

export async function listCandidates(env) {
  const candidates = [];
  let cursor;
  do {
    const list = await env.VOTES.list({ prefix: "candidate:", cursor });
    for (const k of list.keys) {
      const val = await env.VOTES.get(k.name);
      if (val) candidates.push(JSON.parse(val));
    }
    cursor = list.cursor;
    if (list.list_complete) break;
  } while (cursor);
  candidates.sort((a, b) => (a.addedAt || "").localeCompare(b.addedAt || ""));
  return candidates;
}

export async function addCandidate(env, { name, ima, bio, photo }) {
  const id = crypto.randomUUID();
  const record = {
    id,
    name,
    ima: ima || "",
    bio: bio || "",
    photo: photo || null,
    addedAt: new Date().toISOString(),
  };
  await env.VOTES.put(`candidate:${id}`, JSON.stringify(record));
  return record;
}

export async function deleteCandidate(env, id) {
  await env.VOTES.delete(`candidate:${id}`);
}
