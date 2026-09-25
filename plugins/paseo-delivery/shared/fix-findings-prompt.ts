/** Direct agent prompt — not a linked /ss-* slash command. */
export const FIX_FINDINGS_PROMPT = [
  "Fix only the open findings in .harness/state.md",
  "(Last Critic Verdict and/or Security Evidence).",
  "Do not expand scope or start new Remaining cycles.",
  "Follow harness-generator.md — scoped remedy only.",
  "Run Verification Plan commands from state.",
  "Update Next Action to re-run the gate that failed (review or security audit).",
].join(" ");
