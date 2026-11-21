import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LaunchableApp } from '../../../../modules/app-usage';
import { AppIcon } from '../../../components/app-icon';
import { AppPickerModal } from '../../../components/app-picker-modal';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import type { BehaviorEntry } from '../../../types/behavior';
import type { SavedPlace } from '../../../types/cue';
import type { TaskEntry, TaskStarValue } from '../../../types/task';
import { findAutoTrackedBehavior } from '../../../utils/app-usage-utils';
import { Colors } from '../../../utils/colors';
import { getPlaceEmoji } from '../../../utils/cue-utils';
import { DEFAULT_PLACE_DWELL_MIN, formatPlaceDwell, getPlaceDwellMin } from '../../../utils/place-task-utils';
import { getCommonValue, getTimedState, nextTimedValue, type TaskBatchEdits } from '../../../utils/task-batch-utils';
import { StarPicker } from './star-picker';
import { AttachRow } from './task-attach-row';
import { TaskBehaviorPicker } from './task-behavior-picker';
import { TaskPlaceScreen } from './task-place-screen';

interface TaskBatchEditDialogProps {
  tasks: TaskEntry[];
  behaviors: BehaviorEntry[];
  places: SavedPlace[];
  onApply: (taskIds: string[], edits: TaskBatchEdits) => void;
  onCancel: () => void;
}

type Picker = 'behavior' | 'app' | 'place';

