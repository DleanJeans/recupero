import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppIcon } from '../../../components/app-icon';
import { CueTriggerIcon } from '../../../components/cues/cue-trigger-icon';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { type CueSource, type CueXpStats, cueKindToTriggerType, getCueAccent } from '../../../utils/cue-utils';

interface CueSourceRowProps {
  source: CueSource;
  stats: CueXpStats;
  /** Highest XP across all cues, used to scale the bar. */
  maxXp: number;
  onPress: () => void;
}

export function CueSourceRow({ source, stats, maxXp, onPress }: CueSourceRowProps) {
  const type = cueKindToTriggerType(source.kind);
  const accent = getCueAccent(type);
  const fill = maxXp > 0 ? Math.max(stats.xp > 0 ? 0.04 : 0, stats.xp / maxXp) : 0;
  const logLabel = stats.logCount === 0 ? 'No logs yet' : `${stats.logCount} ${stats.logCount === 1 ? 'log' : 'logs'}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${source.label}, ${Math.round(stats.xp)} XP, ${logLabel}`}
    >
      {source.emoji ? (
        <View style={[styles.emojiIcon, { backgroundColor: `${accent}1f` }]}>
          <AppIcon
            value={source.emoji}
            style={styles.emoji}
          />
        </View>
      ) : (
        <CueTriggerIcon type={type} />
      )}
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {source.label}
          </Text>
          <Text style={[styles.xp, stats.xp > 0 && { color: accent }]}>{Math.round(stats.xp)} XP</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: accent }]} />
        </View>
        <Text style={styles.subtitle}>{logLabel}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={Colors.text.faint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  emojiIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 19 },
  copy: { flex: 1, minWidth: 0, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { flex: 1, color: Colors.text.primary, fontSize: 14, fontWeight: '700' },
  xp: { color: Colors.text.faint, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 4, borderRadius: 2, backgroundColor: Colors.bg.input, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  subtitle: { color: Colors.text.faint, fontSize: 11 },
  pressed: { opacity: 0.72 },
});
