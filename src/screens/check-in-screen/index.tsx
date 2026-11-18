import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CueScreenHeader } from '../../components/cues/cue-screen-header';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { SafeAreaView } from '../../components/safe-area-view';
import { useCheckIn } from '../../hooks/use-check-in';
import { useSettingsStore } from '../../store/settings-store';
import { getCheckInDays } from '../../utils/checkin-utils';
import { Colors } from '../../utils/colors';
import { CheckInCalendar } from './components/check-in-calendar';
import { CheckInLogRow } from './components/check-in-log-row';
import { CheckInMoodMix } from './components/check-in-mood-mix';
import { CheckInSettings } from './components/check-in-settings';
import { CheckInStats } from './components/check-in-stats';

const CALENDAR_DAYS = 14;
const RECENT_LOGS = 12;

/** Check-in level, streak, calendar, mood mix, recent logs and the nudge settings. */
export function CheckInScreen() {
  const checkIn = useCheckIn();
  const dayCutoffHour = useSettingsStore(state => state.dayCutoffHour);
  const days = useMemo(
    () => getCheckInDays(checkIn.events, CALENDAR_DAYS, Date.now(), dayCutoffHour),
    [checkIn.events, dayCutoffHour],
  );
  const recent = useMemo(() => [...checkIn.events].reverse().slice(0, RECENT_LOGS), [checkIn.events]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <CueScreenHeader
        title="Check in"
        showBalance={false}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <CheckInStats checkIn={checkIn} />

        <View style={styles.section}>
          <CueSectionLabel>Last 2 weeks</CueSectionLabel>
          <CheckInCalendar days={days} />
        </View>

        <View style={styles.section}>
          <CueSectionLabel>Mood mix · 30 days</CueSectionLabel>
          <CheckInMoodMix />
        </View>

        <View style={styles.section}>
          <CueSectionLabel>Recent logs</CueSectionLabel>
          {recent.map(event => (
            <CheckInLogRow
              key={event.id}
              event={event}
            />
          ))}
        </View>

        <View style={styles.section}>
          <CueSectionLabel>Settings</CueSectionLabel>
          <CheckInSettings />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  section: { gap: 8 },
});
