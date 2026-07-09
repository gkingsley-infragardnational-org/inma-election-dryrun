#!/usr/bin/env node
// Seeds the VOTES KV namespace with the synthetic test voter roster.
// Usage:
//   node seed/seed.js --local     (seeds wrangler's local dev KV emulation)
//   node seed/seed.js             (prints the equivalent remote commands —
//                                  review before running against production)
const { execSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const voters = JSON.parse(
  fs.readFileSync(path.join(__dirname, "voters.json"), "utf8")
);
const local = process.argv.includes("--local");

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

for (const v of voters) {
  const record = {
    pinHash: sha256Hex(v.pin),
    failedAttempts: 0,
    locked: false,
    hasVoted: false,
  };
  const key = `voter:${v.voterId}`;
  const value = JSON.stringify(record).replace(/'/g, "'\\''");
  const cmd = `npx wrangler kv key put --binding=VOTES '${key}' '${value}'${local ? " --local --preview false" : ""}`;
  if (local) {
    console.log(`Seeding ${key} ...`);
    execSync(cmd, { stdio: "inherit", cwd: path.join(__dirname, "..") });
  } else {
    console.log(cmd);
  }
}

if (!local) {
  console.log(
    "\n(Add --remote and your namespace binding once wrangler.toml has real KV ids to seed the live namespace.)"
  );
}
