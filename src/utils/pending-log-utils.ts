import { v4 as uuidv4 } from 'uuid';
import { useBehaviorStore } from '../store/behavior-store';
import { type PendingLog, usePendingLogsStore } from '../store/pending-logs-store';
import { buildLogMetadata, getBehaviorAmountField, getBehaviorMetadataFields } from './metadata-calculation-utils';

/** Log a pending log right now with its saved details (timestamp = now) and drop it from the pending list. */
export function completePendingLog(pending: PendingLog, now = Date.now()): boolean {
  const { behaviors, categories, logBehavior } = useBehaviorStore.getState();
  const behavior = behaviors.find(b => b.id === pending.behaviorId);
  if (!behavior) return false;
  const fields = getBehaviorMetadataFields(behavior, categories);
  const metadata = buildLogMetadata({
    fields,
    amountField: getBehaviorAmountField(behavior, fields),
    values: pending.metadataValues,
    defaultMetadata: behavior.defaultMetadata,
    rateBasis: behavior.metadataRateBasis,
    notes: pending.notes,
  });
  const stacked = (pending.stacked ?? []).filter(item => behaviors.some(b => b.id === item.behaviorId));
  const stackId = stacked.length > 0 ? uuidv4() : undefined;
  logBehavior(pending.behaviorId, now, metadata, undefined, pending.cues, stackId);
  for (const item of stacked) {
    const stackedBehavior = behaviors.find(b => b.id === item.behaviorId);
    if (!stackedBehavior) continue;
    const stackedFields = getBehaviorMetadataFields(stackedBehavior, categories);
    const stackedMetadata = buildLogMetadata({
      fields: stackedFields,
      amountField: getBehaviorAmountField(stackedBehavior, stackedFields),
      values: item.metadataValues,
      defaultMetadata: stackedBehavior.defaultMetadata,
      rateBasis: stackedBehavior.metadataRateBasis,
      notes: pending.notes,
    });
    logBehavior(item.behaviorId, now, stackedMetadata, undefined, pending.cues, stackId);
  }
  usePendingLogsStore.getState().removePending(pending.id);
  return true;
}
