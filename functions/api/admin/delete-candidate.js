import { checkAdmin, unauthorized } from "../../_shared/auth.js";
import { deleteCandidate } from "../../_shared/store.js";
import { json } from "../../_shared/crypto.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAdmin(request, env)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  if (!body?.id) return json({ error: "id is required." }, 400);
  await deleteCandidate(env, body.id);
  return json({ ok: true });
}
