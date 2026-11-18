import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CueToggle } from '../../../components/cues/cue-toggle';
import { Text } from '../../../components/text';
import { useCheckInStore } from '../../../store/checkin-store';
import {
  CHECKIN_BODY_XP,
  CHECKIN_DAILY_XP_LOGS,
  CHECKIN_MOOD_XP,
  CHECKIN_SELECTABLE_HOURS,
} from '../../../utils/checkin-utils';
import { Colors } from '../../../utils/colors';
import { requestNotificationPermission } from '../../../utils/reminder-notifications';
import { CheckInChipRow } from './check-in-chip-row';

const SKIP_OPTIONS = [1, 2, 3, 4, 6].map(value => ({ value, label: `${value} h` }));
const STALE_OPTIONS = [2, 4, 8, 12].map(value => ({ value, label: `${value} h` }));
const HOUR_OPTIONS = CHECKIN_SELECTABLE_HOURS.map(value => ({ value, label: `${value}:00` }));

interface SettingRowProps {
  title: string;
  detail?: string;
  children: React.ReactNode;
}

function SettingRow({ title, detail, children }: SettingRowProps) {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** Notification nudges, stale time and the XP rules (read-only). */
export function CheckInSettings() {
  const store = useCheckInStore();

  const toggleNudges = async (enabled: boolean) => {
    if (enabled && !(await requestNotificationPermission())) return;
    store.setNudgesEnabled(enabled);
  };

  return (
    <View style={styles.card}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleCopy}>
          <Text style={styles.title}>Check-in nudges</Text>
          <Text style={styles.detail}>A notification with mood buttons. Tap one to log without opening the app.</Text>
        </View>
        <CueToggle
          value={store.nudgesEnabled}
          onValueChange={toggleNudges}
          accessibilityLabel="Check-in nudges"
        />
      </View>

      {store.nudgesEnabled && (
        <>
          <SettingRow
            title="Nudge times"
            detail="Quiet from 23:00 to 07:00."
          >
            <CheckInChipRow
              options={HOUR_OPTIONS}
              isSelected={hour => store.nudgeHours.includes(hour)}
              onPress={store.toggleNudgeHour}
            />
          </SettingRow>
          <SettingRow
            title="Skip if checked in within"
            detail="Nudges soon after a log are dropped."
          >
            <CheckInChipRow
              options={SKIP_OPTIONS}
              isSelected={hours => store.skipWithinHours === hours}
              onPress={store.setSkipWithinHours}
            />
          </SettingRow>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.title}>Streak-saver at 21:00</Text>
              <Text style={styles.detail}>Only when you have a streak and nothing logged today.</Text>
            </View>
            <CueToggle
              value={store.streakSaverEnabled}
              onValueChange={store.setStreakSaverEnabled}
              accessibilityLabel="Streak-saver"
            />
          </View>
        </>
      )}

      <SettingRow
        title="Squares turn amber after"
        detail="When the last mood or body log is older than this."
      >
        <CheckInChipRow
          options={STALE_OPTIONS}
          isSelected={hours => store.staleHours === hours}
          onPress={store.setStaleHours}
        />
      </SettingRow>

      <Text style={styles.rules}>
        XP: mood +{CHECKIN_MOOD_XP}, body +{CHECKIN_BODY_XP}, only the first {CHECKIN_DAILY_XP_LOGS} logs a day. Any
        mood or body log keeps the streak.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 12,
    gap: 14,
  },
  row: { gap: 7 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleCopy: { flex: 1, gap: 2 },
  title: { color: Colors.text.primary, fontSize: 14, fontWeight: '700' },
  detail: { color: Colors.text.muted, fontSize: 12 },
  rules: { color: Colors.text.muted, fontSize: 12, lineHeight: 17 },
});
