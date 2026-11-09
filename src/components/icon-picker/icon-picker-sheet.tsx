import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { parseIcon } from '../../utils/icon-utils';
import { CueSegmentedControl } from '../cues/cue-segmented-control';
import { Text } from '../text';
import { EmojiGrid } from './emoji-grid';
import { ImagePanel } from './image-panel';
import { KitchenPanel } from './kitchen-panel';
import { StackPanel } from './stack-panel';

type Tab = 'emoji' | 'mix' | 'image';
type MixMode = 'kitchen' | 'stack';

const TABS: { value: Tab; label: string }[] = [
  { value: 'emoji', label: 'Emoji' },
  { value: 'mix', label: 'Mix' },
  { value: 'image', label: 'Image' },
];

const MIX_MODES: { value: MixMode; label: string }[] = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'stack', label: 'Stack' },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

function initialTabs(value: string): { tab: Tab; mixMode: MixMode } {
  const kind = parseIcon(value).kind;
  if (kind === 'image') return { tab: 'image', mixMode: 'kitchen' };
  if (kind === 'mix') return { tab: 'mix', mixMode: 'kitchen' };
  if (kind === 'stack') return { tab: 'mix', mixMode: 'stack' };
  return { tab: 'emoji', mixMode: 'kitchen' };
}

/** Bottom sheet for any icon: a plain emoji, an Emoji Kitchen mix, stacked emoji, or an image link. */
export function IconPickerSheet({ value, onChange, onClose }: Props) {
  const { height } = useWindowDimensions();
  const [{ tab, mixMode }, setTabs] = useState(() => initialTabs(value));

  const use = (next: string) => {
    onChange(next);
    onClose();
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close icon picker"
        />
        <View style={[styles.sheet, { height: Math.round(height * 0.82) }]}>
          <View style={styles.knob} />
          <View style={styles.header}>
            <View style={styles.flex}>
              <CueSegmentedControl
                value={tab}
                options={TABS}
                onChange={next => setTabs(current => ({ ...current, tab: next }))}
              />
            </View>
            {value !== '' && (
              <Pressable
                style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                onPress={() => use('')}
                accessibilityLabel="Remove icon"
              >
                <Text style={styles.removeLabel}>Remove</Text>
              </Pressable>
            )}
          </View>
          {tab === 'mix' && (
            <View style={styles.mixModes}>
              {MIX_MODES.map(mode => (
                <Pressable
                  key={mode.value}
                  style={[styles.mixMode, mode.value === mixMode && styles.mixModeOn]}
                  onPress={() => setTabs(current => ({ ...current, mixMode: mode.value }))}
                  accessibilityState={{ selected: mode.value === mixMode }}
                >
                  <Text style={[styles.mixModeLabel, mode.value === mixMode && styles.mixModeLabelOn]}>
                    {mode.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.flex}>
            {tab === 'emoji' && <EmojiGrid onPick={use} />}
            {tab === 'mix' && mixMode === 'kitchen' && (
              <KitchenPanel
                value={value}
                onUse={use}
              />
            )}
            {tab === 'mix' && mixMode === 'stack' && (
              <StackPanel
                value={value}
                onUse={use}
              />
            )}
            {tab === 'image' && (
              <ImagePanel
                value={value}
                onUse={use}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 10,
  },
  knob: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border.dim },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  remove: { paddingHorizontal: 8, paddingVertical: 8 },
  removeLabel: { color: Colors.type.undesirable, fontSize: 13, fontWeight: '600' },
  mixModes: { flexDirection: 'row', gap: 6 },
  mixMode: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  mixModeOn: { borderColor: Colors.cooldown.yellow, backgroundColor: '#2a2410' },
  mixModeLabel: { color: Colors.text.light, fontSize: 12 },
  mixModeLabelOn: { color: Colors.text.primary, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
