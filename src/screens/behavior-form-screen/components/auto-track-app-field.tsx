import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppUsage, type LaunchableApp } from '../../../../modules/app-usage';
import { Button } from '../../../components/button';
import { CheckboxRow } from '../../../components/checkbox-row';
import { Text } from '../../../components/text';
import { useAppUsagePermission } from '../../../hooks/use-app-usage-permission';
import { Colors } from '../../../utils/colors';
import { AppPickerModal } from './app-picker-modal';

interface AutoTrackAppFieldProps {
  enabled: boolean;
  app: LaunchableApp | undefined;
  onToggle: () => void;
  onAppChange: (app: LaunchableApp) => void;
}

export function AutoTrackAppField({ enabled, app, onToggle, onAppChange }: AutoTrackAppFieldProps) {
  const { usageAccess: granted } = useAppUsagePermission();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!AppUsage) return null;

  return (
    <CheckboxRow
      label="Auto-track app usage"
      hint="Log time spent in an app automatically"
      checked={enabled}
      onToggle={onToggle}
    >
      {enabled && (
        <View style={styles.content}>
          {!granted && (
            <>
              <Text style={styles.note}>
                Recupero needs usage access to see how long you spend in other apps. Turn it on for Recupero, then come
                back.
              </Text>
              <Button
                size="sm"
                onPress={() => AppUsage?.openPermissionSettings()}
              >
                Grant usage access
              </Button>
            </>
          )}
          <View style={styles.appRow}>
            <Text style={[styles.appLabel, !app && styles.placeholder]}>{app?.label ?? 'No app selected'}</Text>
            <Button
              size="sm"
              onPress={() => setPickerOpen(true)}
            >
              {app ? 'Change' : 'Choose app'}
            </Button>
          </View>
          <Text style={styles.note}>
            Sessions of a minute or more are logged when you open Recupero. Turn on duration XP to earn XP per minute.
          </Text>
          <AppPickerModal
            visible={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onPick={picked => {
              setPickerOpen(false);
              onAppChange(picked);
            }}
          />
        </View>
      )}
    </CheckboxRow>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appLabel: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 15,
  },
  placeholder: {
    color: Colors.text.faint,
  },
  note: {
    color: Colors.text.muted,
    fontSize: 12,
  },
});
