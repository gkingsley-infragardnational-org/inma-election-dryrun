import { getSettings, listCandidates } from "../_shared/store.js";
import { sha256Hex, json } from "../_shared/crypto.js";

const MAX_ATTEMPTS = 10;
const SESSION_TTL_SECONDS = 600; // 10 minutes to complete the ballot

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  const { voterId, pin } = body || {};
  if (!voterId || !pin) {
    return json({ error: "Voter ID (email) and PIN are required." }, 400);
  }

  const normalizedId = voterId.trim().toLowerCase();
  const voterKey = `voter:${normalizedId}`;
  const raw = await env.VOTES.get(voterKey);
  if (!raw) {
    return json({ error: "Voter ID not recognized." }, 401);
  }

  const voter = JSON.parse(raw);

  if (voter.locked) {
    return json(
      { error: "This voter account is locked after repeated failed PIN attempts. Contact the election administrator." },
      423
    );
  }
  if (voter.hasVoted) {
    return json({ error: "A ballot has already been recorded for this voter." }, 403);
  }

  const pinHash = await sha256Hex(pin);
  if (pinHash !== voter.pinHash) {
    voter.failedAttempts = (voter.failedAttempts || 0) + 1;
    if (voter.failedAttempts >= MAX_ATTEMPTS) {
      voter.locked = true;
      voter.lockedAt = new Date().toISOString();
    }
    await env.VOTES.put(voterKey, JSON.stringify(voter));

    if (voter.locked) {
      return json(
        { error: `Incorrect PIN. Account locked after ${MAX_ATTEMPTS} failed attempts.` },
        423
      );
    }
    const remaining = MAX_ATTEMPTS - voter.failedAttempts;
    return json({ error: `Incorrect PIN. ${remaining} attempt(s) remaining before lockout.` }, 401);
  }

  // Correct PIN: reset failure counter, issue a short-lived session token.
  voter.failedAttempts = 0;
  await env.VOTES.put(voterKey, JSON.stringify(voter));

  const token = crypto.randomUUID();
  await env.VOTES.put(
    `session:${token}`,
    JSON.stringify({ voterId: normalizedId, createdAt: Date.now() }),
    { expirationTtl: SESSION_TTL_SECONDS }
  );

  const settings = await getSettings(env);
  const candidates = await listCandidates(env);

  return json({
    token,
    electionId: settings.electionId,
    electionName: settings.name,
    maxSelections: settings.maxSelections,
    candidates: candidates.map((c) => ({
      id: c.id,
      name: c.name,
      ima: c.ima,
      bio: c.bio,
      photo: c.photo,
    })),
  });
}
