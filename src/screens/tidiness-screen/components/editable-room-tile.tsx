import React, { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useTidinessStore } from '../../../store/tidiness-store';
import type { TidyRoom } from '../../../types/tidiness';
import { Colors } from '../../../utils/colors';
import { clampRect } from '../../../utils/tidiness-utils';

const TILE_GAP = 3;
const HANDLE_SIZE = 22;

interface EditableRoomTileProps {
  room: TidyRoom;
  cell: number;
  selected: boolean;
  onSelect: () => void;
  /** Called while a drag starts and ends, so the screen can stop scrolling. */
  onDragging: (dragging: boolean) => void;
}

/** A room tile on the plan editor: drag to move, drag the corner to resize. Snaps to the grid on release. */
export function EditableRoomTile({ room, cell, selected, onSelect, onDragging }: EditableRoomTileProps) {
  const setRoomRect = useTidinessStore(store => store.setRoomRect);
  const [drag, setDrag] = useState({ dx: 0, dy: 0, dw: 0, dh: 0 });

  const move = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          onSelect();
          onDragging(true);
        },
        onPanResponderMove: (_event, gesture) => setDrag({ dx: gesture.dx, dy: gesture.dy, dw: 0, dh: 0 }),
        onPanResponderRelease: (_event, gesture) => {
          setRoomRect(room.id, {
            ...room.rect,
            x: room.rect.x + gesture.dx / cell,
            y: room.rect.y + gesture.dy / cell,
          });
          setDrag({ dx: 0, dy: 0, dw: 0, dh: 0 });
          onDragging(false);
        },
        onPanResponderTerminate: () => {
          setDrag({ dx: 0, dy: 0, dw: 0, dh: 0 });
          onDragging(false);
        },
      }),
    [cell, room.id, room.rect, onSelect, onDragging, setRoomRect],
  );

  const resize = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => onDragging(true),
        onPanResponderMove: (_event, gesture) => setDrag({ dx: 0, dy: 0, dw: gesture.dx, dh: gesture.dy }),
        onPanResponderRelease: (_event, gesture) => {
          setRoomRect(room.id, {
            ...room.rect,
            w: room.rect.w + gesture.dx / cell,
            h: room.rect.h + gesture.dy / cell,
          });
          setDrag({ dx: 0, dy: 0, dw: 0, dh: 0 });
          onDragging(false);
        },
        onPanResponderTerminate: () => {
          setDrag({ dx: 0, dy: 0, dw: 0, dh: 0 });
          onDragging(false);
        },
      }),
    [cell, room.id, room.rect, onDragging, setRoomRect],
  );

  // Preview where the tile will snap to.
  const rect = clampRect({
    x: room.rect.x + drag.dx / cell,
    y: room.rect.y + drag.dy / cell,
    w: room.rect.w + drag.dw / cell,
    h: room.rect.h + drag.dh / cell,
  });

  return (
    <View
      {...move.panHandlers}
      style={[
        styles.tile,
        selected && styles.selected,
        {
          left: rect.x * cell + TILE_GAP,
          top: rect.y * cell + TILE_GAP,
          width: rect.w * cell - TILE_GAP * 2,
          height: rect.h * cell - TILE_GAP * 2,
        },
      ]}
    >
      <Text
        style={styles.name}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {rect.w >= 3 ? `${room.emoji} ${room.name}` : room.emoji}
      </Text>
      {selected && (
        <View
          {...resize.panHandlers}
          style={styles.handle}
          hitSlop={10}
          accessibilityLabel={`Resize ${room.name}`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    position: 'absolute',
    borderRadius: 8,
    padding: 6,
    backgroundColor: Colors.bg.elevated,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: { borderColor: Colors.type.desirable, zIndex: 2 },
  name: { color: Colors.text.secondary, fontSize: 13, fontWeight: '700' },
  handle: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: 6,
    backgroundColor: Colors.type.desirable,
  },
});
