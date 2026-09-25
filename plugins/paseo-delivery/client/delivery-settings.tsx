import { useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { useSettings, type PluginSurfaceProps } from "@getpaseo/plugin/client";
import {
  SettingsCard,
  SettingsInput,
  SettingsSection,
  SettingsSwitch,
} from "@getpaseo/plugin/client/ui";
import { preferences } from "../shared/preferences";

function DeliveryControls({
  settings,
  theme,
}: {
  settings: Extract<ReturnType<typeof useSettings<typeof preferences.schema>>, { status: "ready" }>;
  theme: PluginSurfaceProps["theme"];
}) {
  const muted = useMemo(() => ({ color: theme.colors.foregroundMuted }), [theme]);
  const body = useMemo(() => ({ color: theme.colors.foreground }), [theme]);

  const saveProvider = useCallback(
    (provider: string) => {
      void settings.save({ ...settings.values, provider }, settings.revision);
    },
    [settings],
  );
  const saveModel = useCallback(
    (model: string) => {
      void settings.save({ ...settings.values, model }, settings.revision);
    },
    [settings],
  );
  const saveModeId = useCallback(
    (modeId: string) => {
      void settings.save({ ...settings.values, modeId }, settings.revision);
    },
    [settings],
  );
  const saveAutoAccept = useCallback(
    (autoAccept: boolean) => {
      void settings.save({ ...settings.values, autoAccept }, settings.revision);
    },
    [settings],
  );

  return (
    <SettingsSection
      title="Agent defaults"
      info="Composer Story runs the phase in this chat. Command Center (⌘K) spawns a fresh agent per phase."
    >
      <SettingsCard>
        <SettingsInput
          label="Provider"
          hint="Use provider/model, e.g. cursor/composer-2.5"
          initialValue={settings.values.provider}
          onChangeText={saveProvider}
        />
        <SettingsInput
          label="Model"
          hint="Optional. Example: composer-2.5"
          initialValue={settings.values.model}
          onChangeText={saveModel}
        />
        <SettingsInput
          label="Mode"
          hint="Default: agent"
          initialValue={settings.values.modeId}
          onChangeText={saveModeId}
        />
        <SettingsSwitch
          label="Auto Accept (Cursor implement phases)"
          hint="Plan skips Auto Accept. Other phases enable it when provider is cursor."
          value={settings.values.autoAccept}
          onValueChange={saveAutoAccept}
        />
      </SettingsCard>
      <Text style={muted}>
        Repo must link ss-* commands into .cursor/commands/ (skillsync consumer setup).
      </Text>
      <Text style={body}>
        Story buttons: Plan · Implement · Loop · Review · Fix findings · Audit · Finish · Close
      </Text>
    </SettingsSection>
  );
}

export function DeliverySettings({ theme }: PluginSurfaceProps) {
  const settings = useSettings(preferences);
  const body = useMemo(() => ({ color: theme.colors.foreground }), [theme]);

  if (settings.status === "loading") {
    return <Text style={body}>Loading Story delivery settings…</Text>;
  }

  if (settings.status !== "ready") {
    return (
      <View>
        <Text style={body}>{settings.error}</Text>
      </View>
    );
  }

  return <DeliveryControls settings={settings} theme={theme} />;
}
