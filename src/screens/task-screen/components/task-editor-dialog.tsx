import { Ionicons } from '@expo/vector-icons';
import React, { type ReactNode, useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppUsage, type LaunchableApp } from '../../../../modules/app-usage';
import { AppIcon } from '../../../components/app-icon';
import { AppPickerModal } from '../../../components/app-picker-modal';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Button } from '../../../components/button';
import { CheckboxRow } from '../../../components/checkbox-row';
import { IconPickerSheet } from '../../../components/icon-picker/icon-picker-sheet';
import { Text, TextInput } from '../../../components/text';
import { useKeyboardVisible } from '../../../hooks/use-keyboard-visible';
import { useBehaviorStore } from '../../../store/behavior-store';
import type { BehaviorEntry } from '../../../types/behavior';
import type { SavedPlace } from '../../../types/cue';
import type { OneOffPlace, TaskStarValue } from '../../../types/task';
import { findAutoTrackedBehavior } from '../../../utils/app-usage-utils';
import { Colors } from '../../../utils/colors';
import { getPlaceEmoji } from '../../../utils/cue-utils';
import { formatPlaceDwell } from '../../../utils/place-task-utils';
import { formatTaskTime } from '../../../utils/task-time-utils';
import { StarPicker } from './star-picker';
import { AttachRow } from './task-attach-row';
import { TaskBehaviorPicker } from './task-behavior-picker';
import { TaskOneOffPlaceScreen } from './task-one-off-place-screen';
import { TaskPlaceScreen } from './task-place-screen';

