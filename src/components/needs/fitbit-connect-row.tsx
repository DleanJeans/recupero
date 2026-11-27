import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useHealthStore } from '../../store/health-store';
import { Colors } from '../../utils/colors';
import { getGoogleHealthClientId } from '../../utils/google-health-auth';
import { connectGoogleHealth, syncGoogleHealth } from '../../utils/google-health-sync';
import { formatTime } from '../../utils/time-utils';
import { Button } from '../button';
import { Text } from '../text';

/** Compact Fitbit (Google Health) Connect / Sync now row; the full options live in Needs settings. */
export function FitbitConnectRow() {
  const connected = useHealthStore(state => state.tokens != null);
  const syncing = useHealthStore(state => state.syncing);
  const lastSyncAt = useHealthStore(state => state.lastSyncAt);
  const lastError = useHealthStore(state => state.lastError);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string>();
  if (getGoogleHealthClientId() == null) return null;

  const connect = async () => {
    setConnecting(true);
    setConnectError(undefined);
    const error = await connectGoogleHealth();
    setConnecting(false);
    setConnectError(error);
  };

  const error = connectError ?? lastError;

  return (
    <View style={styles.card}>
      {connected ? (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={() => syncGoogleHealth({ force: true })}
          disabled={syncing}
          accessibilityRole="button"
        >
          <Text style={styles.label}>
            Fitbit · {lastSyncAt ? `synced ${formatTime(lastSyncAt)}` : 'not synced yet'}
          </Text>
          {syncing ? (
            <ActivityIndicator
              size="small"
              color={Colors.text.muted}
            />
          ) : (
            <Text style={styles.action}>Sync now</Text>
          )}
        </Pressable>
      ) : (
        <View style={styles.connect}>
          <Text style={styles.hint}>
            Connect Fitbit to log sleep and fill Brain Energy and Body Energy by time asleep.
          </Text>
          <Button
            variant="primary"
            onPress={connect}
            disabled={connecting}
          >
            {connecting ? 'Connecting…' : 'Connect Fitbit'}
          </Button>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.bg.card, borderRadius: 8, marginTop: 16 },
  pressed: { opacity: 0.7 },
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
  label: { color: Colors.text.secondary, fontSize: 14, flexShrink: 1 },
  action: { color: Colors.type.desirable, fontSize: 14, fontWeight: '600' },
  error: { color: Colors.status.dangerLight, fontSize: 12, lineHeight: 17, paddingHorizontal: 14, paddingBottom: 12 },
});
