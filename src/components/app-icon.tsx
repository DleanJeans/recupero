import React, { useMemo } from 'react';
import { type StyleProp, StyleSheet, type TextStyle, View } from 'react-native';
import { type IconValue, parseIcon } from '../utils/icon-utils';
import { RemoteIcon } from './remote-icon';
import { StackLayers } from './stack-layers';
import { Text } from './text';

interface Props {
  value: IconValue;
  /** Emoji font size. Defaults to the style's fontSize, then 20. Drawn icons fill a box about this big. */
  size?: number;
  /** Text style for plain emoji. Drawn icons take its opacity. */
  style?: StyleProp<TextStyle>;
  /** Shown when the value is empty. */
  fallback?: string;
  /** Exact box size for drawn icons (mix, stack, image), e.g. to fill a button. Defaults to about `size`. */
  boxSize?: number;
  /** Corner radius for image icons. Defaults to 22% of the box. */
  imageRadius?: number;
}

/** Glyphs draw a little larger than their font size, so drawn icons use a slightly bigger box to line up. */
const BOX_PER_FONT_SIZE = 1.18;

/** Any icon value: plain emoji, Emoji Kitchen mix, stacked emoji or an image link (cached after the first load). */
export const AppIcon = React.memo(function AppIcon({ value, size, style, fallback, boxSize, imageRadius }: Props) {
  const parsed = useMemo(() => parseIcon(value), [value]);
  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = size ?? flat.fontSize ?? 20;

  if (parsed.kind === 'none' || parsed.kind === 'emoji') {
    const text = parsed.kind === 'emoji' ? parsed.emoji : fallback;
    if (!text) return null;
    return <Text style={[style, { fontSize }]}>{text}</Text>;
  }

  const box = boxSize ?? Math.round(fontSize * BOX_PER_FONT_SIZE);
  return (
    <View style={{ width: box, height: box, opacity: flat.opacity ?? 1 }}>
      {parsed.kind === 'stack' ? (
        <StackLayers
          layers={parsed.layers}
          box={box}
        />
      ) : (
        <RemoteIcon
          parsed={parsed}
          box={box}
          imageRadius={imageRadius}
        />
      )}
    </View>
  );
});
