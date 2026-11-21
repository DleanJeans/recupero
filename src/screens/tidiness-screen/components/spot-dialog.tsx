import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../components/button';
import { CueBehaviorPicker } from '../../../components/cues/cue-behavior-picker';
import { EmojiPicker } from '../../../components/emoji-picker';
import { FullScreenModal } from '../../../components/full-screen-modal';
import { StepSlider } from '../../../components/step-slider';
import { Text, TextInput } from '../../../components/text';
import { useKeyboardVisible } from '../../../hooks/use-keyboard-visible';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useTidinessStore } from '../../../store/tidiness-store';
import type { TidyWeight } from '../../../types/tidiness';
import { Colors } from '../../../utils/colors';
import { findEmojiByKeyword } from '../../../utils/emoji-data';
import {
  daysToHours,
  getMessyDayStepIndex,
  TIDY_CHECK_IN_LEVELS,
  TIDY_MESSY_DAY_STEPS,
  TIDY_WEIGHT_LABELS,
} from '../../../utils/tidiness-utils';
import { TidyChip } from './tidy-chip';

const WEIGHTS: TidyWeight[] = [1, 2, 3];
const DEFAULT_DAYS_INDEX = TIDY_MESSY_DAY_STEPS.indexOf(7);
const DEFAULT_START_LEVEL = 75;

interface SpotDialogProps {
  /** Undefined = a new spot. */
  spotId?: string;
  /** Room picked for a new spot. */
  defaultRoomId?: string;
  onClose: () => void;
}

