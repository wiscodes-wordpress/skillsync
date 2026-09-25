import type { PluginSurfaceProps } from "@getpaseo/plugin/client";

export type PluginNavigation = NonNullable<PluginSurfaceProps["navigation"]>;

let navigation: PluginNavigation | undefined;

/** Host may expose navigation on the client context before it is typed. */
export function bindPluginNavigation(source: unknown) {
  const candidate = source as { navigation?: PluginNavigation };
  navigation = candidate.navigation;
}

export function openSpawnedAgent(agentId: string) {
  navigation?.openAgent({ agentId });
}
