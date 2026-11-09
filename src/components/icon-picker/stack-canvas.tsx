import React, { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { getLayerOffset, getLayerPolar, type StackLayer } from '../../utils/icon-utils';
import { StackLayers } from '../stack-layers';

interface Props {
  layers: StackLayer[];
  selected: number;
  size: number;
  /** Called while dragging: the selected layer's new distance and direction. */
  onMove: (polar: Pick<StackLayer, 'distance' | 'direction'>) => void;
}

/** The big stack preview. Touch or drag anywhere to move the selected layer there. */
export function StackCanvas({ layers, selected, size, onMove }: Props) {
  const latest = useRef({ size, onMove });
  latest.current = { size, onMove };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: event => move(event.nativeEvent.locationX, event.nativeEvent.locationY),
      onPanResponderMove: event => move(event.nativeEvent.locationX, event.nativeEvent.locationY),
    }),
  ).current;

  function move(x: number, y: number) {
    const { size: box, onMove: change } = latest.current;
    change(getLayerPolar(x - box / 2, y - box / 2, box));
  }

  const layer = layers[selected];
  const offset = layer ? getLayerOffset(layer, size) : null;
  const outline = layer ? Math.max(16, layer.size * size * 0.82) : 0;

  return (
    <View
      style={[styles.canvas, { width: size, height: size }]}
      {...responder.panHandlers}
    >
      <View
        pointerEvents="none"
        style={[styles.ring, { width: size - 8, height: size - 8, borderRadius: size / 2, left: 4, top: 4 }]}
      />
      <View pointerEvents="none">
        <StackLayers
          layers={layers}
          box={size}
        />
      </View>
      {offset && layers.length > 1 && (
        <View
          pointerEvents="none"
          style={[
            styles.selection,
            {
              width: outline,
              height: outline,
              left: size / 2 + offset.x - outline / 2,
              top: size / 2 + offset.y - outline / 2,
              transform: [{ rotate: `${layer.rotation}deg` }],
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { alignSelf: 'center', borderRadius: 18, backgroundColor: Colors.bg.darker },
  ring: { position: 'absolute', borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.border.dim },
  selection: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.cooldown.yellow,
    borderRadius: 6,
  },
});
