import React, { useRef } from 'react';
import { type GestureResponderEvent, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useIconImage } from '../../hooks/use-icon-image';
import { useImageSize } from '../../hooks/use-image-size';
import { Colors } from '../../utils/colors';
import { clampCrop, DEFAULT_CROP, type ImageCrop, MAX_CROP_ZOOM } from '../../utils/icon-utils';
import { CroppedImage } from '../cropped-image';
import { Text } from '../text';
import { IconSlider } from './icon-slider';

interface Props {
  url: string;
  crop: ImageCrop;
  onChange: (crop: ImageCrop) => void;
}

const VIEW = 200;
const RADIUS = 28;

function touchDistance(event: GestureResponderEvent): number | null {
  const [a, b] = event.nativeEvent.touches;
  if (!a || !b) return null;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

/** Drag to move the image inside the icon, pinch or use the slider to zoom. */
export function ImageCropEditor({ url, crop, onChange }: Props) {
  const image = useIconImage(url);
  const localUri = image.status === 'ready' ? image.uri : null;
  const size = useImageSize(localUri);

  const latest = useRef({ crop, size, onChange });
  latest.current = { crop, size, onChange };
  /** Crop and finger state when the current gesture (or finger count) started. */
  const start = useRef<{ crop: ImageCrop; distance: number | null; dx: number; dy: number } | null>(null);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: event => {
        start.current = { crop: latest.current.crop, distance: touchDistance(event), dx: 0, dy: 0 };
      },
      onPanResponderMove: (event, gesture) => {
        const { size: natural, onChange: change } = latest.current;
        const begin = start.current;
        if (!natural || !begin) return;
        const distance = touchDistance(event);
        // Restart the reference whenever a finger is added or lifted, so the image doesn't jump.
        if ((distance == null) !== (begin.distance == null)) {
          start.current = { crop: latest.current.crop, distance, dx: gesture.dx, dy: gesture.dy };
          return;
        }
        const zoom = distance && begin.distance ? begin.crop.zoom * (distance / begin.distance) : begin.crop.zoom;
        const scale = (VIEW / Math.min(natural.width, natural.height)) * zoom;
        const next = {
          x: begin.crop.x - (gesture.dx - begin.dx) / (natural.width * scale),
          y: begin.crop.y - (gesture.dy - begin.dy) / (natural.height * scale),
          zoom,
        };
        change(clampCrop(next, natural.width, natural.height));
      },
    }),
  ).current;

  const setZoom = (zoom: number) => {
    if (size) onChange(clampCrop({ ...crop, zoom }, size.width, size.height));
  };

  return (
    <View style={styles.editor}>
      <View
        style={styles.viewport}
        {...responder.panHandlers}
      >
        {localUri ? (
          <CroppedImage
            uri={localUri}
            box={VIEW}
            radius={RADIUS}
            crop={crop}
          />
        ) : (
          <Text style={styles.status}>{image.status === 'failed' ? "Couldn't load this image" : 'Loading…'}</Text>
        )}
      </View>
      <IconSlider
        label="Zoom"
        value={crop.zoom}
        min={1}
        max={MAX_CROP_ZOOM}
        step={0.05}
        format={zoom => `${zoom.toFixed(1)}×`}
        onChange={setZoom}
      />
      <View style={styles.footer}>
        <Text style={styles.hint}>Drag to move, pinch to zoom</Text>
        <Pressable
          onPress={() => onChange(DEFAULT_CROP)}
          style={({ pressed }) => pressed && styles.pressed}
          accessibilityLabel="Reset crop"
        >
          <Text style={styles.reset}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: 6 },
  viewport: {
    alignSelf: 'center',
    width: VIEW,
    height: VIEW,
    borderRadius: RADIUS,
    backgroundColor: Colors.bg.input,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  status: { color: Colors.text.muted, fontSize: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { color: Colors.text.faint, fontSize: 12 },
  reset: { color: Colors.text.light, fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
