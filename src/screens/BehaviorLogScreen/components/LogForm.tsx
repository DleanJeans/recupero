import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type GestureResponderEvent, Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/Button';
import { CheckboxRow } from '../../../components/CheckboxRow';
import { DatePicker } from '../../../components/DatePicker';
import { Text, TextInput } from '../../../components/Text';
import { useBehaviorStore } from '../../../store/behaviorStore';
import { useSettingsStore } from '../../../store/settingsStore';
import type { BehaviorEntry, MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { timestampForDateTime, toDateString } from '../../../utils/dateUtils';
import { getDayMaxTimestamp, getDefaultTimedLogStartTimestamp } from '../../../utils/logUtils';
import {
  buildCalculatedMetadata,
  formatMetadataFieldLabel,
  formatMetadataRateUnit,
  getCalculatedMetadataFields,
  getManualMetadataFields,
  getSelectedAmountMetadataField,
} from '../../../utils/metadataCalculationUtils';
import { formatDuration, MS_PER_MINUTE } from '../../../utils/timeUtils';
import { XP_PER_LOG } from '../../../utils/xpUtils';
import { FloatingXpBurst, type XpBurst } from './FloatingXpBurst';
import { MetadataInputRow, metadataInputRowStyles } from './MetadataInputRow';
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
  const [showTimeRange, setShowTimeRange] = useState(hasTimerRange || existingLog?.endTimestamp != null);
  const [startWheelKey, setStartWheelKey] = useState(0);
  const [endWheelKey, setEndWheelKey] = useState(0);
  const notesRef = useRef<import('react-native').TextInput>(null);
  const [notes, setNotes] = useState(String(existingLog?.metadata?.notes ?? ''));
  const [notesFocused, setNotesFocused] = useState(false);
  const [metadataFocused, setMetadataFocused] = useState(false);
  const [xpBursts, setXpBursts] = useState<XpBurst[]>([]);
  const nextXpBurstId = useRef(0);

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
    return date.getHours() * 60 + date.getMinutes();
  }, [maxTimestampForDate, selectedDate, todayStr]);

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
    setNotesFocused(false);
  }, []);

  const removeXpBurst = useCallback((id: number) => {
    setXpBursts(prev => prev.filter(burst => burst.id !== id));
  }, []);

  const handleMetadataFocus = useCallback(() => setMetadataFocused(true), []);
  const handleMetadataBlur = useCallback(() => setMetadataFocused(false), []);
  const handleNotesFocus = useCallback(() => setNotesFocused(true), []);
  const handleNotesBlur = useCallback(() => setNotesFocused(false), []);
  const handleToggleTimeRange = useCallback(() => {
    setShowTimeRange(current => {
      const next = !current;
      if (next && endMinutes <= startMinutes) {
        setStartMinutes(Math.max(0, endMinutes - XP_PER_LOG));
        setStartWheelKey(key => key + 1);
      }
      return next;
    });
  }, [endMinutes, startMinutes]);

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

  const handleConfirm = useCallback(
    (event: GestureResponderEvent) => {
      const logHour = showTimeRange ? startHour : endHour;
      const logMinute = showTimeRange ? startMinute : endMinute;
      const rawStartTimestamp = timestampForDateTime(selectedDate, logHour, logMinute, dayCutoffHour);
      const rawEndTimestamp = timestampForDateTime(selectedDate, endHour, endMinute, dayCutoffHour);
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
        const id = nextXpBurstId.current;
        nextXpBurstId.current += 1;
        setXpBursts(prev => [...prev, { id, x: locationX, y: locationY, xp: earnedXp }]);
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

        {!hasTimerRange && (
          <CheckboxRow
            label="Track duration for XP"
            checked={showTimeRange}
            onToggle={handleToggleTimeRange}
            variant="row"
            style={styles.timeRangeToggle}
          />
        )}

        {showTimeRange ? (
          <View style={styles.timePickerRow}>
            <View style={styles.timePickerColumn}>
              <TimePicker
                label="Start"
                hour={startHour}
                minute={startMinute}
                maxHour={Math.floor(maxTimeMinutes / 60)}
                maxMinute={Math.floor(maxTimeMinutes / 60) === startHour ? maxTimeMinutes % 60 : 59}
                wheelKey={startWheelKey}
                collapsed={notesFocused || metadataFocused}
                onHourChange={hour => applyStartMinutes(hour * 60 + startMinute)}
                onMinuteChange={minute => applyStartMinutes(startHour * 60 + minute)}
                onExpand={handleExpandTime}
              />
            </View>

            <Text style={styles.timePickerSeparator}>-</Text>

            <View style={styles.timePickerColumn}>
              <TimePicker
                label="End"
                hour={endHour}
                minute={endMinute}
                maxHour={Math.floor(maxTimeMinutes / 60)}
                maxMinute={Math.floor(maxTimeMinutes / 60) === endHour ? maxTimeMinutes % 60 : 59}
                wheelKey={endWheelKey}
                collapsed={notesFocused || metadataFocused}
                onHourChange={hour => applyEndMinutes(hour * 60 + endMinute)}
                onMinuteChange={minute => applyEndMinutes(endHour * 60 + minute)}
                onExpand={handleExpandTime}
              />
            </View>
          </View>
        ) : (
          <View style={styles.singleTimePicker}>
            <TimePicker
              label="Time"
              hour={endHour}
              minute={endMinute}
              maxHour={Math.floor(maxTimeMinutes / 60)}
              maxMinute={Math.floor(maxTimeMinutes / 60) === endHour ? maxTimeMinutes % 60 : 59}
              wheelKey={endWheelKey}
              collapsed={notesFocused || metadataFocused}
              onHourChange={hour => applyEndMinutes(hour * 60 + endMinute)}
              onMinuteChange={minute => applyEndMinutes(endHour * 60 + minute)}
              onExpand={handleExpandTime}
            />
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
            onFocus={handleMetadataFocus}
            onBlur={handleMetadataBlur}
          />
        )}
        {manualMetadataFields.map(field => (
          <MetadataInputRow
            key={field.key}
            field={field}
            value={metadataValues[field.key] ?? ''}
            label={formatMetadataFieldLabel(field)}
            onChange={setMetadataValues}
            onFocus={handleMetadataFocus}
            onBlur={handleMetadataBlur}
          />
        ))}
        {calculatedMetadataFields.map(field => {
          const value = calculatedMetadataValues[field.key];
          const existingValue = metadataValues[field.key];
          const displayValue = value != null ? String(value) : (existingValue ?? '');
          return (
            <View
              key={field.key}
              style={[styles.metadataFieldRow, styles.metadataCalculatedRow]}
            >
              <Text style={styles.metadataFieldLabel}>{formatMetadataFieldLabel(field)}</Text>
              <View style={styles.metadataCalculatedValueRow}>
                <Text style={styles.metadataCalculatedValue}>{displayValue || '0'}</Text>
                <Text style={styles.metadataCalculatedRate}>
                  {behavior.defaultMetadata?.[field.key] ?? 0} {formatMetadataRateUnit(field, amountField)}
                </Text>
              </View>
            </View>
          );
        })}

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
          onFocus={handleNotesFocus}
          onBlur={handleNotesBlur}
        />
      </ScrollView>
      <Button
        variant="primary"
        fab
        style={styles.logButton}
        onPress={handleConfirm}
        disabled={pending}
        overlay={xpBursts.map(burst => (
          <FloatingXpBurst
            key={burst.id}
            burst={burst}
            onDone={removeXpBurst}
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
  timeRangeToggle: {
    marginBottom: 8,
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
    gap: 10,
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
  metadataFieldRow: {
    ...metadataInputRowStyles.metadataFieldRow,
  },
  metadataFieldLabel: {
    ...metadataInputRowStyles.metadataFieldLabel,
  },
  metadataCalculatedRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border.default,
  },
  metadataCalculatedValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  metadataCalculatedValue: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metadataCalculatedRate: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  logButton: {
    bottom: 24,
  },
});
