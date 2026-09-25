import type { PluginServerContext } from "@getpaseo/plugin/server";
import { spawnStoryAgent } from "./server/spawn-story";
import { preferences } from "./shared/preferences";
import { spawnStoryPhase } from "./shared/spawn-story";

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(preferences);

  server.handle(spawnStoryPhase, async (input, { paseo }) =>
    spawnStoryAgent(input, settings, paseo),
  );

  return () => {};
}
