import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import { type MoneyRewardPreview, REWARD_ANIMATION_MS } from '../../../components/log-reward-preview';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorEntry, LogEntry, MetadataField } from '../../../types/behavior';
import { toDateString } from '../../../utils/date-utils';
import { getDayMaxTimestamp, getDefaultTimedLogStartTimestamp, getLogFormTimestamp } from '../../../utils/log-utils';
import {
  buildCalculatedMetadata,
  type DailyGoalProgress,
  formatMetadataFieldLabel,
  getCalculatedMetadataFields,
  getDailyGoalProgress,
  getManualMetadataFields,
  getSelectedAmountMetadataField,
  parseDecimalInput,
} from '../../../utils/metadata-calculation-utils';
import { getMoneyRewardForLog, getStarMoneyMultiplierForLog } from '../../../utils/money-utils';
import { formatDuration, MS_PER_MINUTE } from '../../../utils/time-utils';
import { XP_PER_LOG } from '../../../utils/xp-utils';
import { TimePicker } from './time-picker';

export interface BehaviorLogFormProps {
  behaviorId: string;
  behavior: BehaviorEntry;
  editLogId?: string;
  timerStartTimestamp?: number;
  timerEndTimestamp?: number;
  onSaved: () => void;
}

export function useBehaviorLogForm({
  behaviorId,
  behavior,
  editLogId,
  timerStartTimestamp,
  timerEndTimestamp,
  onSaved,
}: BehaviorLogFormProps) {
  const existingLog = useMemo(
    () => (editLogId ? behavior.logs.find(log => log.id === editLogId) : undefined),
    [behavior.logs, editLogId],
  );
  const hasTimerRange = timerStartTimestamp != null && timerEndTimestamp != null;
  const category = useBehaviorStore(
    useCallback(
      state => (behavior.categoryId ? state.categories.find(c => c.id === behavior.categoryId) : undefined),
      [behavior.categoryId],
    ),
  );
  const allBehaviors = useBehaviorStore(state => state.behaviors);
  const categoryBehaviors = useMemo(
    () => (behavior.categoryId ? allBehaviors.filter(b => b.categoryId === behavior.categoryId) : undefined),
    [allBehaviors, behavior.categoryId],
  );
  const logBehavior = useBehaviorStore(state => state.logBehavior);
  const updateLog = useBehaviorStore(state => state.updateLog);
  const removeLog = useBehaviorStore(state => state.removeLog);
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);

  const nowRef = useRef(new Date());
  const todayStr = toDateString(nowRef.current, dayCutoffHour);

  const initialDate = existingLog
    ? toDateString(new Date(existingLog.timestamp), dayCutoffHour)
    : timerStartTimestamp != null
      ? toDateString(new Date(timerStartTimestamp), dayCutoffHour)
      : todayStr;
  const initialEndTimestamp = useMemo(() => {
    if (existingLog?.endTimestamp != null) return existingLog.endTimestamp;
    if (existingLog) return existingLog.timestamp;
    if (timerEndTimestamp != null) return timerEndTimestamp;
    return nowRef.current.getTime();
  }, [existingLog, timerEndTimestamp]);
  const initialStartTimestamp =
    existingLog?.timestamp ??
    timerStartTimestamp ??
    getDefaultTimedLogStartTimestamp(new Date(initialEndTimestamp), dayCutoffHour);
  const initialStartMinutes =
    new Date(initialStartTimestamp).getHours() * 60 + new Date(initialStartTimestamp).getMinutes();
  const initialEndMinutes = new Date(initialEndTimestamp).getHours() * 60 + new Date(initialEndTimestamp).getMinutes();

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [startMinutes, setStartMinutes] = useState(initialStartMinutes);
  const [endMinutes, setEndMinutes] = useState(Math.max(initialStartMinutes, initialEndMinutes));
  const showTimeRange =
    hasTimerRange || existingLog?.endTimestamp != null || (!existingLog && behavior.durationXpEnabled === true);
  const notesRef = useRef<import('react-native').TextInput>(null);
  const [notes, setNotes] = useState(String(existingLog?.metadata?.notes ?? ''));
  const [timePickerCollapsed, setTimePickerCollapsed] = useState(true);

  const metadataFields = useMemo(() => category?.metadataFields ?? [], [category?.metadataFields]);
  const amountField = useMemo(
    () =>
      getSelectedAmountMetadataField(metadataFields, behavior.metadataAmountFieldKey, behavior.metadataQuantityUnit),
    [behavior.metadataAmountFieldKey, behavior.metadataQuantityUnit, metadataFields],
  );
  const manualMetadataFields = useMemo(() => getManualMetadataFields(metadataFields), [metadataFields]);
  const calculatedMetadataFields = useMemo(() => getCalculatedMetadataFields(metadataFields), [metadataFields]);
  const [metadataValues, setMetadataValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    if (existingLog?.metadata) {
      for (const field of metadataFields) {
        const value = existingLog.metadata[field.key];
        if (value != null) values[field.key] = String(value);
      }
    } else if (behavior.defaultMetadata) {
      for (const field of manualMetadataFields) {
        const value = behavior.defaultMetadata[field.key];
        if (value != null) values[field.key] = String(value);
      }
    }
    return values;
  });
  const calculatedMetadataValues = useMemo(() => {
    if (!amountField) return {};
    const amountValue = metadataValues[amountField.key];
    if (amountValue === undefined || amountValue === '') return {};
    return buildCalculatedMetadata(metadataFields, behavior.defaultMetadata, parseDecimalInput(amountValue));
  }, [amountField, behavior.defaultMetadata, metadataFields, metadataValues]);

  const progressByField = useMemo<Record<string, DailyGoalProgress | null>>(() => {
    const map: Record<string, DailyGoalProgress | null> = {};
    for (const field of metadataFields) {
      let newValue: number | undefined;
      if (field.calculation === 'per100') {
        newValue = calculatedMetadataValues[field.key];
      } else {
        const raw = metadataValues[field.key];
        newValue = raw === undefined ? undefined : parseDecimalInput(raw);
      }
      map[field.key] = getDailyGoalProgress({
        behavior,
        dateStr: selectedDate,
        field,
        newValue,
        dayCutoffHour,
        editLogId,
        categoryBehaviors,
      });
    }
    return map;
  }, [
    behavior,
    calculatedMetadataValues,
    categoryBehaviors,
    dayCutoffHour,
    editLogId,
    metadataFields,
    metadataValues,
    selectedDate,
  ]);

  const maxTimestampForDate = useMemo(
    () => getDayMaxTimestamp(selectedDate, nowRef.current, dayCutoffHour),
    [dayCutoffHour, selectedDate],
  );
  const maxTimeMinutes = useMemo(() => {
    if (selectedDate !== todayStr) return 23 * 60 + 59;
    const date = new Date(maxTimestampForDate);
    if (dayCutoffHour > 0 && date.getHours() < dayCutoffHour) return 23 * 60 + 59;
    return date.getHours() * 60 + date.getMinutes();
  }, [dayCutoffHour, maxTimestampForDate, selectedDate, todayStr]);

  useEffect(() => {
    const clampedEndMinutes = Math.min(endMinutes, maxTimeMinutes);
    if (clampedEndMinutes !== endMinutes) {
      setEndMinutes(clampedEndMinutes);
    }

    const clampedStartMinutes = Math.min(startMinutes, clampedEndMinutes);
    if (clampedStartMinutes !== startMinutes) {
      setStartMinutes(clampedStartMinutes);
    }
  }, [endMinutes, maxTimeMinutes, startMinutes]);

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingMoneyReward, setPendingMoneyReward] = useState<MoneyRewardPreview>();
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current != null) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleExpandTime = useCallback(() => {
    notesRef.current?.blur();
    Keyboard.dismiss();
    setTimePickerCollapsed(false);
  }, []);

  const handleCollapseTime = useCallback(() => setTimePickerCollapsed(true), []);
  const handleInputBlur = useCallback(() => {}, []);
  const applyStartMinutes = useCallback(
    (nextMinutes: number) => {
      const clampedMinutes = Math.min(nextMinutes, maxTimeMinutes);
      setStartMinutes(clampedMinutes);
      if (clampedMinutes > endMinutes) {
        setEndMinutes(clampedMinutes);
      }
    },
    [endMinutes, maxTimeMinutes],
  );

  const applyEndMinutes = useCallback(
    (nextMinutes: number) => {
      const clampedMinutes = Math.min(nextMinutes, maxTimeMinutes);
      setEndMinutes(clampedMinutes);
      if (clampedMinutes < startMinutes) {
        setStartMinutes(clampedMinutes);
      }
    },
    [maxTimeMinutes, startMinutes],
  );

  const startHour = Math.floor(startMinutes / 60);
  const startMinute = startMinutes % 60;
  const endHour = Math.floor(endMinutes / 60);
  const endMinute = endMinutes % 60;
  const durationMinutes = Math.max(1, endMinutes - startMinutes);
  const durationMs = durationMinutes * MS_PER_MINUTE;
  const earnedXp = showTimeRange ? durationMinutes : XP_PER_LOG;
  const rewardHour = showTimeRange ? startHour : endHour;
  const rewardMinute = showTimeRange ? startMinute : endMinute;
  const rewardTimestamp = getLogFormTimestamp(
    selectedDate,
    rewardHour,
    rewardMinute,
    dayCutoffHour,
    maxTimestampForDate,
  );
  const rewardLog: LogEntry = {
    id: editLogId ?? 'preview',
    timestamp: rewardTimestamp,
    ...(showTimeRange ? { endTimestamp: rewardTimestamp + durationMs } : {}),
  };
  const originalMoneyRewardAmount =
    behavior.moneyReward == null || behavior.type === 'neutral'
      ? undefined
      : getMoneyRewardForLog(rewardLog, behavior.moneyReward, behavior.durationXpEnabled === true) *
        (behavior.type === 'undesirable' ? -1 : 1);
  const moneyRewardMultiplier =
    originalMoneyRewardAmount == null ? undefined : getStarMoneyMultiplierForLog(behavior, rewardLog, dayCutoffHour);
  const moneyRewardAmount =
    originalMoneyRewardAmount == null || moneyRewardMultiplier == null
      ? undefined
      : originalMoneyRewardAmount * moneyRewardMultiplier;
  const hasReward = behavior.xpEnabled || moneyRewardAmount != null;
  const maxTimeHour = Math.floor(maxTimeMinutes / 60);
  const getMaxMinuteForHour = useCallback(
    (hour: number) => (maxTimeHour === hour ? maxTimeMinutes % 60 : 59),
    [maxTimeHour, maxTimeMinutes],
  );

  const handleConfirm = useCallback(() => {
    const logHour = showTimeRange ? startHour : endHour;
    const logMinute = showTimeRange ? startMinute : endMinute;
    const rawStartTimestamp = getLogFormTimestamp(selectedDate, logHour, logMinute, dayCutoffHour, maxTimestampForDate);
    const rawEndTimestamp = getLogFormTimestamp(selectedDate, endHour, endMinute, dayCutoffHour, maxTimestampForDate);
    const endTimestamp = Math.min(rawEndTimestamp, maxTimestampForDate);
    const startTimestamp = Math.min(rawStartTimestamp, endTimestamp);
    const saveEndTimestamp = showTimeRange ? endTimestamp : undefined;

    const metadata: Record<string, string | number> = {};
    if (notes.trim()) metadata.notes = notes.trim();
    const metadataInputFields: MetadataField[] = amountField ? [amountField, ...manualMetadataFields] : metadataFields;
    for (const field of metadataInputFields) {
      const value = metadataValues[field.key];
      const parsed = value === undefined ? undefined : parseDecimalInput(value);
      if (parsed != null) {
        metadata[field.key] = parsed;
      }
    }
    if (amountField) {
      Object.assign(metadata, calculatedMetadataValues);
      for (const field of calculatedMetadataFields) {
        if (metadata[field.key] != null) continue;
        const value = metadataValues[field.key];
        const parsed = value === undefined ? undefined : parseDecimalInput(value);
        if (parsed != null) {
          metadata[field.key] = parsed;
        }
      }
    }
    const metadataOrUndefined = Object.keys(metadata).length > 0 ? metadata : undefined;

    if (editLogId) {
      updateLog(behaviorId, editLogId, startTimestamp, metadataOrUndefined, saveEndTimestamp);
      onSaved();
      return;
    }

    logBehavior(behaviorId, startTimestamp, metadataOrUndefined, saveEndTimestamp);

    const delay = hasReward ? REWARD_ANIMATION_MS : 0;
    if (delay > 0) {
      setPending(true);
      setPendingMoneyReward(
        moneyRewardAmount == null
          ? undefined
          : {
              amount: moneyRewardAmount,
              originalAmount: originalMoneyRewardAmount ?? moneyRewardAmount,
              multiplier: moneyRewardMultiplier ?? 1,
            },
      );
    }
    closeTimeoutRef.current = setTimeout(() => {
      setPending(false);
      setPendingMoneyReward(undefined);
      onSaved();
    }, delay);
  }, [
    amountField,
    behaviorId,
    calculatedMetadataFields,
    calculatedMetadataValues,
    editLogId,
    endHour,
    endMinute,
    dayCutoffHour,
    logBehavior,
    manualMetadataFields,
    maxTimestampForDate,
    metadataFields,
    metadataValues,
    notes,
    onSaved,
    selectedDate,
    showTimeRange,
    startHour,
    startMinute,
    updateLog,
    hasReward,
    moneyRewardAmount,
    moneyRewardMultiplier,
    originalMoneyRewardAmount,
  ]);

  const handleDelete = useCallback(() => {
    if (!editLogId) return;
    Alert.alert('Remove Log', 'Remove this log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeLog(behaviorId, editLogId);
          onSaved();
        },
      },
    ]);
  }, [behaviorId, editLogId, onSaved, removeLog]);

  const renderTimePicker = useCallback(
    (label: string, hour: number, minute: number, applyMinutes: (nextMinutes: number) => void) =>
      React.createElement(TimePicker, {
        label,
        hour,
        minute,
        maxHour: maxTimeHour,
        maxMinute: getMaxMinuteForHour(hour),
        collapsed: timePickerCollapsed,
        onMinuteChange: nextMinute => applyMinutes(hour * 60 + nextMinute),
        onExpand: handleExpandTime,
      }),
    [getMaxMinuteForHour, handleExpandTime, maxTimeHour, timePickerCollapsed],
  );

  return {
    amountField,
    applyEndMinutes,
    applyStartMinutes,
    behavior,
    calculatedMetadataFields,
    calculatedMetadataValues,
    durationMs,
    editLogId,
    endHour,
    endMinute,
    earnedXp,
    handleCollapseTime,
    handleConfirm,
    handleDelete,
    handleInputBlur,
    manualMetadataFields,
    metadataFields,
    metadataValues,
    moneyRewardAmount: pendingMoneyReward?.amount ?? moneyRewardAmount,
    moneyRewardOriginalAmount: pendingMoneyReward?.originalAmount ?? originalMoneyRewardAmount,
    moneyRewardMultiplier: pendingMoneyReward?.multiplier ?? moneyRewardMultiplier,
    notes,
    notesRef,
    pending,
    progressByField,
    renderTimePicker,
    selectedDate,
    setMetadataValues,
    setNotes,
    setSelectedDate,
    showTimeRange,
    startHour,
    startMinute,
    todayStr,
  };
}

export type BehaviorLogFormModel = ReturnType<typeof useBehaviorLogForm>;
