import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ProgressRing } from '../../../components/progress-ring';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import {
  formatTidyIn,
  formatTidyPercent,
  getMessiestSpot,
  getNextLowSpot,
  getTidyColor,
  type TidySpotState,
} from '../../../utils/tidiness-utils';

interface TidinessSummaryProps {
  level: number | undefined;
  states: TidySpotState[];
  now: number;
}

/** Overall ring plus the messiest spot, the next one to go low, and what was cleaned today. */
export function TidinessSummary({ level, states, now }: TidinessSummaryProps) {
  const color = getTidyColor(level);
  const messiest = getMessiestSpot(states);
  const next = getNextLowSpot(states, now);
  const today = new Date(now).toDateString();
  const cleanedToday = states
    .filter(state => state.lastCleaned && new Date(state.lastCleaned.ts).toDateString() === today)
    .map(state => state.spot.name);

  return (
    <View style={styles.card}>
      <ProgressRing
        share={(level ?? 0) / 100}
        size={84}
        thickness={8}
        color={color}
      >
        <Text
          style={[styles.pct, { color }]}
          numberOfLines={1}
        >
          {formatTidyPercent(level)}
        </Text>
        <Text style={styles.ringLabel}>overall</Text>
      </ProgressRing>
      <View style={styles.lines}>
        <Text
          style={styles.line}
          numberOfLines={1}
        >
          <Text style={styles.key}>Messiest: </Text>
          {messiest ? (
            <Text style={{ color: getTidyColor(messiest.level) }}>
              {messiest.spot.name} {formatTidyPercent(messiest.level)}
            </Text>
          ) : (
            '–'
          )}
        </Text>
        <Text
          style={styles.line}
          numberOfLines={1}
        >
          <Text style={styles.key}>Next to go low: </Text>
          {next ? `${next.state.spot.name}, ${formatTidyIn(next.at, now)}` : '–'}
        </Text>
        <Text
          style={styles.line}
          numberOfLines={1}
        >
          <Text style={styles.key}>Cleaned today: </Text>
          {cleanedToday.length > 0 ? cleanedToday.join(', ') : 'nothing yet'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 12,
  },
  pct: { fontSize: 20, fontWeight: '700' },
  ringLabel: { color: Colors.text.muted, fontSize: 10, marginTop: -2 },
  lines: { flex: 1, minWidth: 0, gap: 4 },
  line: { color: Colors.text.secondary, fontSize: 13 },
  key: { color: Colors.text.primary, fontWeight: '600' },
});