/** Add or edit a spot: name, room, how fast it gets messy, weight and what cleans it. */
export function SpotDialog({ spotId, defaultRoomId, onClose }: SpotDialogProps) {
  const spot = useTidinessStore(store => store.spots.find(item => item.id === spotId));
  const rooms = useTidinessStore(store => store.rooms);
  const addSpot = useTidinessStore(store => store.addSpot);
  const updateSpot = useTidinessStore(store => store.updateSpot);
  const removeSpot = useTidinessStore(store => store.removeSpot);
  const behaviors = useBehaviorStore(store => store.behaviors);
  const keyboardUp = useKeyboardVisible();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(spot?.name ?? '');
  const [emoji, setEmoji] = useState(spot?.emoji ?? '');
  const [roomId, setRoomId] = useState(spot?.roomId ?? defaultRoomId ?? rooms[0]?.id);
  const [daysIndex, setDaysIndex] = useState(spot ? getMessyDayStepIndex(spot.emptyHours) : DEFAULT_DAYS_INDEX);
  const [weight, setWeight] = useState<TidyWeight>(spot?.weight ?? 2);
  const [behaviorIds, setBehaviorIds] = useState<string[]>(spot?.behaviorIds ?? []);
  const [startLevel, setStartLevel] = useState(DEFAULT_START_LEVEL);
  const [picking, setPicking] = useState(false);
  const trimmed = name.trim();
  const days = TIDY_MESSY_DAY_STEPS[daysIndex];
  // Keep a learned rate unless the slider was moved off it.
  const emptyHours = spot && daysIndex === getMessyDayStepIndex(spot.emptyHours) ? spot.emptyHours : daysToHours(days);
  const linked = behaviorIds
    .map(id => behaviors.find(behavior => behavior.id === id))
    .filter(behavior => behavior != null);

  const save = () => {
    if (!trimmed || !roomId) return;
    const input = {
      roomId,
      name: trimmed,
      emoji: emoji || findEmojiByKeyword(trimmed) || '🧹',
      emptyHours,
      weight,
      behaviorIds,
    };
    if (spot) updateSpot(spot.id, input);
    else addSpot(input, startLevel);
    onClose();
  };

  const remove = () => {
    if (!spot) return;
    Alert.alert(`Delete ${spot.name}?`, 'Its check-ins go too. Logs of its behaviours stay.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeSpot(spot.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          keyboardUp && styles.overlayTop,
          { paddingTop: 24 + (keyboardUp ? insets.top : 0), paddingBottom: 24 + insets.bottom },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, keyboardUp && styles.sheetKeyboard]}>
          <Text style={styles.title}>{spot ? 'Edit spot' : 'New spot'}</Text>
          <View style={styles.inputRow}>
            <EmojiPicker
              value={emoji}
              onChangeText={setEmoji}
              nameHint={name}
              style={styles.emoji}
            />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Sink, Desk, Window sill…"
              placeholderTextColor={Colors.text.faint}
              autoFocus={!spot}
              returnKeyType="done"
            />
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>ROOM</Text>
            <View style={styles.chips}>
              {rooms.map(room => (
                <TidyChip
                  key={room.id}
                  label={`${room.emoji} ${room.name}`}
                  selected={room.id === roomId}
                  onPress={() => setRoomId(room.id)}
                />
              ))}
            </View>
            <StepSlider
              label="Gets messy in"
              value={daysIndex}
              min={0}
              max={TIDY_MESSY_DAY_STEPS.length - 1}
              formatValue={index => {
                const value = TIDY_MESSY_DAY_STEPS[index];
                return `${value} day${value === 1 ? '' : 's'}`;
              }}
              onChange={setDaysIndex}
              color={Colors.type.desirable}
            />
            {spot != null && spot.learnedFrom > 0 && (
              <Text style={styles.hint}>
                Learned from {spot.learnedFrom} check-in{spot.learnedFrom === 1 ? '' : 's'}. Moving the slider replaces
                it.
              </Text>
            )}
            <Text style={styles.label}>COUNTS TOWARD TIDINESS</Text>
            <View style={styles.chips}>
              {WEIGHTS.map(value => (
                <TidyChip
                  key={value}
                  label={TIDY_WEIGHT_LABELS[value]}
                  selected={value === weight}
                  onPress={() => setWeight(value)}
                />
              ))}
            </View>
            <Text style={styles.label}>CLEANED BY</Text>
            <View style={styles.chips}>
              {linked.map(behavior => (
                <TidyChip
                  key={behavior.id}
                  label={`${behavior.name}  ✕`}
                  selected
                  onPress={() => setBehaviorIds(ids => ids.filter(id => id !== behavior.id))}
                />
              ))}
              <TidyChip
                label="＋ Behaviour"
                onPress={() => setPicking(true)}
              />
            </View>
            <Text style={styles.hint}>Logging one of these cleans the spot. The ✓ works without one.</Text>
            {!spot && (
              <>
                <Text style={styles.label}>HOW IS IT NOW?</Text>
                <View style={styles.chips}>
                  {TIDY_CHECK_IN_LEVELS.map(item => (
                    <TidyChip
                      key={item.label}
                      label={`${item.emoji} ${item.label}`}
                      selected={item.level === startLevel}
                      onPress={() => setStartLevel(item.level)}
                    />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
          <View style={styles.actions}>
            {spot && (
              <Button
                variant="danger"
                onPress={remove}
              >
                Delete
              </Button>
            )}
            <View style={styles.spacer} />
            <Button onPress={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!trimmed || !roomId}
              onPress={save}
            >
              Save
            </Button>
          </View>
        </View>
      </View>
      {picking && (
        <FullScreenModal
          title="Cleaned by"
          onClose={() => setPicking(false)}
        >
          <View style={[styles.picker, { paddingBottom: 16 + insets.bottom }]}>
            <CueBehaviorPicker
              selectedIds={behaviorIds}
              onChange={setBehaviorIds}
            />
          </View>
        </FullScreenModal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayTop: { justifyContent: 'flex-start' },
  sheet: { backgroundColor: Colors.bg.card, borderRadius: 16, padding: 16, gap: 12, maxHeight: '90%' },
  sheetKeyboard: { maxHeight: '58%' },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { height: 46, borderRadius: 10 },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 16,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: 8 },
  label: { color: Colors.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 6 },
  hint: { color: Colors.text.faint, fontSize: 12, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spacer: { flex: 1 },
  picker: { flex: 1, padding: 16 },
});
