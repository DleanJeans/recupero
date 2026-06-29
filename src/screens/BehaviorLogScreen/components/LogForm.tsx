import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type GestureResponderEvent, Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/Button';
import { DatePicker } from '../../../components/DatePicker';
import { Text, TextInput } from '../../../components/Text';
import { useBehaviorStore } from '../../../store/behaviorStore';
import type { BehaviorEntry, MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { toDateString } from '../../../utils/dateUtils';
import {
  buildCalculatedMetadata,
  formatMetadataFieldLabel,
  formatMetadataRateUnit,
  getCalculatedMetadataFields,
  getManualMetadataFields,
  getSelectedAmountMetadataField,
} from '../../../utils/metadataCalculationUtils';
import { FloatingXpBurst, type XpBurst } from './FloatingXpBurst';
import { MetadataInputRow, metadataInputRowStyles } from './MetadataInputRow';
import { TimePicker } from './TimePicker';

interface LogFormProps {
  behaviorId: string;
  behavior: BehaviorEntry;
  editLogId?: string;
  editTimestamp?: number;
  editNotes: string;
  onSaved: () => void;
}

export function LogForm({ behaviorId, behavior, editLogId, editTimestamp, editNotes, onSaved }: LogFormProps) {
  const category = useBehaviorStore(
    useCallback(
      state => (behavior.categoryId ? state.categories.find(c => c.id === behavior.categoryId) : undefined),
      [behavior.categoryId],
    ),
  );
  const logBehavior = useBehaviorStore(state => state.logBehavior);
  const updateLog = useBehaviorStore(state => state.updateLog);

  const nowRef = useRef(new Date());
  const todayStr = toDateString(nowRef.current);

  const initialDate = editTimestamp ? toDateString(new Date(editTimestamp)) : todayStr;
  const initialHour = editTimestamp ? new Date(editTimestamp).getHours() : nowRef.current.getHours();
  const initialMinute = editTimestamp ? new Date(editTimestamp).getMinutes() : nowRef.current.getMinutes();

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [wheelKey, setWheelKey] = useState(0);
  const notesRef = useRef<import('react-native').TextInput>(null);
  const [notes, setNotes] = useState(editNotes);
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
    const vals: Record<string, string> = {};
    if (editLogId) {
      const existingLog = behavior.logs.find(l => l.id === editLogId);
      if (existingLog?.metadata) {
        for (const field of metadataFields) {
          const v = existingLog.metadata[field.key];
          if (v != null) vals[field.key] = String(v);
        }
      }
    } else if (behavior.defaultMetadata) {
      for (const field of manualMetadataFields) {
        const v = behavior.defaultMetadata[field.key];
        if (v != null) vals[field.key] = String(v);
      }
    }
    return vals;
  });
  const calculatedMetadataValues = useMemo(() => {
    if (!amountField) return {};
    const amountValue = metadataValues[amountField.key];
    if (amountValue === undefined || amountValue === '') return {};
    return buildCalculatedMetadata(metadataFields, behavior.defaultMetadata, Number(amountValue));
  }, [amountField, behavior.defaultMetadata, metadataFields, metadataValues]);

  const isToday = selectedDate === todayStr;
  const maxHour = isToday ? nowRef.current.getHours() : 23;
  const maxMinute = isToday && hour === nowRef.current.getHours() ? nowRef.current.getMinutes() : 59;

  useEffect(() => {
    if (hour > maxHour) setHour(maxHour);
  }, [maxHour, hour]);

  useEffect(() => {
    if (minute > maxMinute) setMinute(maxMinute);
  }, [maxMinute, minute]);

  useEffect(() => {
    const n = editTimestamp ? new Date(editTimestamp) : new Date();
    nowRef.current = new Date();
    setSelectedDate(toDateString(n));
    setHour(n.getHours());
    setMinute(n.getMinutes());
    setWheelKey(k => k + 1);
  }, [editTimestamp]);

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

  const handleConfirm = useCallback(
    (event: GestureResponderEvent) => {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const ts = new Date(y, m - 1, d, hour, minute, 0, 0).getTime();
      const metadata: Record<string, string | number> = {};
      if (notes.trim()) metadata.notes = notes.trim();
      const metadataInputFields: MetadataField[] = amountField
        ? [amountField, ...manualMetadataFields]
        : metadataFields;
      for (const field of metadataInputFields) {
        const val = metadataValues[field.key];
        const parsed = Number(val);
        if (val !== undefined && val !== '' && Number.isFinite(parsed)) {
          metadata[field.key] = parsed;
        }
      }
      if (amountField) {
        Object.assign(metadata, calculatedMetadataValues);
        for (const field of calculatedMetadataFields) {
          if (metadata[field.key] != null) continue;
          const val = metadataValues[field.key];
          const parsed = Number(val);
          if (val !== undefined && val !== '' && Number.isFinite(parsed)) {
            metadata[field.key] = parsed;
          }
        }
      }
      const metadataOrUndefined = Object.keys(metadata).length > 0 ? metadata : undefined;

      if (editLogId) {
        updateLog(behaviorId, editLogId, ts, metadataOrUndefined);
        onSaved();
        return;
      }

      logBehavior(behaviorId, ts, metadataOrUndefined);

      if (behavior.xpEnabled) {
        const { locationX, locationY } = event.nativeEvent;
        const id = nextXpBurstId.current;
        nextXpBurstId.current += 1;
        setXpBursts(prev => [...prev, { id, x: locationX, y: locationY }]);
      }

      const delay = behavior.xpEnabled ? 1500 : 0;
      if (delay > 0) setPending(true);
      closeTimeoutRef.current = setTimeout(() => {
        setPending(false);
        onSaved();
      }, delay);
    },
    [
      selectedDate,
      hour,
      minute,
      notes,
      metadataValues,
      metadataFields,
      amountField,
      manualMetadataFields,
      calculatedMetadataFields,
      calculatedMetadataValues,
      editLogId,
      behaviorId,
      behavior.xpEnabled,
      logBehavior,
      updateLog,
      onSaved,
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

        <TimePicker
          hour={hour}
          minute={minute}
          maxHour={maxHour}
          maxMinute={maxMinute}
          wheelKey={wheelKey}
          collapsed={notesFocused || metadataFocused}
          onHourChange={setHour}
          onMinuteChange={setMinute}
          onExpand={handleExpandTime}
        />
      </View>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {metadataFields.length > 0 && <Text style={styles.sectionLabel}>Metadata</Text>}
        {amountField && (
          <MetadataInputRow
            field={amountField}
            value={metadataValues[amountField.key] ?? ''}
            label={formatMetadataFieldLabel(amountField)}
            onChange={setMetadataValues}
            onFocus={() => setMetadataFocused(true)}
            onBlur={() => setMetadataFocused(false)}
          />
        )}
        {manualMetadataFields.map(field => (
          <MetadataInputRow
            key={field.key}
            field={field}
            value={metadataValues[field.key] ?? ''}
            label={formatMetadataFieldLabel(field)}
            onChange={setMetadataValues}
            onFocus={() => setMetadataFocused(true)}
            onBlur={() => setMetadataFocused(false)}
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
          onFocus={() => setNotesFocused(true)}
          onBlur={() => setNotesFocused(false)}
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
        {editLogId ? 'Save' : 'Log'}
      </Button>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  fixedTop: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  datePickerWrapper: { marginBottom: 20 },
  sectionLabel: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
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
  notesInput: {
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text.primary,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 16,
    lineHeight: 22,
  },
  logButton: { bottom: 16 },
});
