import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { hexToColor, hexToHsl, hslToHex, normalizeHex } from '../../utils/hex-color-utils';
import { DEFAULT_CLEAR_TOLERANCE, type ImageClear } from '../../utils/icon-utils';
import { Text, TextInput } from '../text';
import { IconSlider } from './icon-slider';

interface Props {
  /** Undefined = the picture keeps its own background. */
  value: ImageClear | undefined;
  onChange: (clear: ImageClear | undefined) => void;
}

const PRESETS = ['ffffff', '000000'];
const START_CUSTOM = 'f9a825';

const degrees = (n: number) => `${Math.round(n)}`;
const percent = (n: number) => `${Math.round(n)}%`;

/** Replaces the colour along the picture's edges (e.g. the white behind a product photo) with transparent or another
 *  colour. The same colour inside the subject is left alone. */
export function BackgroundClearPicker({ value, onChange }: Props) {
  const fill = value?.fill;
  const isCustom = fill != null && !PRESETS.includes(fill);
  const [open, setOpen] = useState(isCustom);
  const [hexText, setHexText] = useState(fill ?? START_CUSTOM);
  const current = fill ?? START_CUSTOM;
  const hsl = hexToHsl(current);
  const tolerance = value?.tolerance ?? DEFAULT_CLEAR_TOLERANCE;

  const choose = (next: string | undefined) => onChange({ tolerance, fill: next });

  const setHsl = (change: Partial<typeof hsl>) => {
    const hex = hslToHex({ ...hsl, ...change });
    setHexText(hex);
    choose(hex);
  };

  const submitHex = () => {
    const hex = normalizeHex(hexText)?.slice(0, 6);
    if (hex) {
      setHexText(hex);
      choose(hex);
    } else {
      setHexText(current);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Replace the picture's own background with</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange(undefined)}
          style={[styles.swatch, value == null && styles.selected]}
          accessibilityLabel="Keep the picture's background"
        >
          <Text style={styles.offX}>✕</Text>
        </Pressable>
        <Pressable
          onPress={() => choose(undefined)}
          style={[styles.swatch, value != null && fill == null && styles.selected]}
          accessibilityLabel="Make the background transparent"
        >
          <View style={styles.checkerA} />
          <View style={styles.checkerB} />
          <View style={[styles.checkerB, styles.checkerC]} />
        </Pressable>
        {PRESETS.map(hex => (
          <Pressable
            key={hex}
            onPress={() => {
              setHexText(hex);
              choose(hex);
            }}
            style={[styles.swatch, { backgroundColor: hexToColor(hex) }, fill === hex && styles.selected]}
            accessibilityLabel={hex === 'ffffff' ? 'White background' : 'Black background'}
          />
        ))}
        <Pressable
          onPress={() => {
            setOpen(!open);
            if (!isCustom) choose(current);
          }}
          style={[
            styles.swatch,
            styles.custom,
            { backgroundColor: hexToColor(isCustom ? current : START_CUSTOM) },
            isCustom && styles.selected,
          ]}
          accessibilityLabel="Custom background colour"
        >
          <Text style={styles.customLabel}>+</Text>
        </Pressable>
      </View>
      {value != null && (
        <>
          <IconSlider
            label="Amount"
            value={tolerance}
            min={0}
            max={100}
            step={5}
            stepper
            format={percent}
            onChange={next => onChange({ ...value, tolerance: next })}
          />
          <Text style={styles.hint}>
            Takes out the colour along the picture's edges. The same colour inside the subject stays. Raise the amount
            if some of the background is left.
          </Text>
        </>
      )}
      {open && isCustom && (
        <View style={styles.picker}>
          <IconSlider
            label="Hue"
            value={hsl.h}
            min={0}
            max={359}
            step={1}
            format={degrees}
            onChange={h => setHsl({ h })}
          />
          <IconSlider
            label="Saturation"
            value={hsl.s}
            min={0}
            max={100}
            step={1}
            format={percent}
            onChange={s => setHsl({ s })}
          />
          <IconSlider
            label="Lightness"
            value={hsl.l}
            min={0}
            max={100}
            step={1}
            format={percent}
            onChange={l => setHsl({ l })}
          />
          <View style={styles.hexRow}>
            <Text style={styles.label}>Hex #</Text>
            <TextInput
              style={styles.hexInput}
              value={hexText}
              onChangeText={setHexText}
              onEndEditing={submitHex}
              onSubmitEditing={submitHex}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={6}
              placeholderTextColor={Colors.text.faint}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const SWATCH = 34;

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  hint: { color: Colors.text.faint, fontSize: 11, lineHeight: 15 },
  offX: { color: Colors.text.light, fontSize: 16, fontWeight: '700' },
  label: { color: Colors.text.muted, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.dim,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { borderWidth: 2, borderColor: Colors.cooldown.yellow },
  // A two-tone checker marks "transparent".
  checkerA: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#ddd' },
  checkerB: {
    position: 'absolute',
    width: SWATCH / 2,
    height: SWATCH / 2,
    top: 0,
    left: 0,
    backgroundColor: '#888',
  },
  checkerC: { top: SWATCH / 2, left: SWATCH / 2 },
  custom: { borderStyle: 'dashed' },
  customLabel: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  picker: { gap: 2 },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hexInput: {
    flex: 1,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
  },
});
