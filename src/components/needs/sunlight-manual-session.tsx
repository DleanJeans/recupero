import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSunlightStore } from '../../store/sunlight-store';
import type { SunlightManualSession } from '../../types/sunlight';
import { Colors } from '../../utils/colors';
import { parseDecimalInput } from '../../utils/metadata-calculation-utils';
import { DEFAULT_MANUAL_LUX, formatLux, getManualLuxFromText, MANUAL_LUX_PRESETS } from '../../utils/sunlight-utils';
import { formatTime } from '../../utils/time-utils';
import { Text, TextInput } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';

interface SunlightManualSessionProps {
  /** The manual session running now, if any. */
  session?: SunlightManualSession;
}

/** Start or stop a session by hand at a lux level you pick: for sitting outside while the phone says you're at a place. */
export function SunlightManualSession({ session }: SunlightManualSessionProps) {
  const start = useSunlightStore(state => state.startManualSession);
  const stop = useSunlightStore(state => state.stopManualSession);
  const [lux, setLux] = useState(DEFAULT_MANUAL_LUX);
  const [custom, setCustom] = useState('');

  const pick = (value: number) => {
    setLux(value);
    setCustom('');
  };
  const changeCustom = (text: string) => {
    setCustom(text);
    const parsed = getManualLuxFromText(parseDecimalInput(text));
    if (parsed != null) setLux(parsed);
  };

  if (session) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.title}>Manual session running</Text>
            <Text style={styles.detail}>{`Since ${formatTime(session.start)} · ${formatLux(session.lux)}`}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.button, styles.stopButton, pressed && styles.pressed]}
            onPress={stop}
            accessibilityRole="button"
          >
            <Text style={styles.stopText}>Stop</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Manual session</Text>
      <Text style={styles.detail}>
        Sitting outside or on a balcony while the app thinks you're indoors? Pick how bright it is and start.
      </Text>
      <View style={styles.chips}>
        {MANUAL_LUX_PRESETS.map(preset => (
          <Pressable
            key={preset}
            style={({ pressed }) => [
              styles.chip,
              lux === preset && custom === '' && styles.chipOn,
              pressed && styles.pressed,
            ]}
            onPress={() => pick(preset)}
            accessibilityRole="button"
            accessibilityState={{ selected: lux === preset && custom === '' }}
          >
            <Text style={[styles.chipText, lux === preset && custom === '' && styles.chipTextOn]}>
              {formatLux(preset).replace('~', '')}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <Text style={styles.detail}>or</Text>
        <TextInput
          style={styles.input}
          value={custom}
          onChangeText={changeCustom}
          keyboardType="decimal-pad"
          placeholder="lux"
          placeholderTextColor={Colors.text.dim}
        />
        <View style={styles.info} />
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => start(lux)}
          accessibilityRole="button"
        >
          <Text style={styles.startText}>{`Start · ${formatLux(lux)}`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  detail: {
    color: Colors.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.text.dim,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipOn: {
    borderColor: SUNLIGHT_COLOR,
  },
  chipText: {
    color: Colors.text.muted,
    fontSize: 13,
  },
  chipTextOn: {
    color: Colors.text.primary,
  },
  input: {
    minWidth: 80,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    textAlign: 'right',
  },
  button: {
    backgroundColor: SUNLIGHT_COLOR,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stopButton: {
    backgroundColor: Colors.status.error,
  },
  startText: {
    color: '#1a1300',
    fontSize: 13,
    fontWeight: '700',
  },
  stopText: {
    color: Colors.status.dangerLight,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
