import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import {
  applyStackPreset,
  DEFAULT_LAYER,
  MAX_STACK_LAYERS,
  presetLayer,
  STACK_PRESETS,
  type StackLayer,
  stackIcon,
  toStackLayers,
} from '../../utils/icon-utils';
import { Button } from '../button';
import { Text } from '../text';
import { EmojiGrid } from './emoji-grid';
import { IconSlider } from './icon-slider';
import { StackCanvas } from './stack-canvas';

interface Props {
  value: string;
  onUse: (value: string) => void;
}

/** Picking an emoji either adds a layer or replaces the selected layer's emoji. */
type Mode = 'edit' | 'add' | 'replace';

const CANVAS = 180;

const percent = (n: number) => `${Math.round(n * 100)}%`;
const degrees = (n: number) => `${Math.round(n)}°`;

/** Stacked emoji: up to 4 layers placed by size, distance from the centre, direction and rotation. */
export function StackPanel({ value, onUse }: Props) {
  const [layers, setLayers] = useState<StackLayer[]>(() => toStackLayers(value));
  const [selected, setSelected] = useState(() => Math.max(0, layers.length - 1));
  const [mode, setMode] = useState<Mode>(layers.length === 0 ? 'add' : 'edit');
  const layer = layers[selected];

  const update = (changes: Partial<StackLayer>) =>
    setLayers(current => current.map((item, i) => (i === selected ? { ...item, ...changes } : item)));

  const pick = (emoji: string) => {
    if (mode === 'replace' && layer) {
      update({ emoji });
    } else {
      const added = layers.length === 0 ? { ...DEFAULT_LAYER, emoji } : presetLayer('badge', emoji);
      setLayers([...layers, added]);
      setSelected(layers.length);
    }
    setMode('edit');
  };

  const moveLayer = (by: number) => {
    const target = selected + by;
    if (target < 0 || target >= layers.length) return;
    const next = [...layers];
    [next[selected], next[target]] = [next[target], next[selected]];
    setLayers(next);
    setSelected(target);
  };

  const removeLayer = () => {
    const next = layers.filter((_, i) => i !== selected);
    setLayers(next);
    setSelected(Math.max(0, selected - 1));
    if (next.length === 0) setMode('add');
  };

  const handleChipPress = (i: number) => {
    if (i === selected && mode === 'edit') {
      setMode('replace');
    } else {
      setSelected(i);
      setMode('edit');
    }
  };

  return (
    <View style={styles.panel}>
      <StackCanvas
        layers={layers}
        selected={selected}
        size={CANVAS}
        onMove={polar => layer && update(polar)}
      />

      <View style={styles.layers}>
        {layers.map((item, i) => (
          <Pressable
            // biome-ignore lint/suspicious/noArrayIndexKey: a layer is identified by its position
            key={i}
            style={[styles.chip, i === selected && styles.chipOn]}
            onPress={() => handleChipPress(i)}
            accessibilityLabel={i === selected ? `Change emoji of layer ${i + 1}` : `Select layer ${i + 1}`}
          >
            <Text style={styles.chipEmoji}>{item.emoji}</Text>
            <Text style={styles.chipNumber}>{i + 1}</Text>
          </Pressable>
        ))}
        {layers.length < MAX_STACK_LAYERS && (
          <Pressable
            style={[styles.chip, styles.chipAdd, mode === 'add' && styles.chipOn]}
            onPress={() => setMode(mode === 'add' && layers.length > 0 ? 'edit' : 'add')}
            accessibilityLabel="Add a layer"
          >
            <Ionicons
              name="add"
              size={18}
              color={Colors.text.muted}
            />
          </Pressable>
        )}
        {layer && mode === 'edit' && (
          <View style={styles.tools}>
            <Button
              variant="icon"
              onPress={() => moveLayer(1)}
              disabled={selected >= layers.length - 1}
              accessibilityLabel="Bring forward"
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={Colors.text.light}
              />
            </Button>
            <Button
              variant="icon"
              onPress={() => moveLayer(-1)}
              disabled={selected === 0}
              accessibilityLabel="Send backward"
            >
              <Ionicons
                name="arrow-down"
                size={18}
                color={Colors.text.light}
              />
            </Button>
            <Button
              variant="icon"
              onPress={() => update({ mirror: !layer.mirror })}
              accessibilityLabel="Mirror"
            >
              <Ionicons
                name="swap-horizontal"
                size={18}
                color={layer.mirror ? Colors.cooldown.yellow : Colors.text.light}
              />
            </Button>
            <Button
              variant="icon"
              onPress={removeLayer}
              accessibilityLabel="Remove layer"
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={Colors.text.light}
              />
            </Button>
          </View>
        )}
      </View>

      {mode === 'edit' && layer ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.controls}
        >
          {layers.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presets}
            >
              {STACK_PRESETS.map(preset => (
                <Pressable
                  key={preset.id}
                  style={({ pressed }) => [styles.preset, pressed && styles.pressed]}
                  onPress={() => setLayers(applyStackPreset(layers, preset.id))}
                >
                  <Text style={styles.presetLabel}>{preset.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <IconSlider
            label="Size"
            value={layer.size}
            min={0.2}
            max={1.5}
            step={0.01}
            format={percent}
            onChange={size => update({ size })}
          />
          <IconSlider
            label="Distance"
            value={layer.distance}
            min={0}
            max={1}
            step={0.01}
            format={percent}
            onChange={distance => update({ distance })}
          />
          <IconSlider
            label="Direction"
            value={layer.direction}
            min={0}
            max={359}
            step={1}
            format={degrees}
            onChange={direction => update({ direction })}
          />
          <IconSlider
            label="Rotate"
            value={layer.rotation}
            min={-180}
            max={180}
            step={1}
            format={degrees}
            onChange={rotation => update({ rotation })}
          />
          <IconSlider
            label="Opacity"
            value={layer.opacity}
            min={0.1}
            max={1}
            step={0.01}
            format={percent}
            onChange={opacity => update({ opacity })}
          />
        </ScrollView>
      ) : (
        <>
          <Text style={styles.hint}>
            {mode === 'replace'
              ? `Pick a new emoji for layer ${selected + 1}`
              : `Pick an emoji for layer ${layers.length + 1}`}
          </Text>
          <EmojiGrid onPick={pick} />
        </>
      )}

      <Button
        variant="primary"
        disabled={layers.length === 0}
        onPress={() => onUse(stackIcon(layers))}
      >
        Use this stack
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, gap: 8 },
  flex: { flex: 1 },
  layers: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.bg.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { borderWidth: 2, borderColor: Colors.cooldown.yellow },
  chipAdd: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.border.light },
  chipEmoji: { fontSize: 20 },
  chipNumber: { position: 'absolute', top: -2, left: 2, color: Colors.text.muted, fontSize: 9 },
  tools: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' },
  controls: { gap: 4, paddingBottom: 4 },
  presets: { gap: 6, paddingBottom: 4 },
  preset: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.input,
  },
  presetLabel: { color: Colors.text.secondary, fontSize: 12 },
  hint: { color: Colors.text.muted, fontSize: 12, textAlign: 'center' },
  pressed: { opacity: 0.6 },
});
