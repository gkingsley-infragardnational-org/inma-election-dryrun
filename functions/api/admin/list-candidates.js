import { checkAdmin, unauthorized } from "../../_shared/auth.js";
import { listCandidates } from "../../_shared/store.js";
import { json } from "../../_shared/crypto.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!checkAdmin(request, env)) return unauthorized();
  const candidates = await listCandidates(env);
  return json({ candidates });
}
