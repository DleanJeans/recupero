import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconTile } from '../../../components/icon-tile';
import { Text } from '../../../components/text';
import { useCustomCueOptions } from '../../../hooks/use-custom-cue-options';
import type { CheckInEvent } from '../../../utils/checkin-utils';
import { Colors } from '../../../utils/colors';
import { getBodySensationOption, getMoodOption } from '../../../utils/cue-utils';
import { formatDateDisplay, toDateString } from '../../../utils/date-utils';
import { formatTime } from '../../../utils/time-utils';

interface CheckInLogRowProps {
  event: CheckInEvent;
}

export function CheckInLogRow({ event }: CheckInLogRowProps) {
  const custom = useCustomCueOptions();
  const option =
    event.kind === 'mood'
      ? getMoodOption(event.value, custom.moods)
      : getBodySensationOption(event.value, custom.sensations);
  const accent = event.kind === 'mood' ? Colors.cue.mood : Colors.cue.body;
  const date = new Date(event.ts);
  return (
    <View style={styles.row}>
      <IconTile
        value={option.emoji}
        size={38}
        radius={12}
        emojiSize={19}
        style={{ backgroundColor: `${accent}1f` }}
      />
      <View style={styles.copy}>
        <Text style={styles.title}>{option.label}</Text>
        <Text style={styles.sub}>
          {formatDateDisplay(toDateString(date))} · {formatTime(event.ts)}
        </Text>
      </View>
      <Text style={[styles.xp, event.xp > 0 && { color: accent }]}>+{event.xp} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 10,
  },
  copy: { flex: 1, gap: 1 },
  title: { color: Colors.text.primary, fontSize: 14, fontWeight: '700' },
  sub: { color: Colors.text.muted, fontSize: 12 },
  xp: { color: Colors.text.muted, fontSize: 12, fontWeight: '700' },
});
