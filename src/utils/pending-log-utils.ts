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
  logBehavior(pending.behaviorId, now, metadata, undefined, pending.cues);
  usePendingLogsStore.getState().removePending(pending.id);
  return true;
}
