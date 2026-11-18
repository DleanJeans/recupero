import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { CheckInState } from '../../../hooks/use-check-in';
import { Colors } from '../../../utils/colors';

interface CheckInStatsProps {
  checkIn: CheckInState;
}

interface StatProps {
  value: string;
  label: string;
}

function Stat({ value, label }: StatProps) {
  return (
    <View style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

/** Level bar plus streak, best streak and log count. */
export function CheckInStats({ checkIn }: CheckInStatsProps) {
  const { level, streak, xp, events } = checkIn;
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Text style={styles.badgeEmoji}>✨</Text>
          <Text style={styles.badgeLevel}>Lv {level.level}</Text>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.title}>Check in</Text>
          <Text style={styles.sub}>
            {Math.floor(xp)} XP · {Math.ceil(level.xpToNext)} XP to Lv {level.level + 1}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(level.progress * 100)}%` }]} />
          </View>
        </View>
      </View>
      <View style={styles.stats}>
        <Stat
          value={`🔥 ${streak.current}`}
          label="streak"
        />
        <Stat
          value={String(streak.best)}
          label="best"
        />
        <Stat
          value={String(events.length)}
          label="logs"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: Colors.star.filled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: { fontSize: 22 },
  badgeLevel: { color: Colors.text.light, fontSize: 11 },
  heroCopy: { flex: 1, gap: 3 },
  title: { color: Colors.text.primary, fontSize: 18, fontWeight: '700' },
  sub: { color: Colors.text.muted, fontSize: 12 },
  track: { height: 5, borderRadius: 3, backgroundColor: Colors.bg.input, overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', backgroundColor: Colors.star.filled },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: Colors.bg.card, borderRadius: 12, paddingVertical: 10 },
  value: { color: Colors.text.primary, fontSize: 18, fontWeight: '700' },
  label: { color: Colors.text.muted, fontSize: 11 },
});
