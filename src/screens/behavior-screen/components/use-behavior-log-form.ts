import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { type MoneyRewardPreview, REWARD_ANIMATION_MS } from '../../../components/log-reward-preview';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useChecklistsStore } from '../../../store/checklists-store';
import { useCuesStore } from '../../../store/cues-store';
import { usePendingLogsStore } from '../../../store/pending-logs-store';
import { useSettingsStore } from '../../../store/settings-store';
import { useTimerStore } from '../../../store/timer-store';
import type { BehaviorEntry, LogEntry } from '../../../types/behavior';
import type { CueRef } from '../../../types/cue';
import type { RootStackParamList } from '../../../types/navigation';
import { switchMemberMetadataValues } from '../../../utils/behavior-group-utils';
import { placeCueRef } from '../../../utils/cue-utils';
import { timestampForDateTime, toDateString } from '../../../utils/date-utils';
import { findPlaceAtPoint } from '../../../utils/geofence-utils';
import { getCurrentPointIfPermitted } from '../../../utils/location-utils';
import {
  formatEndDateLabel,
  getDayMaxTimestamp,
  getDefaultTimedLogStartTimestamp,
  getLogFormTimestamp,
  getOvernightEndTimestamp,
  getTimeOfDaySeconds,
  getTimeRangeDurationMs,
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
  isLinkMetadataField,
  NO_AMOUNT_FIELD_KEY,
  parseDecimalInput,
  type StackedLog,
} from '../../../utils/metadata-calculation-utils';
import {
  applyFormulaValues,
  evaluateFormula,
  getActiveFormulaFields,
  getFieldFormula,
  getFormulaInputKeys,
  isLogFormulaValueTyped,
  resolveMetadataFieldUnits,
} from '../../../utils/metadata-formula-utils';
import { getFirstLinkField } from '../../../utils/metadata-link-utils';
import { getMoneyRewardForLog, getStarMoneyMultiplierForLog } from '../../../utils/money-utils';
import { formatDuration } from '../../../utils/time-utils';
import { getLogXp, XP_PER_LOG } from '../../../utils/xp-utils';
import { TimePicker } from './time-picker';

export interface BehaviorLogFormProps {
  behaviorId: string;
  behavior: BehaviorEntry;
  editLogId?: string;
  /** Prefill from a log saved for later; logging it removes it. */
  pendingLogId?: string;
  initialNotes?: string;
  /** Task the log is for (e.g. from the Tasks timer): fills the category's Task field. */
  initialTaskId?: string;
  initialCues?: CueRef[];
  /** Opened from a checklist row: the log joins today's checklist run and ticks the item. */
  checklistItem?: { checklistId: string; itemId: string };
  timerStartTimestamp?: number;
  timerEndTimestamp?: number;
  onSaved: () => void;
}

