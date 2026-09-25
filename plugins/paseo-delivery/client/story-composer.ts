import type {
  OwnedSubscription,
  PaseoAgent,
  PaseoAgentListResult,
} from "@getpaseo/client";
import type {
  PluginButtonRegistration,
  PluginClientContext,
} from "@getpaseo/plugin/client";
import { createStoryComposerMenuItems } from "./story-menu-items";

function pillKey(workspaceId: string, agentId: string) {
  return `${workspaceId}:${agentId}`;
}

function shouldRegisterStoryPill(agent: PaseoAgent) {
  return Boolean(agent.workspaceId) && !agent.archivedAt;
}

function registerComposerPill(
  client: PluginClientContext,
  workspaceId: string,
  agentId: string,
  pills: Map<string, PluginButtonRegistration>,
) {
  const key = pillKey(workspaceId, agentId);
  pills.get(key)?.remove();
  pills.set(
    key,
    client.addComposerPill({
      id: "ss-story",
      workspaceId,
      agentId,
      button: {
        title: "skillsync Story belt",
        icon: "Route",
        label: "Story",
        behavior: {
          kind: "menu",
          items: createStoryComposerMenuItems(client, agentId),
        },
      },
    }),
  );
}

function syncAgentPill(
  client: PluginClientContext,
  agent: PaseoAgent,
  pills: Map<string, PluginButtonRegistration>,
) {
  const workspaceId = agent.workspaceId;
  if (!workspaceId || !shouldRegisterStoryPill(agent)) {
    removeAgentPill(agent.id, pills);
    return;
  }

  registerComposerPill(client, workspaceId, agent.id, pills);
}

function removeAgentPill(agentId: string, pills: Map<string, PluginButtonRegistration>) {
  for (const [key, registration] of pills) {
    if (key.endsWith(`:${agentId}`)) {
      registration.remove();
      pills.delete(key);
    }
  }
}

export function contributeStoryComposer(client: PluginClientContext) {
  const pills = new Map<string, PluginButtonRegistration>();
  let subscription: OwnedSubscription<PaseoAgentListResult> | undefined;
  let stopped = false;

  void client.paseo.agents
    .list({ subscribe: {} })
    .then((result) => {
      subscription = result.subscription;
      subscription?.subscribe({
        snapshot: ({ entries }) => {
          for (const registration of pills.values()) {
            registration.remove();
          }
          pills.clear();

          for (const entry of entries) {
            syncAgentPill(client, entry.agent, pills);
          }
        },
        update: (message) => {
          if (message.type !== "agent_update") {
            return;
          }

          const update = message.payload;
          if (update.kind === "remove") {
            removeAgentPill(update.agentId, pills);
            return;
          }

          if (update.kind === "upsert") {
            syncAgentPill(client, update.agent, pills);
          }
        },
      });
    })
    .catch((error) => {
      if (!stopped) {
        console.error("skillsync-delivery: agent subscribe failed", error);
      }
    });

  return () => {
    stopped = true;
    void subscription?.release();
    for (const registration of pills.values()) {
      registration.remove();
    }
    pills.clear();
  };
}
