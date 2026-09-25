import type { PluginClientContext } from "@getpaseo/plugin/client";
import { DeliverySettings } from "./client/delivery-settings";
import { bindPluginNavigation, openSpawnedAgent } from "./client/navigation";
import { contributeStoryComposer } from "./client/story-composer";
import { STORY_PHASES } from "./shared/story-phases";
import { spawnStoryPhase } from "./shared/spawn-story";

export default function contribute(client: PluginClientContext) {
  bindPluginNavigation(client);

  client.addSettingsScreen({
    id: "delivery",
    title: "Story delivery",
    icon: "Route",
    Component: DeliverySettings,
  });

  const cleanupStory = contributeStoryComposer(client);

  for (const phase of STORY_PHASES) {
    client.addCommandCenterItem({
      id: `story-${phase.id}`,
      title: `Story: ${phase.label}`,
      icon: phase.icon,
      keywords: ["ss", "skillsync", phase.prompt, phase.id],
      context: "workspace",
      async onSelect({ workspace, rpc }) {
        const result = await rpc(spawnStoryPhase, {
          workspaceId: workspace.id,
          phase: phase.id,
        });
        openSpawnedAgent(result.agentId);
      },
    });
  }

  client.addCommandCenterItem({
    id: "story-settings",
    title: "Configure Story delivery",
    icon: "Settings",
    keywords: ["ss", "skillsync", "delivery"],
    context: "global",
    onSelect({ openSettings }) {
      openSettings("delivery");
    },
  });

  return () => {
    cleanupStory();
  };
}
