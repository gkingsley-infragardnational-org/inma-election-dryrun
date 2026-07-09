import { ELECTION } from "../_shared/election.js";
import { json } from "../_shared/crypto.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  const { token, selections } = body || {};
  if (!token || !Array.isArray(selections)) {
    return json({ error: "token and selections[] are required." }, 400);
  }

  const sessionKey = `session:${token}`;
  const sessionRaw = await env.VOTES.get(sessionKey);
  if (!sessionRaw) {
    return json({ error: "Session expired or invalid. Please re-enter your voter ID and PIN." }, 401);
  }
  const session = JSON.parse(sessionRaw);

  const voterKey = `voter:${session.voterId}`;
  const voterRaw = await env.VOTES.get(voterKey);
  if (!voterRaw) {
    return json({ error: "Voter record not found." }, 401);
  }
  const voter = JSON.parse(voterRaw);

  if (voter.hasVoted) {
    return json({ error: "A ballot has already been recorded for this voter." }, 403);
  }

  const validIds = new Set(ELECTION.candidates.map((c) => c.id));
  const uniqueSelections = new Set(selections);
  if (
    selections.length === 0 ||
    selections.length > ELECTION.maxSelections ||
    uniqueSelections.size !== selections.length ||
    !selections.every((id) => validIds.has(id))
  ) {
    return json(
      { error: `Select between 1 and ${ELECTION.maxSelections} valid, non-duplicate candidate(s).` },
      400
    );
  }

  // Secret-ballot design: the ballot record contains no voterId, and the
  // voter record (updated below) contains no selections. The two are never
  // linkable from stored data alone.
  const ballotId = crypto.randomUUID();
  await env.VOTES.put(
    `ballot:${ballotId}`,
    JSON.stringify({
      electionId: ELECTION.electionId,
      selections,
      castAt: new Date().toISOString(),
    })
  );

  voter.hasVoted = true;
  voter.votedAt = new Date().toISOString();
  await env.VOTES.put(voterKey, JSON.stringify(voter));

  await env.VOTES.delete(sessionKey);

  return json({ ok: true, message: "Ballot recorded. Thank you for voting." });
}
