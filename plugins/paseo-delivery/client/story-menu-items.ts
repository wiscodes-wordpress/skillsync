import type {
  PluginButtonMenuEntry,
  PluginClientContext,
} from "@getpaseo/plugin/client";
import { openSpawnedAgent } from "./navigation";
import { STORY_PHASES } from "../shared/story-phases";
import { spawnStoryPhase } from "../shared/spawn-story";

/** Composer pill: run the phase in the chat you are already in. */
export function createStoryComposerMenuItems(
  client: PluginClientContext,
  agentId: string,
): PluginButtonMenuEntry[] {
  return STORY_PHASES.map((phase) => ({
    kind: "item" as const,
    id: phase.id,
    title: phase.label,
    icon: phase.icon,
    behavior: {
      kind: "action" as const,
      async onPress() {
        await client.paseo.agents.ref(agentId).send(phase.prompt);
      },
    },
  }));
}

/** Command Center: fresh agent per ss-flow phase. */
export function createStorySpawnMenuItems(
  client: PluginClientContext,
  workspaceId: string,
): PluginButtonMenuEntry[] {
  return STORY_PHASES.map((phase) => ({
    kind: "item" as const,
    id: phase.id,
    title: phase.label,
    icon: phase.icon,
    behavior: {
      kind: "action" as const,
      async onPress() {
        const result = await client.rpc(spawnStoryPhase, {
          workspaceId,
          phase: phase.id,
        });
        openSpawnedAgent(result.agentId);
      },
    },
  }));
}
