import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";
import { STORY_PHASES } from "./story-phases";

const phaseIds = STORY_PHASES.map((phase) => phase.id) as [
  (typeof STORY_PHASES)[number]["id"],
  ...(typeof STORY_PHASES)[number]["id"][],
];

export const spawnStoryPhase = defineRpc({
  name: "delivery.spawn-story-phase",
  input: z.object({
    workspaceId: z.string().min(1),
    phase: z.enum(phaseIds),
  }),
  output: z.object({
    agentId: z.string(),
    phase: z.enum(phaseIds),
    prompt: z.string(),
  }),
});
