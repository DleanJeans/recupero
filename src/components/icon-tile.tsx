import React from 'react';
import { type StyleProp, StyleSheet, type TextStyle, View, type ViewStyle } from 'react-native';
import { Colors } from '../utils/colors';
import { getIconTileBox, type IconValue } from '../utils/icon-utils';
import { AppIcon } from './app-icon';

interface Props {
  value: IconValue;
  /** Tile side in px. */
  size: number;
  /** Tile corner radius. Image icons use the same radius so they fill the tile edge to edge. */
  radius: number;
  /** Font size for plain emoji, centred in the tile. Defaults to about half the tile. */
  emojiSize?: number;
  /** Share of the tile an Emoji Kitchen mix or stacked emoji fills. Defaults to the box of a glyph at `emojiSize`. */
  drawnScale?: number;
  /** Shown when the value is empty. */
  fallback?: string;
  /** Rendered instead of the icon when the value and fallback are empty. */
  children?: React.ReactNode;
  /** Tile background, border etc. Image icons cover it. */
  style?: StyleProp<ViewStyle>;
  emojiStyle?: StyleProp<TextStyle>;
}

/** The square icon tile used across the app: plain emoji and mixes sit centred on the tile's background,
 *  image icons fill the whole tile with no margin around them. */
export function IconTile({ value, size, radius, emojiSize, drawnScale, fallback, children, style, emojiStyle }: Props) {
  const fontSize = emojiSize ?? Math.round(size * 0.5);
  const box = getIconTileBox(value, size, drawnScale);
  const empty = !value && !fallback;

  return (
    <View style={[styles.tile, style, { width: size, height: size, borderRadius: radius }]}>
      {empty ? (
        children
      ) : (
        <AppIcon
          value={value}
          fallback={fallback}
          size={fontSize}
          style={emojiStyle}
          boxSize={box}
          imageRadius={radius}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.bg.input,
  },
});
