import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { type LatLng, Marker } from 'react-native-maps';
import { Colors } from '../utils/colors';
import { AppIcon } from './app-icon';

interface PlaceMarkerProps {
  coordinate: LatLng;
  /** The place's icon (emoji, mix, stack or image). Empty falls back to the standard pin. */
  icon?: string;
  /** Ring and pin colour. */
  color?: string;
  title?: string;
  description?: string;
  draggable?: boolean;
  onDragEnd?: (event: { nativeEvent: { coordinate: LatLng } }) => void;
}

/** How long a custom marker keeps re-rendering so an image icon can finish loading before it is frozen. */
const SETTLE_MS = 1500;
const BUBBLE = 38;

/** A map marker that shows the place's own icon in a ring instead of the default pin. */
export function PlaceMarker({
  coordinate,
  icon,
  color = Colors.cue.location,
  title,
  description,
  draggable,
  onDragEnd,
}: PlaceMarkerProps) {
  const [settling, setSettling] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: restart the settle window when the icon changes
  useEffect(() => {
    setSettling(true);
    const timer = setTimeout(() => setSettling(false), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [icon]);

  if (!icon) {
    return (
      <Marker
        coordinate={coordinate}
        title={title}
        description={description}
        pinColor={color}
        draggable={draggable}
        onDragEnd={onDragEnd}
      />
    );
  }
  return (
    <Marker
      coordinate={coordinate}
      title={title}
      description={description}
      draggable={draggable}
      onDragEnd={onDragEnd}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={settling}
    >
      <View style={[styles.bubble, { borderColor: color }]}>
        <AppIcon
          value={icon}
          size={20}
          boxSize={24}
        />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.card,
  },
});
