import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useHealthStore } from '../../../store/health-store';
import { Colors } from '../../../utils/colors';
import { getGoogleHealthClientId } from '../../../utils/google-health-auth';
import { connectGoogleHealth, disconnectGoogleHealth, syncGoogleHealth } from '../../../utils/google-health-sync';
import { formatTime } from '../../../utils/time-utils';
import { SleepBehaviorPickerModal } from './sleep-behavior-picker-modal';

const AZM_GOAL_STEP = 5;

/** Connects Google Health (Fitbit): sleep logs to a behaviour and fills Energy; Active Zone Minutes count toward a daily goal. */
export function GoogleHealthSection() {
  const connected = useHealthStore(state => state.tokens != null);
  const syncing = useHealthStore(state => state.syncing);
  const lastSyncAt = useHealthStore(state => state.lastSyncAt);
  const lastError = useHealthStore(state => state.lastError);
  const sleepBehaviorId = useHealthStore(state => state.sleepBehaviorId);
  const azmDailyGoal = useHealthStore(state => state.azmDailyGoal);
  const setAzmDailyGoal = useHealthStore(state => state.setAzmDailyGoal);
  const sleepBehavior = useBehaviorStore(state => state.behaviors.find(b => b.id === sleepBehaviorId));
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string>();
  const [picking, setPicking] = useState(false);
  const configured = getGoogleHealthClientId() != null;

  const connect = async () => {
    setConnecting(true);
    setConnectError(undefined);
    const error = await connectGoogleHealth();
    setConnecting(false);
    setConnectError(error);
  };

  const error = connectError ?? lastError;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>GOOGLE HEALTH (FITBIT)</Text>
      <View style={styles.card}>
        {!configured ? (
          <View style={styles.connect}>
            <Text style={styles.hint}>
              Not set up in this build. It needs a Google Cloud OAuth client id in GOOGLE_HEALTH_CLIENT_ID.
            </Text>
          </View>
        ) : !connected ? (
          <View style={styles.connect}>
            <Text style={styles.hint}>
              Logs your Fitbit sleep, fills Energy by time asleep, and tracks Active Zone Minutes against a daily goal.
            </Text>
            <Button
              variant="primary"
              onPress={connect}
              disabled={connecting}
            >
              {connecting ? 'Connecting…' : 'Connect Fitbit'}
            </Button>
          </View>
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => setPicking(true)}
              accessibilityRole="button"
            >
              <Text style={styles.label}>Sleep logs to</Text>
              <Text style={styles.value}>{sleepBehavior ? sleepBehavior.name : 'Off'} ›</Text>
            </Pressable>
            <View style={[styles.row, styles.divider]}>
              <Text style={styles.label}>Active Zone Minutes goal</Text>
              <View style={styles.stepper}>
                <Pressable
                  style={({ pressed }) => [styles.step, pressed && styles.pressed]}
                  onPress={() => setAzmDailyGoal(azmDailyGoal - AZM_GOAL_STEP)}
                  accessibilityLabel="Lower goal"
                >
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Text style={styles.value}>{azmDailyGoal} / day</Text>
                <Pressable
                  style={({ pressed }) => [styles.step, pressed && styles.pressed]}
                  onPress={() => setAzmDailyGoal(azmDailyGoal + AZM_GOAL_STEP)}
                  accessibilityLabel="Raise goal"
                >
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.row, styles.divider, pressed && styles.pressed]}
              onPress={() => syncGoogleHealth({ force: true })}
              disabled={syncing}
              accessibilityRole="button"
            >
              <Text style={styles.label}>{lastSyncAt ? `Synced ${formatTime(lastSyncAt)}` : 'Not synced yet'}</Text>
              {syncing ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.text.muted}
                />
              ) : (
                <Text style={styles.action}>Sync now</Text>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.row, styles.divider, pressed && styles.pressed]}
              onPress={() => {
                setConnectError(undefined);
                disconnectGoogleHealth();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.danger}>Disconnect</Text>
            </Pressable>
          </>
        )}
        {configured && error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <SleepBehaviorPickerModal
        visible={picking}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionTitle: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { backgroundColor: Colors.bg.card, borderRadius: 8 },
  connect: { padding: 14, gap: 12 },
  hint: { color: Colors.text.muted, fontSize: 13, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border.default },
  label: { color: Colors.text.secondary, fontSize: 14, flexShrink: 1 },
  value: { color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
  action: { color: Colors.type.desirable, fontSize: 14, fontWeight: '600' },
  danger: { color: Colors.status.dangerLight, fontSize: 14 },
  error: { color: Colors.status.dangerLight, fontSize: 12, lineHeight: 17, paddingHorizontal: 14, paddingBottom: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.input,
  },
  stepText: { color: Colors.text.primary, fontSize: 16, fontWeight: '700' },
});
