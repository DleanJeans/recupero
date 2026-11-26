import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { DEFAULT_DRIVE_MIN } from '../../../utils/drive-estimate-utils';
import { ESTIMATE_STEP_MIN, formatEstimate, MAX_ESTIMATE_MIN } from '../../../utils/task-schedule-utils';

interface TaskDriveEstimateDialogProps {
  placeName: string;
  /** Current estimate in minutes. */
  minutes: number;
  /** Average of the user's past drives to this place, if any. */
  placeAverageMin?: number;
  /** Average of all Driving logs, if any. */
  allAverageMin?: number;
  onSave: (minutes: number | undefined) => void;
  onClose: () => void;
}

/** Set how long the drive to a task's place takes. Docks to the top while nothing needs the keyboard (no text box). */
export function TaskDriveEstimateDialog({
  placeName,
  minutes,
  placeAverageMin,
  allAverageMin,
  onSave,
  onClose,
}: TaskDriveEstimateDialogProps) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(minutes);
  const step = (delta: number) => setValue(current => Math.max(1, Math.min(MAX_ESTIMATE_MIN, current + delta)));

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { paddingTop: 16 + insets.top, paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={styles.dialog}>
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {`Drive to ${placeName}`}
          </Text>
          <Text style={styles.sub}>How long does it take?</Text>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepButton}
              onPress={() => step(-ESTIMATE_STEP_MIN)}
              accessibilityRole="button"
              accessibilityLabel="Less time"
            >
              <Ionicons
                name="remove"
                size={20}
                color={Colors.text.primary}
              />
            </Pressable>
            <Text
              style={styles.value}
              numberOfLines={1}
            >
              {formatEstimate(value)}
            </Text>
            <Pressable
              style={styles.stepButton}
              onPress={() => step(ESTIMATE_STEP_MIN)}
              accessibilityRole="button"
              accessibilityLabel="More time"
            >
              <Ionicons
                name="add"
                size={20}
                color={Colors.text.primary}
              />
            </Pressable>
          </View>
          <View style={styles.chips}>
            {placeAverageMin != null && (
              <Chip
                label={`Use average ${formatEstimate(placeAverageMin)}`}
                highlight
                onPress={() => setValue(placeAverageMin)}
              />
            )}
            {allAverageMin != null && allAverageMin !== placeAverageMin && (
              <Chip
                label={`All drives ${formatEstimate(allAverageMin)}`}
                onPress={() => setValue(allAverageMin)}
              />
            )}
            <Chip
              label={`Reset ${formatEstimate(DEFAULT_DRIVE_MIN)}`}
              onPress={() => onSave(undefined)}
            />
          </View>
          <View style={styles.buttons}>
            <Button
              variant="secondary"
              onPress={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={() => onSave(value)}
            >
              Save
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Chip({ label, highlight, onPress }: { label: string; highlight?: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.chip, highlight && styles.chipHighlight]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text
        style={[styles.chipText, highlight && styles.chipTextHighlight]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.6)' },
  dialog: { backgroundColor: Colors.bg.card, borderRadius: 16, padding: 16, gap: 10 },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  sub: { color: Colors.text.muted, fontSize: 12 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    padding: 8,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { flex: 1, color: Colors.text.primary, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: Colors.bg.input, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  chipHighlight: { backgroundColor: '#14532d' },
  chipText: { color: Colors.text.secondary, fontSize: 12.5 },
  chipTextHighlight: { color: '#86efac' },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
});
