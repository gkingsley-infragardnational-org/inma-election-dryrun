import { checkAdmin, unauthorized } from "../../_shared/auth.js";
import { getSettings, saveSettings } from "../../_shared/store.js";
import { json } from "../../_shared/crypto.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!checkAdmin(request, env)) return unauthorized();
  return json(await getSettings(env));
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

  const updated = await saveSettings(env, body || {});
  return json({ ok: true, settings: updated });
}
