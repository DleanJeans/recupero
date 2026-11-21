import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { type UpdateStatus, useCheckUpdate } from '../../../hooks/use-check-update';
import { Colors } from '../../../utils/colors';

const LABELS: Record<UpdateStatus, string> = {
  idle: 'Check for update',
  checking: 'Checking…',
  downloading: 'Downloading update…',
  restarting: 'Restarting…',
  upToDate: 'Up to date · check again',
  error: 'Check for update',
};

/**
 * Checks the update server, downloads a new OTA update if there is one, then restarts straight into it,
 * so applying an update is a single tap instead of waiting for the "Update ready" pill and restarting.
 */
export function CheckUpdateButton() {
  const { status, errorMessage, isUpdatePending, unavailable, busy, run } = useCheckUpdate();

  const label = isUpdatePending && !busy ? 'Update ready · restart now' : LABELS[status];

  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed, unavailable && styles.disabled]}
        onPress={run}
        disabled={busy || unavailable}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {busy ? (
          <ActivityIndicator
            size="small"
            color={Colors.text.primary}
          />
        ) : (
          <Ionicons
            name={status === 'upToDate' ? 'checkmark-circle-outline' : 'cloud-download-outline'}
            size={16}
            color={Colors.text.primary}
          />
        )}
        <Text style={styles.text}>{label}</Text>
      </Pressable>
      {unavailable ? (
        <Text style={styles.note}>Updates are off in development builds served by Metro</Text>
      ) : status === 'error' ? (
        <Text
          style={styles.error}
          selectable
        >
          Couldn't update: {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, marginBottom: 8 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: Colors.bg.elevated,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  text: { color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
  note: { color: Colors.text.faint, fontSize: 12, textAlign: 'center' },
  error: { color: Colors.text.dim, fontSize: 12, textAlign: 'center' },
});
