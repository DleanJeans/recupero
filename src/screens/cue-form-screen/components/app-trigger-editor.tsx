import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppUsage } from '../../../../modules/app-usage';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useAppUsagePermission } from '../../../hooks/use-app-usage-permission';
import type { CueTrigger } from '../../../types/cue';
import { isAppOpenWatchingAvailable } from '../../../utils/app-open-watches';
import { Colors } from '../../../utils/colors';
import { AppPickerModal } from '../../behavior-form-screen/components/app-picker-modal';

type AppTrigger = Extract<CueTrigger, { type: 'app' }>;

interface AppTriggerEditorProps {
  value: AppTrigger;
  onChange: (trigger: AppTrigger) => void;
}

export function AppTriggerEditor({ value, onChange }: AppTriggerEditorProps) {
  const { siteTracking: watcherOn } = useAppUsagePermission();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!isAppOpenWatchingAvailable()) {
    return (
      <Text style={styles.note}>
        Opening another app can only remind you on Android, in a build that includes app-open reminders. Install the
        latest APK, then come back.
      </Text>
    );
  }

  return (
    <View style={styles.editor}>
      <Text style={styles.label}>When I open</Text>
      <View style={styles.appRow}>
        <Text style={[styles.appLabel, !value.packageName && styles.placeholder]}>
          {value.appLabel || 'No app selected'}
        </Text>
        <Button
          size="sm"
          onPress={() => setPickerOpen(true)}
        >
          {value.packageName ? 'Change' : 'Choose app'}
        </Button>
      </View>
      {!watcherOn && (
        <>
          <Text style={styles.note}>
            Recupero sees which app you open through its accessibility service (the same one website tracking uses).
            Turn on "Recupero app & website watcher" in Accessibility, then come back.
          </Text>
          <Button
            size="sm"
            onPress={() => AppUsage?.openAccessibilitySettings()}
          >
            Open Accessibility settings
          </Button>
        </>
      )}
      <Text style={styles.note}>
        The notification lets you start a timer for the suggested behaviour without opening Recupero.
      </Text>
      <AppPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={picked => {
          setPickerOpen(false);
          onChange({ ...value, packageName: picked.packageName, appLabel: picked.label });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: 10 },
  label: { color: Colors.text.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  appLabel: { flex: 1, color: Colors.text.primary, fontSize: 15 },
  placeholder: { color: Colors.text.faint },
  note: { color: Colors.text.muted, fontSize: 12 },
});
