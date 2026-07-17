import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CueScreenHeader } from '../../components/cues/cue-screen-header';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text } from '../../components/text';
import { useCuesStore } from '../../store/cues-store';
import { useSettingsStore } from '../../store/settings-store';
import { Colors } from '../../utils/colors';
import { addDaysToDateString, toDateString } from '../../utils/date-utils';
import { DateNavigationRow } from '../components/date-navigation-row';
import { ActivityDayGroup } from './components/activity-day-group';

export function CueActivityScreen() {
  const activity = useCuesStore(state => state.activity);
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  const today = toDateString(new Date(), dayCutoffHour);
  const [selectedDate, setSelectedDate] = useState(today);
  const events = useMemo(
    () =>
      activity
        .filter(event => toDateString(new Date(event.ts), dayCutoffHour) === selectedDate)
        .sort((a, b) => b.ts - a.ts),
    [activity, dayCutoffHour, selectedDate],
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <CueScreenHeader title="Activity" />
      <DateNavigationRow
        selectedDate={selectedDate}
        maxDate={today}
        nextDisabled={selectedDate === today}
        onSelect={setSelectedDate}
        onPrevious={() => setSelectedDate(date => addDaysToDateString(date, -1))}
        onNext={() => setSelectedDate(date => (date < today ? addDaysToDateString(date, 1) : date))}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {events.length > 0 ? (
          <ActivityDayGroup
            date={selectedDate}
            dayCutoffHour={dayCutoffHour}
            events={events}
          />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No activity this day</Text>
            <Text style={styles.emptyBody}>Location transitions and mood changes will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  emptyCard: {
    gap: 5,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 18,
  },
  emptyTitle: { color: Colors.text.primary, fontSize: 15, fontWeight: '700' },
  emptyBody: { color: Colors.text.faint, fontSize: 12, lineHeight: 18 },
});
