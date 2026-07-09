# InfraGard Election System — Functional Dry Run

Rebuilt from scratch this session (the prior build wasn't saved to persistent storage). Same architecture as before: Cloudflare Pages + KV, server-side counting, secret-ballot storage, PIN lockout, CSV audit export, config-swap for reuse across elections.

## What's been verified (locally, synthetic data only)

Ran end-to-end against Wrangler's local KV emulator with 5 synthetic voters (`voter-001`…`voter-005`) and 4 placeholder candidates (max 2 selections). All of the following passed:

- Wrong PIN → correct PIN → session issued
- Valid ballot submission recorded
- Re-authenticating after voting → rejected ("already voted")
- Over-selection (3 picks when max is 2) → rejected; valid selection then succeeds
- 10 consecutive wrong PINs → account locked; even the *correct* PIN is then rejected until an admin unlocks it
- CSV export rejected without the admin key (401), succeeds with it
- Ballot CSV contains selections + timestamp only — **no voter identity**
- Turnout CSV contains voter IDs + hasVoted/locked status only — **no selections**
- Ballot and turnout records never share a key prefix or any linking field, so the two exports can't be cross-referenced to unmask a ballot

No real names, real PINs, or real candidates were used anywhere in this test.

## What's in this folder

```
functions/_shared/election.js   ← config block: electionId, candidates, maxSelections
functions/_shared/crypto.js     ← SHA-256 helper + JSON response helper
functions/api/verify-pin.js     ← PIN check, 10-attempt lockout, issues session token
functions/api/submit-vote.js    ← validates + records ballot, marks voter as voted
functions/api/export-ballots.js ← admin-only CSV of cast ballots (no voter identity)
functions/api/export-turnout.js ← admin-only CSV of who voted (no selections)
public/index.html               ← voter-facing ballot page
seed/voters.json                ← synthetic test roster (dummy PINs, not real)
seed/seed.js                    ← seeds KV from voters.json
wrangler.toml                   ← Pages Functions + KV binding config
```

## Deploying for real (board vote or Congress election)

1. **Create the KV namespace** (once):
   ```
   wrangler kv namespace create VOTES
   wrangler kv namespace create VOTES --preview
   ```
   Paste the returned `id` and `preview_id` into `wrangler.toml` in place of the placeholders.

2. **Set the config block** in `functions/_shared/election.js`:
   - `electionId` — unique per election (e.g. `INMA-BOARD-2026-08` vs `INMA-CONGRESS-2026-09`)
   - `candidates` — real names/IDs
   - `maxSelections` — per bylaws for that vote

3. **Set the admin secret** (used to authorize CSV export — do not put this in wrangler.toml):
   ```
   wrangler pages secret put ADMIN_KEY
   ```

4. **Seed real voters.** Do **not** reuse `seed/voters.json` — that file is synthetic test data only. Build a real roster (voter ID + PIN per eligible voter) and seed it directly via `wrangler kv key put --binding=VOTES` commands run by hand, ideally not saved to disk anywhere PINs could linger. For the 10-member board vote, voter IDs could map to the 10 confirmed board members; for the September Congress election, to the up to 74 IMA presidents.

5. **Deploy:**
   ```
   npm install
   npm run deploy
   ```
   (`wrangler pages deploy public`)

6. **Reuse for the next election:** per the original config-swap design, swap `functions/_shared/election.js` (new electionId/candidates/maxSelections) and reseed a fresh voter roster — no other code changes needed.

## Before using this for a real vote

- **PIN hashing is unsalted** in this build (fine for a functional dry run). For a real election, add a per-voter random salt stored alongside `pinHash` so identical PINs don't produce identical hashes.
- **Lockout is currently permanent** until an admin manually resets `locked: false` and `failedAttempts: 0` on a voter's KV record — decide who holds that capability and how a locked voter gets unblocked on election day.
- **Session tokens expire after 10 minutes** — confirm that's enough time for the real ballot (or adjust `SESSION_TTL_SECONDS` in `verify-pin.js`).
- **Test the real roster size before election day** — this dry run used 5 voters; re-run a similar smoke test with the real candidate/config block and a handful of real (or dummy) voter IDs before opening it to the full board or Congress.

## Local testing (if you want to re-run this yourself)

```
npm install
node seed/seed.js --local
echo 'ADMIN_KEY="whatever-you-want-for-local-testing"' > .dev.vars
npx wrangler pages dev public --local --port 8788
```

Then hit `http://localhost:8788` in a browser, or curl the `/api/*` endpoints directly.

## Note on this folder

An `npm install` accidentally ran directly in this shared output folder before I caught it, so there's a `node_modules/` (~165MB, standard Wrangler/Cloudflare tooling — nothing sensitive) that I can't delete from my side. It's safe to ignore, or you can delete it yourself in Finder — `package.json` + `package-lock.json` are all that's needed to regenerate it with `npm install`.