interface TaskEditorDialogProps {
  editing: boolean;
  /** Total time spent on the task so far (editing only). */
  timeSpentMs?: number;
  title: string;
  onTitleChange: (title: string) => void;
  stars: TaskStarValue;
  onStarsChange: (stars: TaskStarValue) => void;
  behaviors: BehaviorEntry[];
  selectedBehavior: BehaviorEntry | undefined;
  onBehaviorSelect: (behaviorId: string | undefined) => void;
  app: LaunchableApp | undefined;
  onAppChange: (app: LaunchableApp | undefined) => void;
  places: SavedPlace[];
  selectedPlace: SavedPlace | undefined;
  onPlaceSelect: (placeId: string | undefined) => void;
  oneOffPlace: OneOffPlace | undefined;
  onOneOffPlaceChange: (place: OneOffPlace | undefined) => void;
  placeDwellMin: number;
  onPlaceDwellChange: (minutes: number) => void;
  timed: boolean;
  onTimedChange: (timed: boolean) => void;
  icon: string;
  onIconChange: (icon: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

type Picker = 'behavior' | 'app' | 'place' | 'oneOffPlace' | 'icon';

/** Add / edit a task in a dialog over the Tasks screen. Centred; docks to the top only while the keyboard is up. */
export function TaskEditorDialog({
  editing,
  timeSpentMs,
  title,
  onTitleChange,
  stars,
  onStarsChange,
  behaviors,
  selectedBehavior,
  onBehaviorSelect,
  app,
  onAppChange,
  places,
  selectedPlace,
  onPlaceSelect,
  oneOffPlace,
  onOneOffPlaceChange,
  placeDwellMin,
  onPlaceDwellChange,
  timed,
  onTimedChange,
  icon,
  onIconChange,
  onSubmit,
  onCancel,
}: TaskEditorDialogProps) {
  const keyboardUp = useKeyboardVisible();
  const insets = useSafeAreaInsets();
  const allBehaviors = useBehaviorStore(s => s.behaviors);
  const [picker, setPicker] = useState<Picker>();
  const canSubmit = title.trim().length > 0 || selectedBehavior != null || app != null;
  const canTime = selectedBehavior != null || app != null;
  const appIsNew = app != null && !findAutoTrackedBehavior(allBehaviors, { packageName: app.packageName });
  const timedTarget = app?.label ?? selectedBehavior?.name;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View
        style={[
          styles.overlay,
          keyboardUp && styles.overlayTop,
          { paddingTop: 16 + (keyboardUp ? insets.top : 0), paddingBottom: 16 + insets.bottom },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={Keyboard.dismiss}
          accessible={false}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.heading}>{editing ? 'Edit task' : 'New task'}</Text>
            <Pressable
              onPress={onCancel}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons
                name="close"
                size={22}
                color={Colors.text.muted}
              />
            </Pressable>
          </View>
          {editing && timeSpentMs != null && formatTaskTime(timeSpentMs) && (
            <Text
              style={styles.timeSpent}
              numberOfLines={1}
            >
              {`Time spent: ${formatTaskTime(timeSpentMs)}`}
            </Text>
          )}
          <TextInput
            style={styles.titleInput}
            placeholder="Task name"
            placeholderTextColor={Colors.text.faint}
            value={title}
            onChangeText={onTitleChange}
            returnKeyType="done"
            autoFocus={!editing}
          />

          <View style={styles.rows}>
            <AttachRow
              icon={
                icon ? (
                  <AppIcon
                    value={icon}
                    size={18}
                  />
                ) : (
                  <Ionicons
                    name="happy-outline"
                    size={18}
                    color={Colors.text.muted}
                  />
                )
              }
              label="Icon"
              value={icon ? 'Custom' : undefined}
              onPress={() => setPicker('icon')}
              onClear={icon ? () => onIconChange('') : undefined}
            />
            <AttachRow
              icon={
                selectedBehavior ? (
                  <BehaviorIcon
                    behavior={selectedBehavior}
                    size={20}
                  />
                ) : (
                  <Ionicons
                    name="extension-puzzle-outline"
                    size={18}
                    color={Colors.text.muted}
                  />
                )
              }
              label="Behavior"
              value={selectedBehavior?.name}
              onPress={() => setPicker('behavior')}
              onClear={selectedBehavior ? () => onBehaviorSelect(undefined) : undefined}
            />
            {AppUsage != null && (
              <AttachRow
                icon={
                  <Ionicons
                    name="phone-portrait-outline"
                    size={18}
                    color={Colors.text.muted}
                  />
                }
                label="App"
                value={app?.label}
                badge={appIsNew ? 'New' : undefined}
                onPress={() => setPicker('app')}
                onClear={app ? () => onAppChange(undefined) : undefined}
              />
            )}
            <AttachRow
              icon={
                selectedPlace || oneOffPlace ? (
                  <AppIcon
                    value={selectedPlace ? getPlaceEmoji(selectedPlace) : '📍'}
                    style={styles.placeEmoji}
                  />
                ) : (
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={Colors.text.muted}
                  />
                )
              }
              label="Place"
              value={
                selectedPlace || oneOffPlace
                  ? placeDwellMin > 0
                    ? `${(selectedPlace ?? oneOffPlace)?.name} · ${formatPlaceDwell(placeDwellMin)}`
                    : (selectedPlace ?? oneOffPlace)?.name
                  : undefined
              }
              onPress={() => setPicker('place')}
              onClear={selectedPlace || oneOffPlace ? () => onPlaceSelect(undefined) : undefined}
              last
            />
          </View>

          <CheckboxRow
            variant="row"
            label="Track duration"
            hint={
              !canTime
                ? 'Pick a behavior or an app to time this task.'
                : timed
                  ? `Adds a ▶ timer button${app ? ` that opens ${app.label}` : ''}. Ticking the task while it runs logs the time to ${timedTarget}.`
                  : 'Adds a ▶ timer button to the task.'
            }
            checked={timed && canTime}
            disabled={!canTime}
            onToggle={() => onTimedChange(!timed)}
          />

          <View style={styles.footer}>
            <StarPicker
              value={stars}
              onChange={onStarsChange}
            />
            <View style={styles.spacer} />
            <Button
              variant="ghost"
              size="sm"
              onPress={onCancel}
              style={styles.footerButton}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onPress={onSubmit}
              disabled={!canSubmit}
              style={styles.footerButton}
            >
              {editing ? 'Save' : 'Add'}
            </Button>
          </View>
        </View>
      </View>

      {picker === 'behavior' && (
        <TaskBehaviorPicker
          behaviors={behaviors}
          selectedBehaviorId={selectedBehavior?.id}
          onClose={() => setPicker(undefined)}
          onPick={behaviorId => {
            onBehaviorSelect(behaviorId);
            // A behavior that tracks an app brings that app along, and the task gets timed.
            const picked = behaviorId ? behaviors.find(b => b.id === behaviorId) : undefined;
            if (picked?.autoTrackApp) {
              onAppChange({ packageName: picked.autoTrackApp.packageName, label: picked.autoTrackApp.label });
              onTimedChange(true);
            }
            setPicker(undefined);
          }}
        />
      )}
      <AppPickerModal
        visible={picker === 'app'}
        markNew
        onClose={() => setPicker(undefined)}
        onPick={picked => {
          onAppChange(picked);
          onTimedChange(true);
          setPicker(undefined);
        }}
      />
      {picker === 'icon' && (
        <IconPickerSheet
          value={icon}
          nameHint={title || selectedBehavior?.name}
          onChange={onIconChange}
          onClose={() => setPicker(undefined)}
        />
      )}
      {picker === 'oneOffPlace' && (
        <TaskOneOffPlaceScreen
          value={oneOffPlace}
          onSave={place => {
            onOneOffPlaceChange(place);
            setPicker('place');
          }}
          onClose={() => setPicker('place')}
        />
      )}
      {picker === 'place' && (
        <TaskPlaceScreen
          places={places}
          selectedPlaceId={selectedPlace?.id}
          onSelect={onPlaceSelect}
          oneOffPlace={oneOffPlace}
          onPickOneOff={() => setPicker('oneOffPlace')}
          dwellMin={placeDwellMin}
          onDwellChange={onPlaceDwellChange}
          onClose={() => setPicker(undefined)}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.65)' },
  overlayTop: { justifyContent: 'flex-start' },
  sheet: { backgroundColor: Colors.bg.card, borderRadius: 18, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  timeSpent: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  titleInput: {
    height: 46,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 15,
  },
  rows: { backgroundColor: Colors.bg.input, borderRadius: 12, overflow: 'hidden' },
  placeEmoji: { fontSize: 17 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spacer: { flex: 1 },
  footerButton: { minWidth: 80 },
});
