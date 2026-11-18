import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppIcon } from '../../../components/app-icon';
import { Text } from '../../../components/text';
import { useCustomCueOptions } from '../../../hooks/use-custom-cue-options';
import { useCuesStore } from '../../../store/cues-store';
import { getMoodMix } from '../../../utils/checkin-utils';
import { Colors } from '../../../utils/colors';
import { getMoodOption } from '../../../utils/cue-utils';

const MIX_DAYS = 30;
const MIX_COLORS = ['#4ade80', '#a3e635', '#9ca3af', '#f87171', '#818cf8', '#fbbf24', '#5ab0ff', '#f472b6'];

/** Share of each mood over the last 30 days as one bar plus a legend. */
export function CheckInMoodMix() {
  const moodLogs = useCuesStore(state => state.moodLogs);
  const custom = useCustomCueOptions();
  const mix = getMoodMix(moodLogs, MIX_DAYS);
  if (mix.length === 0) return <Text style={styles.empty}>Log a mood to see your mix.</Text>;
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {mix.map((item, index) => (
          <View
            key={item.mood}
            style={{ flex: item.count, backgroundColor: MIX_COLORS[index % MIX_COLORS.length] }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {mix.map(item => (
          <View
            key={item.mood}
            style={styles.legendItem}
          >
            <AppIcon
              value={getMoodOption(item.mood, custom.moods).emoji}
              size={13}
            />
            <Text style={styles.count}>{item.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  count: { color: Colors.text.light, fontSize: 12 },
  empty: { color: Colors.text.muted, fontSize: 13 },
});
