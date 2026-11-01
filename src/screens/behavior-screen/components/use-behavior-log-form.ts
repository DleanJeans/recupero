import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import { type MoneyRewardPreview, REWARD_ANIMATION_MS } from '../../../components/log-reward-preview';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useCuesStore } from '../../../store/cues-store';
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorEntry, LogEntry } from '../../../types/behavior';
import type { CueRef } from '../../../types/cue';
import { placeCueRef } from '../../../utils/cue-utils';
import { toDateString } from '../../../utils/date-utils';
import { findPlaceAtPoint } from '../../../utils/geofence-utils';
import { getCurrentPointIfPermitted } from '../../../utils/location-utils';
import {
  getDayMaxTimestamp,
  getDefaultTimedLogStartTimestamp,
  getLogFormTimestamp,
  getTimeOfDaySeconds,
} from '../../../utils/log-utils';
import {
  buildCalculatedMetadata,
  buildLogMetadata,
  type DailyGoalProgress,
  getBehaviorAmountField,
  getBehaviorMetadataFields,
  getCalculatedMetadataFields,
  getDailyGoalProgress,
  getInitialLogMetadataValues,
  getManualMetadataFields,
  getSelectedAmountMetadataField,
  parseDecimalInput,
  type StackedLog,
} from '../../../utils/metadata-calculation-utils';
import { getMoneyRewardForLog, getStarMoneyMultiplierForLog } from '../../../utils/money-utils';
import { formatDuration } from '../../../utils/time-utils';
import { getLogXp, XP_PER_LOG } from '../../../utils/xp-utils';
import { TimePicker } from './time-picker';

export interface BehaviorLogFormProps {
  behaviorId: string;
  behavior: BehaviorEntry;
  editLogId?: string;
  initialNotes?: string;
  initialCues?: CueRef[];
  timerStartTimestamp?: number;
  timerEndTimestamp?: number;
  onSaved: () => void;
}

