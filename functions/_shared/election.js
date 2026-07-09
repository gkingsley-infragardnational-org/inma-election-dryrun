// Config block for the current election. Swap this file's contents to reuse
// the same codebase for a different election (e.g. August board vote vs.
// September Congress election), per the config-swap pattern:
//   - electionId
//   - candidates
//   - maxSelections
// Voter roster / PINs are NOT stored here — they live only in KV (see seed/).

export const ELECTION = {
  electionId: "TEST-DRYRUN-2026-07",
  name: "InfraGard Election System — Functional Dry Run (synthetic data)",
  maxSelections: 2,
  candidates: [
    { id: "cand-1", name: "Test Candidate A" },
    { id: "cand-2", name: "Test Candidate B" },
    { id: "cand-3", name: "Test Candidate C" },
    { id: "cand-4", name: "Test Candidate D" },
  ],
};
