import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type GestureResponderEvent, Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/Button';
import { DatePicker } from '../../../components/DatePicker';
import { Text, TextInput } from '../../../components/Text';
import { useBehaviorStore } from '../../../store/behaviorStore';
import { useSettingsStore } from '../../../store/settingsStore';
import type { BehaviorEntry, MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { toDateString } from '../../../utils/dateUtils';
import { getDayMaxTimestamp, getDefaultTimedLogStartTimestamp, getLogFormTimestamp } from '../../../utils/logUtils';
import {
  buildCalculatedMetadata,
  formatMetadataFieldLabel,
  getCalculatedMetadataFields,
  getManualMetadataFields,
  getSelectedAmountMetadataField,
} from '../../../utils/metadataCalculationUtils';
import { formatDuration, MS_PER_MINUTE } from '../../../utils/timeUtils';
import { XP_PER_LOG } from '../../../utils/xpUtils';
import { CalculatedMetadataFields } from './calculated-metadata-fields';
import { FloatingXPBurst, type XPBurst } from './floating-xp-burst';
import { MetadataInputRow } from './MetadataInputRow';
import { TimePicker } from './TimePicker';

interface LogFormProps {
  behaviorId: string;
  behavior: BehaviorEntry;
  editLogId?: string;
  timerStartTimestamp?: number;
  timerEndTimestamp?: number;
  onSaved: () => void;
}

export function LogForm({
  behaviorId,
  behavior,
  editLogId,
  timerStartTimestamp,
  timerEndTimestamp,
  onSaved,
}: LogFormProps) {
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
  const logBehavior = useBehaviorStore(state => state.logBehavior);
  const updateLog = useBehaviorStore(state => state.updateLog);
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
  const [startWheelKey, setStartWheelKey] = useState(0);
  const [endWheelKey, setEndWheelKey] = useState(0);
  const notesRef = useRef<import('react-native').TextInput>(null);
  const [notes, setNotes] = useState(String(existingLog?.metadata?.notes ?? ''));
  const [timePickerCollapsed, setTimePickerCollapsed] = useState(true);
  const [xpBursts, setXPBursts] = useState<XPBurst[]>([]);
  const nextXPBurstId = useRef(0);

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
    return buildCalculatedMetadata(metadataFields, behavior.defaultMetadata, Number(amountValue));
  }, [amountField, behavior.defaultMetadata, metadataFields, metadataValues]);

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
      setEndWheelKey(key => key + 1);
    }

    const clampedStartMinutes = Math.min(startMinutes, clampedEndMinutes);
    if (clampedStartMinutes !== startMinutes) {
      setStartMinutes(clampedStartMinutes);
      setStartWheelKey(key => key + 1);
    }
  }, [endMinutes, maxTimeMinutes, startMinutes]);

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, setPending] = useState(false);
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

  const removeXPBurst = useCallback((id: number) => {
    setXPBursts(prev => prev.filter(burst => burst.id !== id));
  }, []);

  const handleCollapseTime = useCallback(() => setTimePickerCollapsed(true), []);
  const handleInputBlur = useCallback(() => {}, []);
  const applyStartMinutes = useCallback(
    (nextMinutes: number) => {
      const clampedMinutes = Math.min(nextMinutes, maxTimeMinutes);
      setStartMinutes(clampedMinutes);
      if (clampedMinutes !== nextMinutes) {
        setStartWheelKey(key => key + 1);
      }
      if (clampedMinutes > endMinutes) {
        setEndMinutes(clampedMinutes);
        setEndWheelKey(key => key + 1);
      }
    },
    [endMinutes, maxTimeMinutes],
  );

  const applyEndMinutes = useCallback(
    (nextMinutes: number) => {
      const clampedMinutes = Math.min(nextMinutes, maxTimeMinutes);
      setEndMinutes(clampedMinutes);
      if (clampedMinutes !== nextMinutes) {
        setEndWheelKey(key => key + 1);
      }
      if (clampedMinutes < startMinutes) {
        setStartMinutes(clampedMinutes);
        setStartWheelKey(key => key + 1);
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
  const logButtonLabel = editLogId ? 'Save' : !showTimeRange && behavior.xpEnabled ? `Log +${XP_PER_LOG} XP` : 'Log';
  const maxTimeHour = Math.floor(maxTimeMinutes / 60);
  const getMaxMinuteForHour = useCallback(
    (hour: number) => (maxTimeHour === hour ? maxTimeMinutes % 60 : 59),
    [maxTimeHour, maxTimeMinutes],
  );

  const handleConfirm = useCallback(
    (event: GestureResponderEvent) => {
      const logHour = showTimeRange ? startHour : endHour;
      const logMinute = showTimeRange ? startMinute : endMinute;
      const rawStartTimestamp = getLogFormTimestamp(
        selectedDate,
        logHour,
        logMinute,
        dayCutoffHour,
        maxTimestampForDate,
      );
      const rawEndTimestamp = getLogFormTimestamp(selectedDate, endHour, endMinute, dayCutoffHour, maxTimestampForDate);
      const endTimestamp = Math.min(rawEndTimestamp, maxTimestampForDate);
      const startTimestamp = Math.min(rawStartTimestamp, endTimestamp);
      const saveEndTimestamp = showTimeRange ? endTimestamp : undefined;

      const metadata: Record<string, string | number> = {};
      if (notes.trim()) metadata.notes = notes.trim();
      const metadataInputFields: MetadataField[] = amountField
        ? [amountField, ...manualMetadataFields]
        : metadataFields;
      for (const field of metadataInputFields) {
        const value = metadataValues[field.key];
        const parsed = Number(value);
        if (value !== undefined && value !== '' && Number.isFinite(parsed)) {
          metadata[field.key] = parsed;
        }
      }
      if (amountField) {
        Object.assign(metadata, calculatedMetadataValues);
        for (const field of calculatedMetadataFields) {
          if (metadata[field.key] != null) continue;
          const value = metadataValues[field.key];
          const parsed = Number(value);
          if (value !== undefined && value !== '' && Number.isFinite(parsed)) {
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

      if (behavior.xpEnabled) {
        const { locationX, locationY } = event.nativeEvent;
        const id = nextXPBurstId.current;
        nextXPBurstId.current += 1;
        setXPBursts(prev => [...prev, { id, x: locationX, y: locationY, xp: earnedXp }]);
      }

      const delay = behavior.xpEnabled ? 1500 : 0;
      if (delay > 0) setPending(true);
      closeTimeoutRef.current = setTimeout(() => {
        setPending(false);
        onSaved();
      }, delay);
    },
    [
      amountField,
      behavior.xpEnabled,
      behaviorId,
      calculatedMetadataFields,
      calculatedMetadataValues,
      editLogId,
      earnedXp,
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
    ],
  );

  const renderTimePicker = useCallback(
    (label: string, hour: number, minute: number, wheelKey: number, applyMinutes: (nextMinutes: number) => void) => (
      <TimePicker
        label={label}
        hour={hour}
        minute={minute}
        maxHour={maxTimeHour}
        maxMinute={getMaxMinuteForHour(hour)}
        wheelKey={wheelKey}
        collapsed={timePickerCollapsed}
        onHourChange={nextHour => applyMinutes(nextHour * 60 + minute)}
        onMinuteChange={nextMinute => applyMinutes(hour * 60 + nextMinute)}
        onExpand={handleExpandTime}
      />
    ),
    [getMaxMinuteForHour, handleExpandTime, maxTimeHour, timePickerCollapsed],
  );

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={styles.flex}
    >
      <View style={styles.fixedTop}>
        <Text style={styles.sectionLabel}>Date</Text>
        <View style={styles.datePickerWrapper}>
          <DatePicker
            selectedDate={selectedDate}
            maxDate={todayStr}
            onSelect={setSelectedDate}
          />
        </View>

        {showTimeRange ? (
          <View style={styles.timePickerRow}>
            <View style={styles.timePickerColumn}>
              {renderTimePicker('Start', startHour, startMinute, startWheelKey, applyStartMinutes)}
            </View>

            <Text style={styles.timePickerSeparator}>-</Text>

            <View style={styles.timePickerColumn}>
              {renderTimePicker('End', endHour, endMinute, endWheelKey, applyEndMinutes)}
            </View>
          </View>
        ) : (
          <View style={styles.singleTimePicker}>
            {renderTimePicker('Time', endHour, endMinute, endWheelKey, applyEndMinutes)}
          </View>
        )}

        {showTimeRange && (
          <View style={styles.durationCard}>
            <Text style={styles.durationLabel}>Duration</Text>
            <Text style={styles.durationValue}>{formatDuration(durationMs)}</Text>
            {behavior.xpEnabled && <Text style={styles.durationHint}>+{earnedXp} XP</Text>}
          </View>
        )}
      </View>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      >
        {metadataFields.length > 0 && <Text style={styles.sectionLabel}>Metadata</Text>}
        {amountField && (
          <MetadataInputRow
            field={amountField}
            value={metadataValues[amountField.key] ?? ''}
            label={formatMetadataFieldLabel(amountField)}
            onChange={setMetadataValues}
            onFocus={handleCollapseTime}
            onBlur={handleInputBlur}
          />
        )}
        {manualMetadataFields.map(field => (
          <MetadataInputRow
            key={field.key}
            field={field}
            value={metadataValues[field.key] ?? ''}
            label={formatMetadataFieldLabel(field)}
            onChange={setMetadataValues}
            onFocus={handleCollapseTime}
            onBlur={handleInputBlur}
          />
        ))}
        <CalculatedMetadataFields
          amountField={amountField}
          defaultMetadata={behavior.defaultMetadata}
          fields={calculatedMetadataFields}
          metadataValues={metadataValues}
          calculatedMetadataValues={calculatedMetadataValues}
        />

        <Text style={styles.sectionLabel}>Notes</Text>
        <TextInput
          ref={notesRef}
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes..."
          placeholderTextColor={Colors.text.dim}
          multiline
          maxLength={500}
          textAlignVertical="top"
          onFocus={handleCollapseTime}
        />
      </ScrollView>
      <Button
        variant="primary"
        fab
        style={styles.logButton}
        onPress={handleConfirm}
        disabled={pending}
        overlay={xpBursts.map(burst => (
          <FloatingXPBurst
            key={burst.id}
            burst={burst}
            onDone={removeXPBurst}
          />
        ))}
      >
        {logButtonLabel}
      </Button>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fixedTop: {
    paddingTop: 6,
    paddingHorizontal: 16,
  },
  datePickerWrapper: {
    marginBottom: 20,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  singleTimePicker: {
    alignSelf: 'center',
    width: '58%',
    minWidth: 170,
  },
  timePickerColumn: {
    flex: 1,
    minWidth: 0,
  },
  timePickerSeparator: {
    color: Colors.text.primary,
    fontSize: 28,
    marginTop: 8,
  },
  sectionLabel: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  durationCard: {
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
    gap: 2,
  },
  durationLabel: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  durationValue: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  durationHint: {
    color: Colors.type.desirable,
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  notesInput: {
    minHeight: 120,
    borderRadius: 12,
    backgroundColor: Colors.bg.card,
    color: Colors.text.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  logButton: {
    bottom: 24,
  },
});
