import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type UpdateStatus, useCheckUpdate } from '../hooks/use-check-update';
import type { RootStackParamList } from '../types/navigation';
import { Colors } from '../utils/colors';
import { Button } from './button';
import { Text } from './text';

const UPDATE_LABELS: Record<UpdateStatus, string> = {
  idle: 'Check for updates',
  checking: 'Checking…',
  downloading: 'Downloading…',
  restarting: 'Restarting…',
  upToDate: 'Up to date',
  error: 'Update failed · retry',
};

/** The header "..." button: opens a dropdown with Check for updates, Patch notes and Settings. */
export function TabHeaderMenu() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { status, isUpdatePending, unavailable, busy, run } = useCheckUpdate();

  const go = (screen: 'PatchNotes' | 'Settings') => {
    setOpen(false);
    navigation.navigate(screen);
  };

  const updateLabel = isUpdatePending && !busy ? 'Update ready · restart' : UPDATE_LABELS[status];

  return (
    <>
      <Button
        variant="icon"
        onPress={() => setOpen(true)}
        accessibilityLabel="More options"
      >
        <Ionicons
          name="ellipsis-vertical"
          size={22}
          color={Colors.text.secondary}
        />
      </Button>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { paddingTop: insets.top + 48 }]}
          onPress={() => setOpen(false)}
        >
          <View style={styles.menu}>
            {/* Stays open so the result (Up to date / Downloading…) shows right in the row. */}
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed, unavailable && styles.disabled]}
              onPress={run}
              disabled={busy || unavailable}
              accessibilityRole="menuitem"
              accessibilityLabel={updateLabel}
            >
              {busy ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.text.primary}
                />
              ) : (
                <Ionicons
                  name={status === 'upToDate' ? 'checkmark-circle-outline' : 'cloud-download-outline'}
                  size={20}
                  color={Colors.text.primary}
                />
              )}
              <Text
                style={styles.label}
                numberOfLines={1}
              >
                {updateLabel}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => go('PatchNotes')}
              accessibilityRole="menuitem"
              accessibilityLabel="Patch notes"
            >
              <Ionicons
                name="document-text-outline"
                size={20}
                color={Colors.text.primary}
              />
              <Text
                style={styles.label}
                numberOfLines={1}
              >
                Patch notes
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => go('Settings')}
              accessibilityRole="menuitem"
              accessibilityLabel="Settings"
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={Colors.text.primary}
              />
              <Text
                style={styles.label}
                numberOfLines={1}
              >
                Settings
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'flex-end', paddingRight: 8 },
  menu: {
    minWidth: 220,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.5 },
  label: { color: Colors.text.primary, fontSize: 15, flexShrink: 1 },
});
