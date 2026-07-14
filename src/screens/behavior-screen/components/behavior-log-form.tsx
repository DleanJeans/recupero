import React from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { DatePicker } from '../../../components/date-picker';
import { Text, TextInput } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { formatMetadataFieldLabel, getMetadataFieldCalculation } from '../../../utils/metadata-calculation-utils';
import { formatDuration } from '../../../utils/time-utils';
import { CalculatedMetadataFields } from './calculated-metadata-fields';
import { MetadataInputRow } from './metadata-input-row';
import type { BehaviorLogFormModel } from './use-behavior-log-form';

interface Props {
  form: BehaviorLogFormModel;
}

export function BehaviorLogForm({ form }: Props) {
  const {
    applyEndSeconds,
    applyStartSeconds,
    behavior,
    amountField,
    calculatedMetadataValues,
    durationMs,
    endHour,
    endMinute,
    endSecond,
    handleCollapseTime,
    handleInputBlur,
    metadataFields,
    metadataValues,
    notes,
    notesRef,
    progressByField,
    renderTimePicker,
    selectedDate,
    setMetadataValues,
    setNotes,
    setSelectedDate,
    showTimeRange,
    showSeconds,
    startHour,
    startMinute,
    startSecond,
    todayStr,
  } = form;

  return (
    <View style={styles.flex}>
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
                {renderTimePicker('Start', startHour, startMinute, startSecond, applyStartSeconds)}
              </View>

              <Text style={styles.timePickerSeparator}>-</Text>

              <View style={styles.timePickerColumn}>
                {renderTimePicker('End', endHour, endMinute, endSecond, applyEndSeconds)}
              </View>
            </View>
          ) : (
            <View style={styles.singleTimePicker}>
              {renderTimePicker('Time', endHour, endMinute, endSecond, applyEndSeconds)}
            </View>
          )}

          {showTimeRange && (
            <View style={styles.durationCard}>
              <Text style={styles.durationLabel}>Duration</Text>
              <Text style={styles.durationValue}>{formatDuration(durationMs, showSeconds)}</Text>
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
          {metadataFields.map(field => {
            if (getMetadataFieldCalculation(field) === 'amount' && field.key !== amountField?.key) {
              return null;
            }

            return getMetadataFieldCalculation(field) === 'per100' ? (
              <CalculatedMetadataFields
                key={field.key}
                amountField={amountField}
                defaultMetadata={behavior.defaultMetadata}
                fields={[field]}
                metadataValues={metadataValues}
                calculatedMetadataValues={calculatedMetadataValues}
                progressByField={progressByField}
              />
            ) : (
              <MetadataInputRow
                key={field.key}
                field={field}
                value={metadataValues[field.key] ?? ''}
                label={formatMetadataFieldLabel(field)}
                onChange={setMetadataValues}
                onFocus={handleCollapseTime}
                onBlur={handleInputBlur}
                progress={progressByField[field.key]}
              />
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
            onFocus={handleCollapseTime}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
});
