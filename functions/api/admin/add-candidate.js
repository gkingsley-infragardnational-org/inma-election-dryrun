import { checkAdmin, unauthorized } from "../../_shared/auth.js";
import { addCandidate } from "../../_shared/store.js";
import { json } from "../../_shared/crypto.js";

const MAX_PHOTO_CHARS = 2_000_000; // ~1.5MB decoded — generous for a headshot

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAdmin(request, env)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  const { name, ima, bio, photo } = body || {};
  if (!name || !name.trim()) {
    return json({ error: "Candidate name is required." }, 400);
  }
  if (photo && photo.length > MAX_PHOTO_CHARS) {
    return json({ error: "Photo is too large. Please use a smaller image (under ~1.5MB)." }, 400);
  }

  const record = await addCandidate(env, {
    name: name.trim(),
    ima: (ima || "").trim(),
    bio: (bio || "").trim(),
    photo: photo || null,
  });

  return json({ ok: true, candidate: record });
}
