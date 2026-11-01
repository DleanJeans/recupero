import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import { Colors } from '../../../utils/colors';

export function MoneyRewardsSection() {
  const moneyRewardsEnabled = useSettingsStore(s => s.moneyRewardsEnabled);
  const setMoneyRewardsEnabled = useSettingsStore(s => s.setMoneyRewardsEnabled);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>REWARDS</Text>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
        onPress={() => setMoneyRewardsEnabled(!moneyRewardsEnabled)}
        accessibilityRole="switch"
        accessibilityState={{ checked: moneyRewardsEnabled }}
      >
        <View style={styles.labels}>
          <Text style={styles.label}>Money rewards</Text>
          <Text style={styles.hint}>Off hides balances and reward amounts. Your data is kept.</Text>
        </View>
        <View style={[styles.toggle, moneyRewardsEnabled && styles.toggleOn]}>
          <View style={[styles.thumb, moneyRewardsEnabled && styles.thumbOn]} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionTitle: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  labels: { flex: 1, gap: 2, marginRight: 12 },
  label: {
    color: Colors.text.secondary,
    fontSize: 15,
  },
  hint: {
    color: Colors.text.faint,
    fontSize: 12,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.bg.elevated,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: {
    backgroundColor: Colors.status.success,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.text.muted,
  },
  thumbOn: {
    backgroundColor: Colors.text.primary,
    alignSelf: 'flex-end',
  },
});