/** Edit several selected tasks at once. A field left on "Keep" is not changed; Mixed means the tasks differ. */
export function TaskBatchEditDialog({ tasks, behaviors, places, onApply, onCancel }: TaskBatchEditDialogProps) {
  const insets = useSafeAreaInsets();
  const allBehaviors = useBehaviorStore(s => s.behaviors);
  const [removed, setRemoved] = useState<string[]>([]);
  const [edits, setEdits] = useState<TaskBatchEdits>({});
  const [picker, setPicker] = useState<Picker>();
  const [dwellMin, setDwellMin] = useState(DEFAULT_PLACE_DWELL_MIN);

  const batch = useMemo(() => tasks.filter(task => !removed.includes(task.id)), [tasks, removed]);
  const count = batch.length;
  const behaviorById = useMemo(() => new Map(allBehaviors.map(b => [b.id, b])), [allBehaviors]);
  const placeById = useMemo(() => new Map(places.map(place => [place.id, place])), [places]);

  const commonBehavior = getCommonValue(batch.map(task => task.behaviorId));
  const commonApp = getCommonValue(batch.map(task => task.appPackage));
  const commonPlace = getCommonValue(batch.map(task => task.placeId));
  const timedState = getTimedState(batch);
  const timedNow = edits.timed ?? (timedState === 'on' ? true : timedState === 'off' ? false : undefined);

  const removeTask = (id: string) => {
    if (batch.length <= 1) return onCancel();
    setRemoved(list => [...list, id]);
  };

  // Behavior row.
  const behaviorTouched = edits.behavior != null;
  const shownBehavior = behaviorTouched
    ? edits.behavior?.id
      ? behaviorById.get(edits.behavior.id)
      : undefined
    : commonBehavior.kind === 'same'
      ? behaviorById.get(commonBehavior.value)
      : undefined;
  const behaviorValue = shownBehavior
    ? shownBehavior.name
    : behaviorTouched
      ? 'None'
      : commonBehavior.kind === 'mixed'
        ? 'Mixed'
        : 'Keep';

  // App row.
  const appTouched = edits.app != null || edits.clearApp === true;
  const shownApp = edits.app?.label ?? (!appTouched && commonApp.kind === 'same' ? batch[0]?.appLabel : undefined);
  const appValue = shownApp ?? (appTouched ? 'None' : commonApp.kind === 'mixed' ? 'Mixed' : 'Keep');
  const appIsNew = edits.app != null && !findAutoTrackedBehavior(allBehaviors, { packageName: edits.app.packageName });

  // Place row.
  const placeTouched = edits.place != null;
  const shownPlace = placeTouched
    ? edits.place?.id
      ? placeById.get(edits.place.id)
      : undefined
    : commonPlace.kind === 'same'
      ? placeById.get(commonPlace.value)
      : undefined;
  const placeValue = shownPlace
    ? edits.place && edits.place.dwellMin > 0
      ? `${shownPlace.name} · ${formatPlaceDwell(edits.place.dwellMin)}`
      : shownPlace.name
    : placeTouched
      ? 'None'
      : commonPlace.kind === 'mixed'
        ? 'Mixed'
        : 'Keep';

  const allBadge = `All ${count}`;
  const changed = Object.keys(edits).length > 0;

  const pickBehavior = (id: string | undefined) => {
    const behavior = id ? behaviorById.get(id) : undefined;
    setEdits(prev => {
      const next: TaskBatchEdits = { ...prev, behavior: { id, name: behavior?.name } };
      // A behavior that tracks an app brings that app along and turns on Track duration.
      if (behavior?.autoTrackApp) {
        next.app = { packageName: behavior.autoTrackApp.packageName, label: behavior.autoTrackApp.label };
        next.clearApp = undefined;
        next.timed = true;
      }
      return next;
    });
  };
  const pickApp = (app: LaunchableApp) =>
    setEdits(prev => ({
      ...prev,
      app: { packageName: app.packageName, label: app.label },
      clearApp: undefined,
      timed: true,
    }));
  const clearApp = () => setEdits(prev => ({ ...prev, app: undefined, clearApp: true }));
  const pickPlace = (id: string | undefined) => setEdits(prev => ({ ...prev, place: { id, dwellMin } }));
  const changeDwell = (minutes: number) => {
    setDwellMin(minutes);
    setEdits(prev => (prev.place ? { ...prev, place: { ...prev.place, dwellMin: minutes } } : prev));
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, { paddingTop: 16 + insets.top, paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessible={false}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.heading}>{`Edit ${count} ${count === 1 ? 'task' : 'tasks'}`}</Text>
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
          <Text style={styles.note}>Changes apply to all of these</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {batch.map(task => (
              <View
                key={task.id}
                style={styles.chip}
              >
                <Text
                  style={styles.chipText}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
                <Pressable
                  onPress={() => removeTask(task.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${task.title}`}
                >
                  <Ionicons
                    name="close"
                    size={15}
                    color={Colors.text.muted}
                  />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          <View style={styles.rows}>
            <AttachRow
              icon={
                shownBehavior ? (
                  <BehaviorIcon
                    behavior={shownBehavior}
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
              value={behaviorValue}
              dim={!shownBehavior}
              emphasis={behaviorValue === 'Mixed'}
              badge={behaviorTouched ? allBadge : undefined}
              onPress={() => setPicker('behavior')}
              onClear={shownBehavior ? () => setEdits(prev => ({ ...prev, behavior: { id: undefined } })) : undefined}
            />
            <AttachRow
              icon={
                <Ionicons
                  name="phone-portrait-outline"
                  size={18}
                  color={Colors.text.muted}
                />
              }
              label="App"
              value={appValue}
              dim={!shownApp}
              emphasis={appValue === 'Mixed'}
              badge={appIsNew ? 'New' : appTouched ? allBadge : undefined}
              onPress={() => setPicker('app')}
              onClear={shownApp ? clearApp : undefined}
            />
            <AttachRow
              icon={
                shownPlace ? (
                  <AppIcon
                    value={getPlaceEmoji(shownPlace)}
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
              value={placeValue}
              dim={!shownPlace}
              emphasis={placeValue === 'Mixed'}
              badge={placeTouched ? allBadge : undefined}
              onPress={() => {
                if (!placeTouched && commonPlace.kind === 'same') setDwellMin(getPlaceDwellMin(batch[0]));
                setPicker('place');
              }}
              onClear={shownPlace ? () => pickPlace(undefined) : undefined}
              last
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.checkRow, pressed && styles.pressed]}
            onPress={() =>
              setEdits(prev => ({
                ...prev,
                timed: nextTimedValue(timedNow == null ? 'mixed' : timedNow ? 'on' : 'off'),
              }))
            }
            accessibilityRole="checkbox"
            accessibilityState={{ checked: timedNow === undefined ? 'mixed' : timedNow }}
          >
            <View style={[styles.box, timedNow === true && styles.boxOn, timedNow === undefined && styles.boxMixed]}>
              {timedNow === true && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={Colors.bg.black}
                />
              )}
              {timedNow === undefined && (
                <Ionicons
                  name="remove"
                  size={16}
                  color="#F9A825"
                />
              )}
            </View>
            <View style={styles.checkTexts}>
              <Text
                style={styles.checkLabel}
                numberOfLines={1}
              >
                Track duration
              </Text>
              <Text style={styles.checkHint}>
                {timedNow === undefined
                  ? 'Mixed. Tap to turn on for all, tap again to turn off.'
                  : timedNow
                    ? `On for all ${count}. Tasks with no behavior or app can't be timed.`
                    : `Off for all ${count}.`}
              </Text>
            </View>
          </Pressable>

          <View style={styles.footer}>
            {edits.stars != null ? (
              <StarPicker
                value={edits.stars}
                onChange={(stars: TaskStarValue) => setEdits(prev => ({ ...prev, stars }))}
              />
            ) : (
              <Pressable
                style={styles.keepStars}
                onPress={() => setEdits(prev => ({ ...prev, stars: 1 }))}
                accessibilityRole="button"
                accessibilityLabel="Change stars for all"
              >
                <Ionicons
                  name="star-outline"
                  size={15}
                  color={Colors.text.faint}
                />
                <Text
                  style={styles.keepStarsText}
                  numberOfLines={1}
                >
                  Keep
                </Text>
              </Pressable>
            )}
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
              disabled={!changed}
              onPress={() =>
                onApply(
                  batch.map(task => task.id),
                  edits,
                )
              }
              style={styles.applyButton}
            >
              {`Apply to ${count}`}
            </Button>
          </View>
        </View>
      </View>

      {picker === 'behavior' && (
        <TaskBehaviorPicker
          behaviors={behaviors}
          selectedBehaviorId={shownBehavior?.id}
          onClose={() => setPicker(undefined)}
          onPick={id => {
            pickBehavior(id);
            setPicker(undefined);
          }}
        />
      )}
      <AppPickerModal
        visible={picker === 'app'}
        markNew
        onClose={() => setPicker(undefined)}
        onPick={picked => {
          pickApp(picked);
          setPicker(undefined);
        }}
      />
      {picker === 'place' && (
        <TaskPlaceScreen
          places={places}
          selectedPlaceId={shownPlace?.id}
          onSelect={pickPlace}
          dwellMin={dwellMin}
          onDwellChange={changeDwell}
          onClose={() => setPicker(undefined)}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: { backgroundColor: Colors.bg.card, borderRadius: 18, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  note: { color: Colors.text.muted, fontSize: 12, marginBottom: -6 },
  chips: { gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    maxWidth: 220,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 16,
    backgroundColor: Colors.bg.input,
  },
  chipText: { flexShrink: 1, color: Colors.text.primary, fontSize: 13 },
  rows: { backgroundColor: Colors.bg.input, borderRadius: 12, overflow: 'hidden' },
  placeEmoji: { fontSize: 17 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 2 },
  box: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: Colors.type.desirable, borderColor: Colors.type.desirable },
  boxMixed: { borderColor: '#F9A825' },
  checkTexts: { flex: 1, gap: 2 },
  checkLabel: { color: Colors.text.primary, fontSize: 15 },
  checkHint: { color: Colors.text.muted, fontSize: 12, lineHeight: 17 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  keepStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.bg.input,
  },
  keepStarsText: { color: Colors.text.faint, fontSize: 13 },
  spacer: { flex: 1 },
  footerButton: { minWidth: 72 },
  applyButton: { minWidth: 110 },
  pressed: { opacity: 0.7 },
});
