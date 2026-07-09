import { checkAdmin, unauthorized } from "../../_shared/auth.js";
import { sha256Hex, json } from "../../_shared/crypto.js";

// Expects { voters: [{ email, pin? }, ...] } — CSV/XLSX parsing happens
// client-side (public/admin-console.html); this endpoint just writes KV
// records. If a row includes a pin, it's used as-is (hashed). Otherwise a
// secure random 6-digit PIN is generated here and returned in the response
// so the admin can copy/download the full roster to distribute manually —
// we do not send email ourselves.
function generatePin() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return n.toString().padStart(6, "0");
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAdmin(request, env)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  const voters = Array.isArray(body?.voters) ? body.voters : null;
  if (!voters || voters.length === 0) {
    return json({ error: "No voters provided." }, 400);
  }
  if (voters.length > 500) {
    return json({ error: "That's more than 500 rows in one upload — split it into batches." }, 400);
  }

  const results = [];
  const skipped = [];

  for (const v of voters) {
    const email = String(v?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      skipped.push(v?.email || "(blank)");
      continue;
    }

    const pin = v?.pin ? String(v.pin).trim() : generatePin();
    const pinHash = await sha256Hex(pin);
    const key = `voter:${email}`;

    // Preserve hasVoted if this voter already exists (re-uploading a roster
    // shouldn't let someone who already voted vote again).
    const existingRaw = await env.VOTES.get(key);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};

    await env.VOTES.put(
      key,
      JSON.stringify({
        pinHash,
        failedAttempts: 0,
        locked: false,
        hasVoted: existing.hasVoted || false,
      })
    );

    results.push({ email, pin });
  }

  return json({ ok: true, count: results.length, voters: results, skipped });
}
