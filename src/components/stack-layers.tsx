import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getLayerOffset, type StackLayer } from '../utils/icon-utils';
import { Text } from './text';

/** Share of the box an emoji at size 1 fills, leaving room so it doesn't clip. */
const GLYPH_PER_BOX = 0.82;

/** Draws stack layers in a square box, clipped so far-out layers never spill into the row. */
export function StackLayers({ layers, box }: { layers: StackLayer[]; box: number }) {
  return (
    <View style={[styles.stack, { width: box, height: box }]}>
      {layers.map((layer, i) => {
        const { x, y } = getLayerOffset(layer, box);
        const glyph = Math.max(1, layer.size * box * GLYPH_PER_BOX);
        const cell = glyph * 1.4;
        return (
          <View
            // biome-ignore lint/suspicious/noArrayIndexKey: layers have no ids and only change as a whole
            key={i}
            pointerEvents="none"
            style={[
              styles.layer,
              {
                width: cell,
                height: cell,
                left: box / 2 - cell / 2 + x,
                top: box / 2 - cell / 2 + y,
                opacity: layer.opacity,
                transform: [{ rotate: `${layer.rotation}deg` }, { scaleX: layer.mirror ? -1 : 1 }],
              },
            ]}
          >
            <Text style={[styles.glyph, { fontSize: glyph, lineHeight: glyph * 1.25 }]}>{layer.emoji}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { overflow: 'hidden' },
  layer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  glyph: { textAlign: 'center', includeFontPadding: false },
});
