import type { PaseoApi } from "@getpaseo/client";
import type { RpcInput } from "@getpaseo/plugin";
import type { PluginSettings } from "@getpaseo/plugin/server";
import type { z } from "zod";
import { buildStoryAgentCreateOptions } from "../shared/agent-config";
import { preferences } from "../shared/preferences";
import { spawnStoryPhase } from "../shared/spawn-story";

type PreferencesSchema = typeof preferences.schema;

export async function spawnStoryAgent(
  input: RpcInput<typeof spawnStoryPhase>,
  settingsHandle: PluginSettings<PreferencesSchema>,
  paseo: PaseoApi,
) {
  const state = await settingsHandle.read();
  if (state.status !== "ready") {
    throw new Error("Story delivery settings are not ready yet.");
  }

  const createOptions = buildStoryAgentCreateOptions(state.values, input.phase);
  const agent = await paseo.workspaces.ref(input.workspaceId).agents.create(createOptions);

  return {
    agentId: agent.id,
    phase: input.phase,
    prompt: createOptions.prompt,
  };
}
