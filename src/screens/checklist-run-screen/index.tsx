import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../components/back-button';
import { Button } from '../../components/button';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Text } from '../../components/text';
import { useChecklistRun } from '../../hooks/use-checklist-run';
import { useBehaviorStore } from '../../store/behavior-store';
import type { ChecklistItem } from '../../types/checklist';
import type { RootStackParamList } from '../../types/navigation';
import { CHECKLIST_DEFAULT_EMOJI } from '../../utils/checklist-utils';
import { Colors } from '../../utils/colors';
import { ChecklistRunRow } from './components/checklist-run-row';

type ChecklistRunRoute = NativeStackScreenProps<RootStackParamList, 'ChecklistRun'>['route'];

const UNDO_MS = 4000;

export function ChecklistRunScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const route = useRoute<ChecklistRunRoute>();
  const { checklistId } = route.params;
  const behaviors = useBehaviorStore(state => state.behaviors);
  const { checklist, items, run, progress, done, toggleItem, toggleSkip, tickAllLeft, finish } =
    useChecklistRun(checklistId);
  const [undoItem, setUndoItem] = useState<ChecklistItem | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!checklist) navigation.goBack();
  }, [checklist, navigation]);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  if (!checklist) return null;

  const showUndo = (item: ChecklistItem) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoItem(item);
    undoTimer.current = setTimeout(() => setUndoItem(null), UNDO_MS);
  };

  const handleToggle = (item: ChecklistItem) => {
    const wasTicked = run?.ticks[item.id] != null;
    toggleItem(item);
    if (!wasTicked && item.kind === 'behavior') showUndo(item);
    else setUndoItem(null);
  };

  const handleUndo = () => {
    if (!undoItem) return;
    if (run?.ticks[undoItem.id]) toggleItem(undoItem);
    setUndoItem(null);
  };

  const handleRowPress = (item: ChecklistItem) => {
    const tick = run?.ticks[item.id];
    if (item.kind === 'plain') {
      if (!tick?.skipped) toggleItem(item);
      return;
    }
    if (tick?.logId) {
      navigation.navigate('BehaviorLog', { behaviorId: tick.behaviorId ?? item.behaviorId, logId: tick.logId });
      return;
    }
    if (tick) return;
    navigation.navigate('BehaviorLog', {
      behaviorId: item.behaviorId,
      initialMode: 'log',
      checklistItem: { checklistId, itemId: item.id },
    });
  };

  const fraction = done ? 1 : progress.total > 0 ? (progress.done + progress.skipped) / progress.total : 0;
  const undoBehavior =
    undoItem?.kind === 'behavior' ? behaviors.find(candidate => candidate.id === undoItem.behaviorId) : undefined;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <BackButton />
        <ScreenTitle
          style={styles.title}
        >{`${checklist.emoji || CHECKLIST_DEFAULT_EMOJI} ${checklist.name}`}</ScreenTitle>
        <Button
          variant="icon"
          onPress={() => navigation.navigate('ChecklistForm', { checklistId })}
          accessibilityLabel="Edit checklist"
        >
          <Ionicons
            name="create-outline"
            size={22}
            color={Colors.text.muted}
          />
        </Button>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]} />
        </View>
        <Text style={[styles.progressText, done && styles.doneText]}>
          {done ? 'Done today' : `${progress.done + progress.skipped} of ${progress.total}`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {items.map(item => {
          const behavior =
            item.kind === 'behavior' ? behaviors.find(candidate => candidate.id === item.behaviorId) : undefined;
          return (
            <ChecklistRunRow
              key={item.id}
              label={item.kind === 'plain' ? item.label : (behavior?.name ?? '')}
              behavior={behavior}
              tick={run?.ticks[item.id]}
              onToggle={() => handleToggle(item)}
              onPress={() => handleRowPress(item)}
              onLongPress={() => toggleSkip(item)}
            />
          );
        })}
        {items.length === 0 && <Text style={styles.empty}>Nothing to do here. Edit the checklist to add items.</Text>}
        <Text style={styles.hint}>Long-press an item to skip it. Ticks reset tomorrow.</Text>
      </ScrollView>

      {undoItem && (
        <View style={styles.toast}>
          <Text
            style={styles.toastText}
            numberOfLines={1}
          >
            {`Logged ${undoBehavior?.name ?? ''}`}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={handleUndo}
          >
            Undo
          </Button>
        </View>
      )}

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        {done ? (
          <Button
            variant="primary"
            style={styles.footerButton}
            onPress={() => navigation.goBack()}
          >
            Back to Routines
          </Button>
        ) : (
          <>
            <Button
              style={styles.footerButton}
              onPress={tickAllLeft}
              disabled={items.length === 0}
            >
              Tick all left
            </Button>
            <Button
              variant="primary"
              style={styles.footerButton}
              onPress={() => {
                finish();
                navigation.goBack();
              }}
            >
              Finish
            </Button>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 10 },
  title: { flex: 1, fontSize: 24 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 14 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.bg.elevated, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: Colors.type.desirable },
  progressText: { color: Colors.text.light, fontSize: 13, fontWeight: '600' },
  doneText: { color: Colors.type.desirable },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { color: Colors.text.faint, textAlign: 'center', padding: 24 },
  hint: { color: Colors.text.dim, fontSize: 12, textAlign: 'center', marginTop: 8 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.bg.elevated,
  },
  toastText: { flex: 1, color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  footerButton: { flex: 1 },
});
