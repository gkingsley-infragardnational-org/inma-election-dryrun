import { getSettings, listCandidates } from "../_shared/store.js";
import { json } from "../_shared/crypto.js";

// Public (no auth) — the ballot page needs to show the candidate lineup
// before a voter logs in. No voter or vote data is exposed here.
export async function onRequestGet(context) {
  const { env } = context;
  const settings = await getSettings(env);
  const candidates = await listCandidates(env);
  return json({
    settings,
    candidates: candidates.map((c) => ({
      id: c.id,
      name: c.name,
      ima: c.ima,
      bio: c.bio,
      photo: c.photo,
    })),
  });
}
