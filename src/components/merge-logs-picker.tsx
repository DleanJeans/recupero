import React from 'react';
import { Alert } from 'react-native';
import { StackBehaviorPickerModal } from '../screens/behavior-screen/components/stack-behavior-picker-modal';
import { useBehaviorStore } from '../store/behavior-store';
import type { BehaviorEntry } from '../types/behavior';
import { prepareMovedLogs } from '../utils/merge-logs-utils';

interface MergeLogsPickerProps {
  behavior: BehaviorEntry;
  /** Called when the picker closes, whether a merge happened or not. */
  onClose: () => void;
}

/** Picks the behaviour to move all of `behavior`'s logs into, then asks to confirm. */
export function MergeLogsPicker({ behavior, onClose }: MergeLogsPickerProps) {
  const mergeBehaviorLogs = useBehaviorStore(state => state.mergeBehaviorLogs);
  const archiveBehavior = useBehaviorStore(state => state.archiveBehavior);
  const removeBehavior = useBehaviorStore(state => state.removeBehavior);

  /** Logs are already moved; ask what happens to the now empty source behaviour. */
  const askAboutSource = (targetName: string) => {
    Alert.alert('Moved', `Its logs are now in "${targetName}". What about "${behavior.name}"?`, [
      { text: 'Keep it', onPress: onClose },
      {
        text: 'Archive',
        onPress: () => {
          archiveBehavior(behavior.id);
          onClose();
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeBehavior(behavior.id);
          onClose();
        },
      },
    ]);
  };

  const handlePick = (targetId: string) => {
    const { behaviors, categories } = useBehaviorStore.getState();
    const target = behaviors.find(b => b.id === targetId);
    if (!target) return;
    const count = behavior.logs.length;
    const { droppedCount } = prepareMovedLogs(
      behavior.logs,
      categories.find(c => c.id === behavior.categoryId),
      categories.find(c => c.id === target.categoryId),
    );
    const logsText = `${count} ${count === 1 ? 'log' : 'logs'}`;
    const warning =
      droppedCount > 0
        ? ` ${droppedCount} of them have values "${target.name}" has no field for (matched by name), and those values are dropped.`
        : '';
    Alert.alert(
      'Move logs',
      `Move ${logsText} from "${behavior.name}" into "${target.name}"?${warning} XP and needs follow the logs.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: onClose },
        {
          text: 'Move logs',
          onPress: () => {
            mergeBehaviorLogs(behavior.id, targetId, false);
            askAboutSource(target.name);
          },
        },
      ],
    );
  };

  return (
    <StackBehaviorPickerModal
      visible
      excludeIds={[behavior.id]}
      onClose={onClose}
      onPick={handlePick}
    />
  );
}
