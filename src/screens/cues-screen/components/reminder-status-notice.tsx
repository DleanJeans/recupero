import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { resyncReminders } from '../../../hooks/use-reminder-engine';
import { useCuesStore } from '../../../store/cues-store';
import { Colors } from '../../../utils/colors';
import {
  getMissingReminderPermissions,
  type MissingReminderPermission,
  requestReminderPermissions,
} from '../../../utils/reminder-permissions';
import { getActivePushReminders } from '../../../utils/reminder-utils';

const MISSING_LABELS: Record<MissingReminderPermission, string> = {
  notifications: 'notifications are off',
  location: 'location is not set to "Allow all the time"',
};

export function ReminderStatusNotice() {
  const cues = useCuesStore(state => state.cues);
  const [missing, setMissing] = useState<MissingReminderPermission[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMissingReminderPermissions(cues)
        .then(result => active && setMissing(result))
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, [cues]),
  );

  const handleFix = async () => {
    const stillMissing = await requestReminderPermissions(getActivePushReminders(cues).map(cue => cue.trigger));
    setMissing(stillMissing);
    if (stillMissing.length > 0) await Linking.openSettings();
    else await resyncReminders();
  };

  if (missing.length > 0) {
    return (
      <View style={[styles.notice, styles.warning]}>
        <Text style={styles.text}>
          Some reminders can't fire: {missing.map(item => MISSING_LABELS[item]).join(' and ')}.
        </Text>
        <Pressable
          onPress={handleFix}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.action}>Allow</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.notice}>
      <Text style={styles.text}>
        Place, time and habit reminders send a notification. Place reminders use at least a 100 m geofence, since
        Android misses smaller ones. Mood and body reminders show as suggestions when you log them.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    padding: 12,
  },
  warning: {
    borderWidth: 1,
    borderColor: Colors.star.filled,
  },
  text: {
    flex: 1,
    color: Colors.text.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  action: {
    color: Colors.star.filled,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