export function useBehaviorLogForm({
  behaviorId,
  behavior,
  editLogId,
  pendingLogId,
  initialNotes,
  initialTaskId,
  initialCues,
  checklistItem,
  timerStartTimestamp,
  timerEndTimestamp,
  onSaved,
}: BehaviorLogFormProps) {
  const pendingLog = usePendingLogsStore.getState().pendingLogs.find(p => p.id === pendingLogId);
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
  const moneyRewardsEnabled = useSettingsStore(s => s.moneyRewardsEnabled);

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
  const showTimeRange =
    hasTimerRange || existingLog?.endTimestamp != null || (!existingLog && behavior.durationXpEnabled === true);
  const showSeconds = showTimeRange;
  const initialStartSeconds = showSeconds
    ? getTimeOfDaySeconds(initialStartTimestamp)
    : Math.floor(getTimeOfDaySeconds(initialStartTimestamp) / 60) * 60;
  const initialEndSeconds = showSeconds
    ? getTimeOfDaySeconds(initialEndTimestamp)
    : Math.floor(getTimeOfDaySeconds(initialEndTimestamp) / 60) * 60;

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [startSeconds, setStartSeconds] = useState(initialStartSeconds);
  const [endSeconds, setEndSeconds] = useState(initialEndSeconds);
  const notesRef = useRef<import('react-native').TextInput>(null);
  const taskField = getFirstLinkField(category?.metadataFields, 'task');
  // With a Task field the task is linked there, so its name does not also go into the notes.
  const linkedInitialTaskId = taskField && initialTaskId ? initialTaskId : undefined;
  const [notes, setNotes] = useState(
    String(existingLog?.metadata?.notes ?? pendingLog?.notes ?? (linkedInitialTaskId ? '' : (initialNotes ?? ''))),
  );
  const [selectedCues, setSelectedCues] = useState<CueRef[]>(() =>
    existingLog ? (existingLog.cues ?? []) : (pendingLog?.cues ?? initialCues ?? []),
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

  const categoryFields = useMemo(() => category?.metadataFields ?? [], [category?.metadataFields]);
  const amountField = useMemo(
    () =>
      getSelectedAmountMetadataField(categoryFields, behavior.metadataAmountFieldKey, behavior.metadataQuantityUnit),
    [behavior.metadataAmountFieldKey, behavior.metadataQuantityUnit, categoryFields],
  );
  /** Fields with "Unit from Base" show this behaviour's Base unit (g for Weight, ml for Volume). */
  const metadataFields = useMemo(
    () => resolveMetadataFieldUnits(categoryFields, amountField),
    [amountField, categoryFields],
  );
  const manualMetadataFields = useMemo(() => getManualMetadataFields(metadataFields), [metadataFields]);
  /** "None" amount unit: hide the amount and per-100 fields, which can't be filled or calculated without an amount. */
  const amountOptedOut = behavior.metadataAmountFieldKey === NO_AMOUNT_FIELD_KEY;
  const visibleMetadataFields = useMemo(
    () =>
      amountOptedOut
        ? metadataFields.filter(field => isLinkMetadataField(field) || getManualMetadataFields([field]).length > 0)
        : metadataFields,
    [amountOptedOut, metadataFields],
  );
  const calculatedMetadataFields = useMemo(
    () => (amountOptedOut ? [] : getCalculatedMetadataFields(metadataFields)),
    [amountOptedOut, metadataFields],
  );
  /** Fields filled by a formula (e.g. Weight = Before - After) and the fields their formulas use. */
  const formulaFields = useMemo(
    () => getActiveFormulaFields(metadataFields, amountField, amountOptedOut),
    [amountField, amountOptedOut, metadataFields],
  );
  const formulaInputKeys = useMemo(() => getFormulaInputKeys(formulaFields), [formulaFields]);
  /** Formula fields in Type mode. An edited log opens the way it was saved; a new one the way this behaviour
   *  was last logged. */
  const [typedFormulaKeys, setTypedFormulaKeys] = useState<string[]>(() =>
    formulaFields
      .filter(field =>
        existingLog
          ? isLogFormulaValueTyped(field, existingLog.metadata)
          : behavior.metadataTypedFormulaKeys?.includes(field.key) === true,
      )
      .map(field => field.key),
  );
  const [metadataValues, setMetadataValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    if (existingLog?.metadata) {
      for (const field of metadataFields) {
        const value = existingLog.metadata[field.key];
        if (value != null) values[field.key] = String(value);
      }
    } else if (pendingLog) {
      Object.assign(values, pendingLog.metadataValues);
    } else {
      Object.assign(values, getInitialLogMetadataValues(metadataFields, amountField, behavior.defaultMetadata));
      if (taskField && linkedInitialTaskId) values[taskField.key] = linkedInitialTaskId;
    }
    return values;
  });
  const categories = useBehaviorStore(state => state.categories);
  /** Switching to another group member (flavour chip) on a new log: swap in its metadata defaults,
   *  keeping values the user typed. Date, time, notes and cues stay as they are. */
  const previousBehaviorRef = useRef(behavior);
  // biome-ignore lint/correctness/useExhaustiveDependencies: only react to switching behaviour
  useEffect(() => {
    const previous = previousBehaviorRef.current;
    previousBehaviorRef.current = behavior;
    if (previous.id === behavior.id || existingLog) return;
    setMetadataValues(current => switchMemberMetadataValues(current, previous, behavior, categories));
    setStackedLogs(current => current.filter(item => item.behaviorId !== behavior.id));
  }, [behavior.id]);
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
  /** What gets saved: the typed values with formula results filled in. */
  const effectiveMetadataValues = useMemo(
    () => applyFormulaValues(metadataValues, formulaFields, typedFormulaKeys),
    [formulaFields, metadataValues, typedFormulaKeys],
  );
  const setFormulaTyped = useCallback(
    (key: string, typed: boolean) => {
      setTypedFormulaKeys(current =>
        typed ? (current.includes(key) ? current : [...current, key]) : current.filter(item => item !== key),
      );
      if (!typed) return;
      // Switching to Type starts from the formula's result, so it can be nudged instead of retyped.
      const formula = formulaFields.find(field => field.key === key);
      const result = formula ? evaluateFormula(getFieldFormula(formula) ?? '', metadataValues).result : undefined;
      if (result != null) setMetadataValues(current => ({ ...current, [key]: String(result) }));
    },
    [formulaFields, metadataValues],
  );
  const calculatedMetadataValues = useMemo(() => {
    if (!amountField) return {};
    const amountValue = effectiveMetadataValues[amountField.key];
    if (amountValue === undefined || amountValue === '') return {};
    return buildCalculatedMetadata(
      metadataFields,
      behavior.defaultMetadata,
      parseDecimalInput(amountValue),
      behavior.metadataRateBasis,
    );
  }, [amountField, behavior.defaultMetadata, behavior.metadataRateBasis, metadataFields, effectiveMetadataValues]);

  const progressByField = useMemo<Record<string, DailyGoalProgress | null>>(() => {
    const map: Record<string, DailyGoalProgress | null> = {};
    for (const field of metadataFields) {
      let newValue: number | undefined;
      if (field.calculation === 'per100') {
        newValue = calculatedMetadataValues[field.key];
      } else {
        const raw = effectiveMetadataValues[field.key];
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
    effectiveMetadataValues,
    metadataFields,
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

    const clampedStartSeconds = Math.min(startSeconds, maxTimeSeconds);
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

  const handleCollapseTime = useCallback(() => setTimePickerCollapsed(true), []);
  const handleInputBlur = useCallback(() => {}, []);
  const applyStartSeconds = useCallback(
    (nextSeconds: number) => {
      const clampedSeconds = Math.min(nextSeconds, maxTimeSeconds);
      setStartSeconds(clampedSeconds);
    },
    [maxTimeSeconds],
  );

  const applyEndSeconds = useCallback(
    (nextSeconds: number) => {
      const clampedSeconds = Math.min(nextSeconds, maxTimeSeconds);
      setEndSeconds(clampedSeconds);
    },
    [maxTimeSeconds],
  );

  const startHour = Math.floor(startSeconds / 3600);
  const startMinute = Math.floor((startSeconds % 3600) / 60);
  const startSecond = startSeconds % 60;
  const endHour = Math.floor(endSeconds / 3600);
  const endMinute = Math.floor((endSeconds % 3600) / 60);
  const endSecond = endSeconds % 60;
  // An end time earlier than the start time means the log runs past midnight into the next day.
  const endsNextDay = showTimeRange && endSeconds < startSeconds;
  const durationMs = getTimeRangeDurationMs(startSeconds, endSeconds);
  const endDateLabel = useMemo(() => {
    if (!endsNextDay) return '';
    const startTs = timestampForDateTime(selectedDate, startHour, startMinute, dayCutoffHour);
    return formatEndDateLabel(
      getOvernightEndTimestamp(startTs, timestampForDateTime(selectedDate, endHour, endMinute, dayCutoffHour)),
    );
  }, [dayCutoffHour, endHour, endMinute, endsNextDay, selectedDate, startHour, startMinute]);
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
    !moneyRewardsEnabled || behavior.moneyReward == null || behavior.type === 'neutral'
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  /** Time this log instead: start the timer now, or from the start time the user set in the expanded time picker. */
  const handleStartTimer = useCallback(() => {
    const now = Date.now();
    const startedAt = timePickerCollapsed
      ? now
      : Math.min(
          getLogFormTimestamp(
            selectedDate,
            showTimeRange ? startHour : endHour,
            showTimeRange ? startMinute : endMinute,
            dayCutoffHour,
            maxTimestampForDate,
            showSeconds && showTimeRange ? startSecond : 0,
          ),
          now,
        );
    useTimerStore.getState().start(behaviorId, startedAt, notes.trim() || undefined);
    navigation.navigate('Timer');
  }, [
    behaviorId,
    dayCutoffHour,
    endHour,
    endMinute,
    maxTimestampForDate,
    navigation,
    notes,
    selectedDate,
    showSeconds,
    showTimeRange,
    startHour,
    startMinute,
    startSecond,
    timePickerCollapsed,
  ]);
  /** Remembers Type vs Formula per behaviour, so the next log opens the same way. */
  const rememberFormulaMode = useCallback(() => {
    if (formulaFields.length === 0) return;
    const formulaKeys = new Set(formulaFields.map(field => field.key));
    const kept = (behavior.metadataTypedFormulaKeys ?? []).filter(key => !formulaKeys.has(key));
    const next = [...kept, ...typedFormulaKeys.filter(key => formulaKeys.has(key))].sort();
    const previous = [...(behavior.metadataTypedFormulaKeys ?? [])].sort();
    if (next.join(',') === previous.join(',')) return;
    useBehaviorStore
      .getState()
      .updateBehavior(behaviorId, { metadataTypedFormulaKeys: next.length > 0 ? next : undefined });
  }, [behavior.metadataTypedFormulaKeys, behaviorId, formulaFields, typedFormulaKeys]);
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
    const overnightEndTimestamp = showTimeRange
      ? getOvernightEndTimestamp(rawStartTimestamp, rawEndTimestamp)
      : rawEndTimestamp;
    const endLimit = endsNextDay ? Math.max(maxTimestampForDate, nowRef.current.getTime()) : maxTimestampForDate;
    const endTimestamp = Math.min(overnightEndTimestamp, endLimit);
    const startTimestamp = Math.min(rawStartTimestamp, endTimestamp);
    const saveEndTimestamp = showTimeRange ? endTimestamp : undefined;

    const metadataOrUndefined = buildLogMetadata({
      fields: metadataFields,
      amountField,
      values: effectiveMetadataValues,
      defaultMetadata: behavior.defaultMetadata,
      rateBasis: behavior.metadataRateBasis,
      notes,
    });
    rememberFormulaMode();

    if (editLogId) {
      updateLog(behaviorId, editLogId, startTimestamp, metadataOrUndefined, saveEndTimestamp, selectedCues);
      // Logs saved together with this one follow its new time and cues.
      if (existingLog?.stackId) {
        useBehaviorStore
          .getState()
          .syncStackedLogs(
            existingLog.stackId,
            editLogId,
            existingLog.timestamp,
            startTimestamp,
            saveEndTimestamp,
            selectedCues,
          );
      }
      onSaved();
      return;
    }

    const checklistRun = checklistItem
      ? useChecklistsStore.getState().ensureRun(checklistItem.checklistId, todayStr)
      : undefined;
    const stackId = checklistRun?.stackId ?? (stackedLogs.length > 0 ? uuidv4() : undefined);
    const logId = logBehavior(behaviorId, startTimestamp, metadataOrUndefined, saveEndTimestamp, selectedCues, stackId);
    if (pendingLogId) usePendingLogsStore.getState().removePending(pendingLogId);
    if (checklistItem) {
      useChecklistsStore
        .getState()
        .setTick(checklistItem.checklistId, checklistItem.itemId, { at: Date.now(), logId, behaviorId });
    }
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
          rateBasis: stackedBehavior.metadataRateBasis,
          notes,
        }),
        saveEndTimestamp,
        selectedCues,
        stackId,
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
    checklistItem,
    editLogId,
    effectiveMetadataValues,
    endHour,
    endMinute,
    endSecond,
    endsNextDay,
    dayCutoffHour,
    existingLog,
    logBehavior,
    maxTimestampForDate,
    metadataFields,
    rememberFormulaMode,
    notes,
    onSaved,
    pendingLogId,
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

  /** Keep the entered details (amount, metadata, notes, cues) without logging; the time is set when it is finished. */
  const handleSaveForLater = useCallback(() => {
    usePendingLogsStore.getState().savePending({
      id: pendingLogId,
      behaviorId,
      metadataValues,
      notes,
      cues: selectedCues,
    });
    onSaved();
  }, [behaviorId, metadataValues, notes, onSaved, pendingLogId, selectedCues]);

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
        onTimeChange: applySeconds,
      }),
    [maxTimeSeconds, showSeconds],
  );

  return {
    addStackedBehavior,
    amountField,
    applyEndSeconds,
    applyStartSeconds,
    behavior,
    calculatedMetadataFields,
    calculatedMetadataValues,
    visibleMetadataFields,
    durationMs,
    editLogId,
    effectiveMetadataValues,
    endDateLabel,
    endsNextDay,
    endHour,
    endMinute,
    endSecond,
    earnedXp,
    handleCollapseTime,
    handleConfirm,
    handleDelete,
    handleInputBlur,
    handleSaveForLater,
    handleStartTimer,
    hasTimerRange,
    formulaFields,
    formulaInputKeys,
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
    setFormulaTyped,
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
    typedFormulaKeys,
  };
}

export type BehaviorLogFormModel = ReturnType<typeof useBehaviorLogForm>;
