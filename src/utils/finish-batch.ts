import { Alert } from 'react-native';
import { useBehaviorStore } from '../store/behavior-store';
import type { BehaviorEntry } from '../types/behavior';
import { getBatchStatus } from './meal-batch-utils';

/** Asks to finish a cooked batch: stamps `finishedAt` and archives the behaviour. Logs, XP and its macros stay. */
export function confirmFinishBatch(behavior: BehaviorEntry): void {
  const { categories, updateBehavior, archiveBehavior } = useBehaviorStore.getState();
  const status = getBatchStatus(behavior, categories);
  if (!behavior.batch || !status) return;
  const unit = status.unit ? ` ${status.unit}` : '';
  const left = status.left > 0 ? ` ${status.left}${unit} left over is not counted.` : '';
  Alert.alert(
    'Finish batch?',
    `${status.portions} ${status.portions === 1 ? 'portion' : 'portions'} · ${status.eaten}${unit} eaten.${left} It moves to Archived; you can unarchive it.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        onPress: () => {
          updateBehavior(behavior.id, { batch: { ...behavior.batch!, finishedAt: Date.now() } });
          archiveBehavior(behavior.id);
        },
      },
    ],
  );
}
