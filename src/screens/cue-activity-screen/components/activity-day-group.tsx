import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CueActivityRow } from '../../../components/cues/cue-activity-row';
import { CueSectionLabel } from '../../../components/cues/cue-section-label';
import type { CueActivityEvent } from '../../../types/cue';
import { Colors } from '../../../utils/colors';
import { describeDay, formatDateDisplay } from '../../../utils/date-utils';

interface ActivityDayGroupProps {
  date: string;
  dayCutoffHour: number;
  events: CueActivityEvent[];
}

export function ActivityDayGroup({ date, dayCutoffHour, events }: ActivityDayGroupProps) {
  return (
    <View style={styles.section}>
      <CueSectionLabel>
        {describeDay(date, dayCutoffHour)} · {formatDateDisplay(date)}
      </CueSectionLabel>
      <View style={styles.card}>
        {events.map(event => (
          <CueActivityRow
            key={event.id}
            event={event}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
});
