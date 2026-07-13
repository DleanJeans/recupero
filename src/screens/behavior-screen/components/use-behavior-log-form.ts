import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import { type MoneyRewardPreview, REWARD_ANIMATION_MS } from '../../../components/log-reward-preview';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorEntry, LogEntry, MetadataField } from '../../../types/behavior';
import { toDateString } from '../../../utils/date-utils';
import {
  getDayMaxTimestamp,
  getDefaultTimedLogStartTimestamp,
  getLogFormTimestamp,
  getTimeOfDaySeconds,
} from '../../../utils/log-utils';
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
import { formatDuration } from '../../../utils/time-utils';
import { getLogXp, XP_PER_LOG } from '../../../utils/xp-utils';
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
  const initialStartSeconds = getTimeOfDaySeconds(initialStartTimestamp);
  const initialEndSeconds = getTimeOfDaySeconds(initialEndTimestamp);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [startSeconds, setStartSeconds] = useState(initialStartSeconds);
  const [endSeconds, setEndSeconds] = useState(Math.max(initialStartSeconds, initialEndSeconds));
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
  const maxTimeSeconds = useMemo(() => {
    if (selectedDate !== todayStr) return 23 * 60 * 60 + 59 * 60 + 59;
    const date = new Date(maxTimestampForDate);
    if (dayCutoffHour > 0 && date.getHours() < dayCutoffHour) return 23 * 60 * 60 + 59 * 60 + 59;
    return getTimeOfDaySeconds(maxTimestampForDate);
  }, [dayCutoffHour, maxTimestampForDate, selectedDate, todayStr]);

  useEffect(() => {
    const clampedEndSeconds = Math.min(endSeconds, maxTimeSeconds);
    if (clampedEndSeconds !== endSeconds) {
      setEndSeconds(clampedEndSeconds);
    }

    const clampedStartSeconds = Math.min(startSeconds, clampedEndSeconds);
    if (clampedStartSeconds !== startSeconds) {
      setStartSeconds(clampedStartSeconds);
    }
  }, [endSeconds, maxTimeSeconds, startSeconds]);

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
  const applyStartSeconds = useCallback(
    (nextSeconds: number) => {
      const clampedSeconds = Math.min(nextSeconds, maxTimeSeconds);
      setStartSeconds(clampedSeconds);
      if (clampedSeconds > endSeconds) {
        setEndSeconds(clampedSeconds);
      }
    },
    [endSeconds, maxTimeSeconds],
  );

  const applyEndSeconds = useCallback(
    (nextSeconds: number) => {
      const clampedSeconds = Math.min(nextSeconds, maxTimeSeconds);
      setEndSeconds(clampedSeconds);
      if (clampedSeconds < startSeconds) {
        setStartSeconds(clampedSeconds);
      }
    },
    [maxTimeSeconds, startSeconds],
  );

  const startHour = Math.floor(startSeconds / 3600);
  const startMinute = Math.floor((startSeconds % 3600) / 60);
  const startSecond = startSeconds % 60;
  const endHour = Math.floor(endSeconds / 3600);
  const endMinute = Math.floor((endSeconds % 3600) / 60);
  const endSecond = endSeconds % 60;
  const durationMs = Math.max(0, (endSeconds - startSeconds) * 1000);
  const rewardHour = showTimeRange ? startHour : endHour;
  const rewardMinute = showTimeRange ? startMinute : endMinute;
  const rewardSecond = showTimeRange ? startSecond : endSecond;
  const rewardTimestamp = getLogFormTimestamp(
    selectedDate,
    rewardHour,
    rewardMinute,
    dayCutoffHour,
    maxTimestampForDate,
    rewardSecond,
  );
  const rewardLog: LogEntry = {
    id: editLogId ?? 'preview',
    timestamp: rewardTimestamp,
    ...(showTimeRange ? { endTimestamp: rewardTimestamp + durationMs } : {}),
  };
  const earnedXp = showTimeRange ? getLogXp(rewardLog) : XP_PER_LOG;
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
  const handleConfirm = useCallback(() => {
    const logHour = showTimeRange ? startHour : endHour;
    const logMinute = showTimeRange ? startMinute : endMinute;
    const logSecond = showTimeRange ? startSecond : endSecond;
    const rawStartTimestamp = getLogFormTimestamp(
      selectedDate,
      logHour,
      logMinute,
      dayCutoffHour,
      maxTimestampForDate,
      logSecond,
    );
    const rawEndTimestamp = getLogFormTimestamp(
      selectedDate,
      endHour,
      endMinute,
      dayCutoffHour,
      maxTimestampForDate,
      endSecond,
    );
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
    endSecond,
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
    startSecond,
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
    (label: string, hour: number, minute: number, second: number, applySeconds: (nextSeconds: number) => void) =>
      React.createElement(TimePicker, {
        label,
        hour,
        minute,
        second,
        maxHour: Math.floor(maxTimeSeconds / 3600),
        maxMinute: Math.floor((maxTimeSeconds % 3600) / 60),
        maxSecond: maxTimeSeconds % 60,
        collapsed: timePickerCollapsed,
        onMinuteChange: nextMinute => applySeconds(hour * 3600 + nextMinute * 60 + second),
        onExpand: handleExpandTime,
      }),
    [handleExpandTime, maxTimeSeconds, timePickerCollapsed],
  );

  return {
    amountField,
    applyEndSeconds,
    applyStartSeconds,
    behavior,
    calculatedMetadataFields,
    calculatedMetadataValues,
    durationMs,
    editLogId,
    endHour,
    endMinute,
    endSecond,
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
    startSecond,
    todayStr,
  };
}

export type BehaviorLogFormModel = ReturnType<typeof useBehaviorLogForm>;