export function useBehaviorLogForm({
  behaviorId,
  behavior,
  editLogId,
  initialNotes,
  initialCues,
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
  const showSeconds = hasTimerRange;
  const initialStartSeconds = showSeconds
    ? getTimeOfDaySeconds(initialStartTimestamp)
    : Math.floor(getTimeOfDaySeconds(initialStartTimestamp) / 60) * 60;
  const initialEndSeconds = showSeconds
    ? getTimeOfDaySeconds(initialEndTimestamp)
    : Math.floor(getTimeOfDaySeconds(initialEndTimestamp) / 60) * 60;

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [startSeconds, setStartSeconds] = useState(initialStartSeconds);
  const [endSeconds, setEndSeconds] = useState(Math.max(initialStartSeconds, initialEndSeconds));
  const showTimeRange =
    hasTimerRange || existingLog?.endTimestamp != null || (!existingLog && behavior.durationXpEnabled === true);
  const notesRef = useRef<import('react-native').TextInput>(null);
  const [notes, setNotes] = useState(String(existingLog?.metadata?.notes ?? initialNotes ?? ''));
  const [selectedCues, setSelectedCues] = useState<CueRef[]>(() =>
    existingLog ? (existingLog.cues ?? []) : (initialCues ?? []),
  );
  /** Set once the user taps a place cue, so the automatic place pick never overrides their choice. */
  const placeCueTouchedRef = useRef(false);
  const toggleCue = useCallback((ref: CueRef) => {
    if (ref.startsWith('place:')) placeCueTouchedRef.current = true;
    setSelectedCues(current => (current.includes(ref) ? current.filter(item => item !== ref) : [...current, ref]));
  }, []);
  const places = useCuesStore(state => state.places);
  // New logs: pre-select the saved place the phone is currently inside (only if location is already allowed).
  // biome-ignore lint/correctness/useExhaustiveDependencies: only check the location once, when the form opens
  useEffect(() => {
    if (existingLog || places.length === 0) return;
    let cancelled = false;
    getCurrentPointIfPermitted()
      .then(point => {
        const place = point ? findPlaceAtPoint(places, point) : undefined;
        if (cancelled || !place || placeCueTouchedRef.current) return;
        const ref = placeCueRef(place.id);
        setSelectedCues(current => (current.includes(ref) ? current : [...current, ref]));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
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
    } else {
      Object.assign(values, getInitialLogMetadataValues(metadataFields, amountField, behavior.defaultMetadata));
    }
    return values;
  });
  const categories = useBehaviorStore(state => state.categories);
  /** Other behaviours logged together with this one (habit stacking). New logs only. */
  const [stackedLogs, setStackedLogs] = useState<StackedLog[]>([]);
  const addStackedBehavior = useCallback(
    (stackedBehaviorId: string) => {
      const stackedBehavior = allBehaviors.find(b => b.id === stackedBehaviorId);
      if (!stackedBehavior) return;
      setStackedLogs(current => {
        if (stackedBehaviorId === behaviorId || current.some(item => item.behaviorId === stackedBehaviorId)) {
          return current;
        }
        const fields = getBehaviorMetadataFields(stackedBehavior, categories);
        const values = getInitialLogMetadataValues(
          fields,
          getBehaviorAmountField(stackedBehavior, fields),
          stackedBehavior.defaultMetadata,
        );
        return [...current, { behaviorId: stackedBehaviorId, metadataValues: values }];
      });
    },
    [allBehaviors, behaviorId, categories],
  );
  const removeStackedBehavior = useCallback((stackedBehaviorId: string) => {
    setStackedLogs(current => current.filter(item => item.behaviorId !== stackedBehaviorId));
  }, []);
  const setStackedMetadataValues = useCallback(
    (stackedBehaviorId: string, update: React.SetStateAction<Record<string, string>>) => {
      setStackedLogs(current =>
        current.map(item =>
          item.behaviorId === stackedBehaviorId
            ? {
                ...item,
                metadataValues: typeof update === 'function' ? update(item.metadataValues) : update,
              }
            : item,
        ),
      );
    },
    [],
  );
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
    if (selectedDate !== todayStr) return showSeconds ? 23 * 60 * 60 + 59 * 60 + 59 : 23 * 60 * 60 + 59 * 60;
    const date = new Date(maxTimestampForDate);
    if (dayCutoffHour > 0 && date.getHours() < dayCutoffHour) {
      return showSeconds ? 23 * 60 * 60 + 59 * 60 + 59 : 23 * 60 * 60 + 59 * 60;
    }
    const currentSeconds = getTimeOfDaySeconds(maxTimestampForDate);
    return showSeconds ? currentSeconds : Math.floor(currentSeconds / 60) * 60;
  }, [dayCutoffHour, maxTimestampForDate, selectedDate, showSeconds, todayStr]);

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
  const rewardSecond = showSeconds && showTimeRange ? startSecond : 0;
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
    const logSecond = showSeconds && showTimeRange ? startSecond : 0;
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
      showSeconds ? endSecond : 0,
    );
    const endTimestamp = Math.min(rawEndTimestamp, maxTimestampForDate);
    const startTimestamp = Math.min(rawStartTimestamp, endTimestamp);
    const saveEndTimestamp = showTimeRange ? endTimestamp : undefined;

    const metadataOrUndefined = buildLogMetadata({
      fields: metadataFields,
      amountField,
      values: metadataValues,
      defaultMetadata: behavior.defaultMetadata,
      notes,
    });

    if (editLogId) {
      updateLog(behaviorId, editLogId, startTimestamp, metadataOrUndefined, saveEndTimestamp, selectedCues);
      onSaved();
      return;
    }

    logBehavior(behaviorId, startTimestamp, metadataOrUndefined, saveEndTimestamp, selectedCues);
    // Habit stack: every stacked behaviour shares the time, cues and notes, with its own metadata.
    for (const stacked of stackedLogs) {
      const stackedBehavior = allBehaviors.find(b => b.id === stacked.behaviorId);
      if (!stackedBehavior) continue;
      const stackedFields = getBehaviorMetadataFields(stackedBehavior, categories);
      logBehavior(
        stacked.behaviorId,
        startTimestamp,
        buildLogMetadata({
          fields: stackedFields,
          amountField: getBehaviorAmountField(stackedBehavior, stackedFields),
          values: stacked.metadataValues,
          defaultMetadata: stackedBehavior.defaultMetadata,
          notes,
        }),
        saveEndTimestamp,
        selectedCues,
      );
    }

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
    allBehaviors,
    amountField,
    behavior.defaultMetadata,
    behaviorId,
    categories,
    editLogId,
    endHour,
    endMinute,
    endSecond,
    dayCutoffHour,
    logBehavior,
    maxTimestampForDate,
    metadataFields,
    metadataValues,
    notes,
    onSaved,
    selectedCues,
    selectedDate,
    showSeconds,
    showTimeRange,
    stackedLogs,
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
        second: showSeconds ? second : 0,
        maxHour: Math.floor(maxTimeSeconds / 3600),
        maxMinute: Math.floor((maxTimeSeconds % 3600) / 60),
        maxSecond:
          showSeconds &&
          hour === Math.floor(maxTimeSeconds / 3600) &&
          minute === Math.floor((maxTimeSeconds % 3600) / 60)
            ? maxTimeSeconds % 60
            : 59,
        showSeconds,
        collapsed: timePickerCollapsed,
        onMinuteChange: nextMinute => applySeconds(hour * 3600 + nextMinute * 60 + (showSeconds ? second : 0)),
        onSecondChange: nextSecond => applySeconds(hour * 3600 + minute * 60 + nextSecond),
        onExpand: handleExpandTime,
      }),
    [handleExpandTime, maxTimeSeconds, showSeconds, timePickerCollapsed],
  );

  return {
    addStackedBehavior,
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
    removeStackedBehavior,
    renderTimePicker,
    selectedCues,
    selectedDate,
    setMetadataValues,
    setNotes,
    setSelectedDate,
    setStackedMetadataValues,
    showTimeRange,
    showSeconds,
    startHour,
    startMinute,
    stackedLogs,
    startSecond,
    todayStr,
    toggleCue,
  };
}

export type BehaviorLogFormModel = ReturnType<typeof useBehaviorLogForm>;
