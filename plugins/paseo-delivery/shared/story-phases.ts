import { FIX_FINDINGS_PROMPT } from "./fix-findings-prompt";

export const STORY_PHASES = [
  {
    id: "plan",
    label: "Plan",
    prompt: "/ss-plan",
    icon: "Map",
    autoAccept: false,
  },
  {
    id: "implement",
    label: "Implement",
    prompt: "/ss-implement",
    icon: "Hammer",
    autoAccept: true,
  },
  {
    id: "loop",
    label: "Loop (AFK)",
    prompt: "/ss-loop",
    icon: "Repeat",
    autoAccept: true,
  },
  {
    id: "review",
    label: "Review",
    prompt: "/ss-review",
    icon: "Scan",
    autoAccept: true,
  },
  {
    id: "fix-findings",
    label: "Fix findings",
    prompt: FIX_FINDINGS_PROMPT,
    icon: "Wrench",
    autoAccept: true,
  },
  {
    id: "audit",
    label: "Audit",
    prompt: "/ss-security-audit",
    icon: "ShieldCheck",
    autoAccept: true,
  },
  {
    id: "finish",
    label: "Finish",
    prompt: "/ss-finish",
    icon: "CheckCircle",
    autoAccept: true,
  },
  {
    id: "close",
    label: "Close",
    prompt: "/ss-close-story",
    icon: "Archive",
    autoAccept: true,
  },
] as const;

export type StoryPhaseId = (typeof STORY_PHASES)[number]["id"];

export function storyPhaseById(phase: StoryPhaseId) {
  const match = STORY_PHASES.find((entry) => entry.id === phase);
  if (!match) {
    throw new Error(`Unknown story phase: ${phase}`);
  }
  return match;
}
