// SHA-256 hex digest using the Workers-native Web Crypto API.
// NOTE: for a real (non-test) election, prefer a per-voter random salt
// stored alongside pinHash, to avoid identical PINs producing identical
// hashes. Kept simple/unsalted here for the functional dry run.
export async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
