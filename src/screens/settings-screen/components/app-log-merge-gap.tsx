import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import { MAX_APP_LOG_MERGE_GAP_MIN, MIN_APP_LOG_MERGE_GAP_MIN } from '../../../utils/app-usage-utils';
import { Colors } from '../../../utils/colors';

export function AppLogMergeGap() {
  const { appLogMergeGapMin, setAppLogMergeGapMin } = useSettingsStore();
  const change = (delta: number) =>
    setAppLogMergeGapMin(
      Math.max(MIN_APP_LOG_MERGE_GAP_MIN, Math.min(MAX_APP_LOG_MERGE_GAP_MIN, appLogMergeGapMin + delta)),
    );
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>APP & SITE LOGS</Text>
      <View style={styles.card}>
        <Text
          style={styles.label}
          numberOfLines={2}
        >
          Join app logs closer than
        </Text>
        <Button
          variant="icon"
          onPress={() => change(-1)}
          accessibilityLabel="Decrease gap"
        >
          <Text style={styles.step}>−</Text>
        </Button>
        <Text
          style={styles.value}
          numberOfLines={1}
        >
          {appLogMergeGapMin} min
        </Text>
        <Button
          variant="icon"
          onPress={() => change(1)}
          accessibilityLabel="Increase gap"
        >
          <Text style={styles.step}>+</Text>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionTitle: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  step: { color: Colors.text.primary, fontSize: 22, fontWeight: '700', paddingHorizontal: 10 },
  label: { color: Colors.text.secondary, fontSize: 15, flex: 1 },
  value: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 56,
    flexShrink: 0,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
