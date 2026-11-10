import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { type GestureResponderEvent, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useClearedImage } from '../../hooks/use-cleared-image';
import { useIconImage } from '../../hooks/use-icon-image';
import { useImageSize } from '../../hooks/use-image-size';
import { Colors } from '../../utils/colors';
import {
  clampCrop,
  DEFAULT_CROP,
  type ImageClear,
  type ImageCrop,
  MAX_CROP_ZOOM,
  MIN_CROP_ZOOM,
  normalizeRotation,
  screenToImageDelta,
} from '../../utils/icon-utils';
import { CroppedImage } from '../cropped-image';
import { Text } from '../text';
import { BackgroundClearPicker } from './background-clear-picker';
import { IconSlider } from './icon-slider';

interface Props {
  url: string;
  crop: ImageCrop;
  onChange: (crop: ImageCrop) => void;
  clear: ImageClear | undefined;
  onClearChange: (clear: ImageClear | undefined) => void;
}

const VIEW = 200;

const degrees = (n: number) => `${Math.round(n)}°`;
const RADIUS = 28;

function touchGeometry(event: GestureResponderEvent): { distance: number; angle: number } | null {
  const [a, b] = event.nativeEvent.touches;
  if (!a || !b) return null;
  return {
    distance: Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY),
    angle: (Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX) * 180) / Math.PI,
  };
}

/** Drag to move the image inside the icon, pinch or use the slider to zoom. */
export function ImageCropEditor({ url, crop, onChange, clear, onClearChange }: Props) {
  const image = useIconImage(url);
  const localUri = image.status === 'ready' ? image.uri : null;
  const size = useImageSize(localUri);
  const shownUri = useClearedImage(url, localUri, clear);

  const latest = useRef({ crop, size, onChange });
  latest.current = { crop, size, onChange };
  /** Crop and finger state when the current gesture (or finger count) started. */
  const start = useRef<{
    crop: ImageCrop;
    touch: { distance: number; angle: number } | null;
    dx: number;
    dy: number;
  } | null>(null);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: event => {
        start.current = { crop: latest.current.crop, touch: touchGeometry(event), dx: 0, dy: 0 };
      },
      onPanResponderMove: (event, gesture) => {
        const { size: natural, onChange: change } = latest.current;
        const begin = start.current;
        if (!natural || !begin) return;
        const touch = touchGeometry(event);
        // Restart the reference whenever a finger is added or lifted, so the image doesn't jump.
        if ((touch == null) !== (begin.touch == null)) {
          start.current = { crop: latest.current.crop, touch, dx: gesture.dx, dy: gesture.dy };
          return;
        }
        const zoom = touch && begin.touch ? begin.crop.zoom * (touch.distance / begin.touch.distance) : begin.crop.zoom;
        const rotation =
          touch && begin.touch
            ? normalizeRotation((begin.crop.rotation ?? 0) + touch.angle - begin.touch.angle)
            : (begin.crop.rotation ?? 0);
        const scale = (VIEW / Math.min(natural.width, natural.height)) * zoom;
        const move = screenToImageDelta(gesture.dx - begin.dx, gesture.dy - begin.dy, rotation);
        change(
          clampCrop(
            {
              ...begin.crop,
              x: begin.crop.x - move.x / (natural.width * scale),
              y: begin.crop.y - move.y / (natural.height * scale),
              zoom,
              rotation,
            },
            natural.width,
            natural.height,
          ),
        );
      },
    }),
  ).current;

  const setZoom = (zoom: number) => {
    if (size) onChange(clampCrop({ ...crop, zoom }, size.width, size.height));
  };

  /** Zooms out and centres so the whole picture sits inside the icon (the background shows around it). */
  const fitWholeImage = () => {
    if (!size) return;
    const zoom = Math.max(MIN_CROP_ZOOM, Math.min(size.width, size.height) / Math.max(size.width, size.height));
    onChange(clampCrop({ ...crop, x: 0.5, y: 0.5, zoom }, size.width, size.height));
  };

  const setRotation = (rotation: number) => {
    if (size) onChange(clampCrop({ ...crop, rotation: normalizeRotation(rotation) }, size.width, size.height));
  };

  return (
    <View style={styles.editor}>
      <View
        style={styles.viewport}
        {...responder.panHandlers}
      >
        {localUri ? (
          <CroppedImage
            uri={shownUri ?? localUri}
            box={VIEW}
            radius={RADIUS}
            crop={crop}
          />
        ) : (
          <Text style={styles.status}>{image.status === 'failed' ? "Couldn't load this image" : 'Loading…'}</Text>
        )}
      </View>
      <View style={styles.rotateRow}>
        <View style={styles.flex}>
          <IconSlider
            label="Zoom"
            value={crop.zoom}
            min={MIN_CROP_ZOOM}
            max={MAX_CROP_ZOOM}
            step={0.05}
            format={zoom => `${zoom.toFixed(2)}×`}
            onChange={setZoom}
          />
        </View>
        <Pressable
          onPress={fitWholeImage}
          style={({ pressed }) => [styles.turn, pressed && styles.pressed]}
          accessibilityLabel="Fit the whole image in the icon"
        >
          <Ionicons
            name="contract-outline"
            size={18}
            color={Colors.text.light}
          />
        </Pressable>
      </View>
      <View style={styles.rotateRow}>
        <View style={styles.flex}>
          <IconSlider
            label="Rotate"
            value={crop.rotation ?? 0}
            min={-180}
            max={180}
            step={1}
            format={degrees}
            onChange={setRotation}
          />
        </View>
        <Pressable
          onPress={() => setRotation((crop.rotation ?? 0) + 90)}
          style={({ pressed }) => [styles.turn, pressed && styles.pressed]}
          accessibilityLabel="Rotate 90 degrees"
        >
          <Ionicons
            name="refresh"
            size={18}
            color={Colors.text.light}
          />
        </Pressable>
      </View>
      <BackgroundClearPicker
        value={clear}
        onChange={onClearChange}
      />
      <View style={styles.footer}>
        <Text style={styles.hint}>Drag to move, pinch to zoom, twist to rotate</Text>
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
  flex: { flex: 1 },
  rotateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  turn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.bg.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
