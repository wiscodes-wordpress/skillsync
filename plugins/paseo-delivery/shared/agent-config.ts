import type { z } from "zod";
import { preferences } from "./preferences";
import type { StoryPhaseId } from "./story-phases";
import { storyPhaseById } from "./story-phases";

type DeliveryPrefs = z.infer<typeof preferences.schema>;

const DEFAULT_CURSOR_MODEL = "composer-2.5";

export function resolveProvider(prefs: DeliveryPrefs): string {
  const provider = prefs.provider.trim();
  const model = prefs.model.trim();

  if (provider.includes("/")) {
    return provider;
  }

  if (model) {
    return model.includes("/") ? model : `${provider}/${model}`;
  }

  if (provider === "cursor") {
    return `cursor/${DEFAULT_CURSOR_MODEL}`;
  }

  throw new Error(
    'Story delivery needs provider/model (e.g. cursor/composer-2.5). Open Settings → Plugins → Story delivery.',
  );
}

export function buildStoryAgentCreateOptions(
  prefs: DeliveryPrefs,
  phaseId: StoryPhaseId,
) {
  const phase = storyPhaseById(phaseId);
  const modeId = prefs.modeId.trim();
  const providerId = resolveProvider(prefs).split("/")[0] ?? prefs.provider;
  const useAutoAccept =
    prefs.autoAccept && providerId === "cursor" && phase.autoAccept;

  const config: {
    provider: string;
    modeId?: string;
    featureValues?: { auto_accept: boolean };
  } = {
    provider: resolveProvider(prefs),
  };

  if (modeId) {
    config.modeId = modeId;
  }

  if (useAutoAccept) {
    config.featureValues = { auto_accept: true };
  }

  return {
    title: `Story · ${phase.label}`,
    prompt: phase.prompt,
    config,
  };
}
