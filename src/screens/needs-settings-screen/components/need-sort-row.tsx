import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useNeedsStore } from '../../../store/needs-store';
import type { NeedId } from '../../../types/need';
import { Colors } from '../../../utils/colors';
import { NEED_INFO } from '../../../utils/need-utils';

interface NeedSortRowProps {
  needId: NeedId;
  first: boolean;
  last: boolean;
}

/** One need in sort mode: its icon and name with move up / move down buttons. */
export function NeedSortRow({ needId, first, last }: NeedSortRowProps) {
  const moveNeed = useNeedsStore(state => state.moveNeed);
  const info = NEED_INFO[needId];

  return (
    <View style={[styles.row, !first && styles.divider]}>
      <Text style={styles.emoji}>{info.emoji}</Text>
      <Text style={styles.label}>{info.label}</Text>
      <Pressable
        style={[styles.button, first && styles.disabled]}
        disabled={first}
        onPress={() => moveNeed(needId, -1)}
        accessibilityRole="button"
        accessibilityLabel={`Move ${info.label} up`}
      >
        <Text style={styles.arrow}>▲</Text>
      </Pressable>
      <Pressable
        style={[styles.button, last && styles.disabled]}
        disabled={last}
        onPress={() => moveNeed(needId, 1)}
        accessibilityRole="button"
        accessibilityLabel={`Move ${info.label} down`}
      >
        <Text style={styles.arrow}>▼</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 6 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border.default },
  emoji: { fontSize: 18, width: 24, textAlign: 'center' },
  label: { flex: 1, color: Colors.text.secondary, fontSize: 15 },
  button: {
    width: 40,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.3 },
  arrow: { color: Colors.text.light, fontSize: 14 },
});
