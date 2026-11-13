import { format } from 'date-fns';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import { buildAppVersionRows } from '../../../utils/app-version-utils';
import { Colors } from '../../../utils/colors';
import { CheckUpdateButton } from './check-update-button';

export function AppVersionSection() {
  const hour12 = useSettingsStore(state => state.timeFormat === '12h');
  const [apkInstalledAt, setApkInstalledAt] = useState<Date | null>(null);

  useEffect(() => {
    Application.getLastUpdateTimeAsync()
      .then(setApkInstalledAt)
      .catch(() => setApkInstalledAt(null));
  }, []);

  const rows = buildAppVersionRows(
    {
      appVersion: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null,
      nativeBuildVersion: Application.nativeBuildVersion,
      channel: Updates.channel,
      runtimeVersion: Updates.runtimeVersion,
      updatesEnabled: Updates.isEnabled,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      updateId: Updates.updateId,
      updateCreatedAt: Updates.createdAt,
      apkInstalledAt,
      gitCommit: process.env.EXPO_PUBLIC_GIT_COMMIT ?? null,
      bundleTime: process.env.EXPO_PUBLIC_BUNDLE_TIME ?? null,
      isDev: __DEV__,
    },
    date => format(date, hour12 ? 'MMM d, yyyy h:mm a' : 'MMM d, yyyy HH:mm'),
  );

  return (
    <View style={styles.section}>
      <CheckUpdateButton />
      {rows.map(row => (
        <Text
          key={row.label}
          style={styles.row}
          selectable
        >
          <Text style={styles.label}>{row.label} </Text>
          {row.value}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 40, marginHorizontal: 16, alignItems: 'center', gap: 4 },
  row: { color: Colors.text.faint, fontSize: 12, textAlign: 'center' },
  label: { color: Colors.text.dim, fontSize: 12, fontWeight: '600' },
});
