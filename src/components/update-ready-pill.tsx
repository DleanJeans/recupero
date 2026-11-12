import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors } from '../utils/colors';
import { Text } from './text';

/** Don't ask the update server more than once in this window when the app keeps coming back to the foreground. */
const FOREGROUND_CHECK_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Floats above the bottom nav once an OTA update has downloaded, so it can be applied with one tap
 * instead of closing and reopening the app twice. Also checks for updates when the app returns to the foreground.
 */
export function UpdateReadyPill({ style }: { style?: StyleProp<ViewStyle> }) {
  const { isUpdatePending } = Updates.useUpdates();
  const lastCheckRef = useRef(Date.now());
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    // Disabled in dev-client sessions served by Metro, where there is nothing to fetch.
    if (!Updates.isEnabled || __DEV__) return;
    const subscription = AppState.addEventListener('change', async state => {
      if (state !== 'active' || Date.now() - lastCheckRef.current < FOREGROUND_CHECK_INTERVAL_MS) return;
      lastCheckRef.current = Date.now();
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // Offline or the server is unreachable: try again on a later foreground.
      }
    });
    return () => subscription.remove();
  }, []);

  if (!isUpdatePending) return null;

  const reload = async () => {
    setIsReloading(true);
    try {
      await Updates.reloadAsync();
    } catch {
      setIsReloading(false);
    }
  };

  return (
    <View
      style={[styles.wrap, style]}
      pointerEvents="box-none"
    >
      <Pressable
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        onPress={reload}
        disabled={isReloading}
        accessibilityRole="button"
        accessibilityLabel="Update ready, restart to apply"
      >
        <Ionicons
          name="cloud-download-outline"
          size={15}
          color={Colors.text.primary}
        />
        <Text style={styles.text}>{isReloading ? 'Restarting…' : 'Update ready · tap to restart'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 6,
    backgroundColor: Colors.bg.primary,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.bg.elevated,
  },
  pressed: { opacity: 0.8 },
  text: { color: Colors.text.primary, fontSize: 13, fontWeight: '600' },
});
