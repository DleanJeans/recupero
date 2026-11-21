import React, { useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { TidyRoom, TidySpot } from '../../../types/tidiness';
import { Colors } from '../../../utils/colors';
import {
  formatTidyPercent,
  getPlanRows,
  getSpotPins,
  getTidyColor,
  getTidyTileColors,
  TIDY_PLAN_COLUMNS,
} from '../../../utils/tidiness-utils';

const TILE_GAP = 3;
const DOT_SIZE = 14;

interface FloorPlanProps {
  rooms: TidyRoom[];
  spots: TidySpot[];
  roomLevels: Map<string, number | undefined>;
  spotLevels: Map<string, number | undefined>;
  onRoomPress: (roomId: string) => void;
  onSpotPress: (spotId: string) => void;
}

/** The home as room tiles tinted by tidiness, with a dot per spot. */
export function FloorPlan({ rooms, spots, roomLevels, spotLevels, onRoomPress, onSpotPress }: FloorPlanProps) {
  const [width, setWidth] = useState(0);
  const cell = width / TIDY_PLAN_COLUMNS;
  const rows = getPlanRows(rooms);
  const pins = getSpotPins(spots);
  const roomById = new Map(rooms.map(room => [room.id, room]));

  return (
    <View
      style={[styles.plan, { height: Math.max(120, rows * cell) }]}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 &&
        rooms.map(room => {
          const level = roomLevels.get(room.id);
          const tint = getTidyTileColors(level);
          const { x, y, w, h } = room.rect;
          return (
            <Pressable
              key={room.id}
              onPress={() => onRoomPress(room.id)}
              accessibilityRole="button"
              accessibilityLabel={`${room.name} ${formatTidyPercent(level)}`}
              style={[
                styles.tile,
                {
                  left: x * cell + TILE_GAP,
                  top: y * cell + TILE_GAP,
                  width: w * cell - TILE_GAP * 2,
                  height: h * cell - TILE_GAP * 2,
                  backgroundColor: tint.bg,
                },
              ]}
            >
              <Text
                style={[styles.tileName, { color: tint.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {w >= 3 ? `${room.emoji} ${room.name}` : room.emoji}
              </Text>
              <Text
                style={[styles.tileLevel, { color: tint.text }]}
                numberOfLines={1}
              >
                {formatTidyPercent(level)}
              </Text>
            </Pressable>
          );
        })}
      {width > 0 &&
        spots.map(spot => {
          const room = roomById.get(spot.roomId);
          const pin = pins.get(spot.id);
          if (!room || !pin) return null;
          const left = (room.rect.x + pin.x * room.rect.w) * cell - DOT_SIZE / 2;
          const top = (room.rect.y + pin.y * room.rect.h) * cell - DOT_SIZE / 2;
          return (
            <Pressable
              key={spot.id}
              onPress={() => onSpotPress(spot.id)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`${spot.name} ${formatTidyPercent(spotLevels.get(spot.id))}`}
              style={[styles.dot, { left, top, backgroundColor: getTidyColor(spotLevels.get(spot.id)) }]}
            />
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  plan: {
    backgroundColor: Colors.bg.darker,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  tile: { position: 'absolute', borderRadius: 8, padding: 6, overflow: 'hidden' },
  tileName: { fontSize: 13, fontWeight: '700' },
  tileLevel: { fontSize: 12, opacity: 0.85 },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.bg.primary,
  },
});
