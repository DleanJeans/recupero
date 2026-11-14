import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSunlightStore } from '../../store/sunlight-store';
import { Colors } from '../../utils/colors';
import { parseDecimalInput } from '../../utils/metadata-calculation-utils';
import { formatLux, getLuxCalibration } from '../../utils/sunlight-utils';
import { Text, TextInput } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';

interface SunlightCalibrationProps {
  /** Calibration in effect now (1 = plain estimate). */
  factor: number;
  /** Calibrated estimate now, if the sun is up and the weather covers this hour. */
  luxNow?: number;
  /** Uncalibrated estimate now, used to work out the factor from a meter reading. */
  rawLuxNow?: number;
}

/** Shows the lux estimate now and lets you match it to a lux meter (held facing up, in the open). */
export function SunlightCalibration({ factor, luxNow, rawLuxNow }: SunlightCalibrationProps) {
  const setFactor = useSunlightStore(state => state.setLuxCalibration);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const reading = parseDecimalInput(text);
  const next = reading != null && rawLuxNow != null ? getLuxCalibration(reading, rawLuxNow) : undefined;

  const save = () => {
    if (next == null) return;
    setFactor(next);
    setEditing(false);
    setText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.labelBox}>
          <Text
            style={styles.label}
            numberOfLines={1}
          >
            {luxNow != null ? `Estimate ${formatLux(luxNow)} now` : 'No estimate right now'}
          </Text>
          {factor !== 1 && <Text style={styles.factor}>{`×${factor.toFixed(2)}`}</Text>}
        </View>
        {factor !== 1 && !editing && (
          <Pressable
            onPress={() => setFactor(1)}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryAction}>Reset</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setEditing(value => !value)}
          disabled={rawLuxNow == null}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={[styles.action, rawLuxNow == null && styles.disabled]}>{editing ? 'Cancel' : 'Calibrate'}</Text>
        </Pressable>
      </View>
      {editing && rawLuxNow != null && (
        <View style={styles.editRow}>
          <Text style={styles.prompt}>Your meter, facing up, reads</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            onSubmitEditing={save}
            keyboardType="decimal-pad"
            placeholder="4500"
            placeholderTextColor={Colors.text.dim}
            autoFocus
          />
          <Text style={styles.prompt}>lux</Text>
          <Pressable
            onPress={save}
            disabled={next == null}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={[styles.action, next == null && styles.disabled]}>Save</Text>
          </Pressable>
        </View>
      )}
      {editing && rawLuxNow != null && (
        <Text style={styles.hint}>
          {next != null
            ? `Scales estimates by ×${next.toFixed(2)} from now on; earlier time keeps its old calibration (weather says ${formatLux(rawLuxNow)} right now).`
            : `The weather says ${formatLux(rawLuxNow)} right now. Hold the meter flat, facing the sky, away from shade.`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  labelBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    flexShrink: 1,
    color: Colors.text.secondary,
    fontSize: 13,
  },
  factor: {
    color: SUNLIGHT_COLOR,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  action: {
    color: SUNLIGHT_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    color: Colors.text.light,
    fontSize: 13,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prompt: {
    color: Colors.text.muted,
    fontSize: 13,
  },
  input: {
    minWidth: 72,
    textAlign: 'right',
    color: Colors.text.primary,
    backgroundColor: Colors.bg.input,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
  },
  hint: {
    color: Colors.text.faint,
    fontSize: 11,
    lineHeight: 15,
  },
});
