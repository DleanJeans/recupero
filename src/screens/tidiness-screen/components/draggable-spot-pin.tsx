import React, { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { AppIcon } from '../../../components/app-icon';
import { useTidinessStore } from '../../../store/tidiness-store';
import type { TidyRoom, TidySpot } from '../../../types/tidiness';
import { Colors } from '../../../utils/colors';

const DOT_SIZE = 30;

interface DraggableSpotPinProps {
  spot: TidySpot;
  room: TidyRoom;
  pin: { x: number; y: number };
  cell: number;
  onDragging: (dragging: boolean) => void;
}

/** A spot's emoji on the plan editor; drag it to where the spot really is inside its room. */
export function DraggableSpotPin({ spot, room, pin, cell, onDragging }: DraggableSpotPinProps) {
  const setSpotPin = useTidinessStore(store => store.setSpotPin);
  const [drag, setDrag] = useState({ dx: 0, dy: 0 });
  const roomWidth = room.rect.w * cell;
  const roomHeight = room.rect.h * cell;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => onDragging(true),
        onPanResponderMove: (_event, gesture) => setDrag({ dx: gesture.dx, dy: gesture.dy }),
        onPanResponderRelease: (_event, gesture) => {
          setSpotPin(spot.id, { x: pin.x + gesture.dx / roomWidth, y: pin.y + gesture.dy / roomHeight });
          setDrag({ dx: 0, dy: 0 });
          onDragging(false);
        },
        onPanResponderTerminate: () => {
          setDrag({ dx: 0, dy: 0 });
          onDragging(false);
        },
      }),
    [spot.id, pin.x, pin.y, roomWidth, roomHeight, onDragging, setSpotPin],
  );

  const x = Math.max(0.05, Math.min(0.95, pin.x + drag.dx / roomWidth));
  const y = Math.max(0.05, Math.min(0.95, pin.y + drag.dy / roomHeight));
  return (
    <View
      {...responder.panHandlers}
      hitSlop={10}
      accessibilityLabel={`Move ${spot.name}`}
      style={[
        styles.dot,
        {
          left: room.rect.x * cell + x * roomWidth - DOT_SIZE / 2,
          top: room.rect.y * cell + y * roomHeight - DOT_SIZE / 2,
        },
      ]}
    >
      <AppIcon
        value={spot.emoji}
        size={18}
        fallback="🧹"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    zIndex: 3,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.primary,
    borderWidth: 2,
    borderColor: Colors.cue.location,
  },
});
