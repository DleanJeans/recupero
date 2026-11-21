import React, { useCallback, useState } from 'react';
import { type LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../components/button';
import { FullScreenModal } from '../../../components/full-screen-modal';
import { Text } from '../../../components/text';
import { useTidinessStore } from '../../../store/tidiness-store';
import { Colors } from '../../../utils/colors';
import { getSpotPins } from '../../../utils/tidiness-utils';
import { DraggableSpotPin } from './draggable-spot-pin';
import { EditableRoomTile } from './editable-room-tile';
import { PlanSizeStepper } from './plan-size-stepper';
import { RoomDialog } from './room-dialog';

interface FloorPlanEditorProps {
  onClose: () => void;
}

/** Full-screen editor for the floor plan: move and resize room tiles, drag spot pins inside a room. */
export function FloorPlanEditor({ onClose }: FloorPlanEditorProps) {
  const rooms = useTidinessStore(store => store.rooms);
  const spots = useTidinessStore(store => store.spots);
  const planSize = useTidinessStore(store => store.planSize);
  const setPlanSize = useTidinessStore(store => store.setPlanSize);
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const [selectedId, setSelectedId] = useState<string | undefined>(rooms[0]?.id);
  const [dragging, setDragging] = useState(false);
  const [roomDialog, setRoomDialog] = useState<{ roomId?: string }>();
  const cell = width / planSize.cols;
  const rows = planSize.rows;
  const selected = rooms.find(room => room.id === selectedId);
  const selectedSpots = spots.filter(spot => spot.roomId === selectedId);
  const pins = getSpotPins(spots);
  const onDragging = useCallback((value: boolean) => setDragging(value), []);

  return (
    <FullScreenModal
      title="Edit plan"
      onClose={onClose}
      rightContent={
        <Button
          variant="ghost"
          onPress={onClose}
        >
          Done
        </Button>
      }
    >
      <ScrollView
        scrollEnabled={!dragging}
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
      >
        <Text style={styles.hint}>
          Drag a room to move it and its green corner to resize it. Drag the selected room's spot emoji to where they
          really are.
        </Text>
        <View style={styles.sizeRow}>
          <PlanSizeStepper
            label="Width"
            value={planSize.cols}
            onChange={cols => setPlanSize({ ...planSize, cols })}
          />
          <PlanSizeStepper
            label="Height"
            value={planSize.rows}
            onChange={rows => setPlanSize({ ...planSize, rows })}
          />
        </View>
        <View
          style={[styles.plan, { height: rows * cell }]}
          onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        >
          {width > 0 &&
            Array.from({ length: planSize.cols - 1 }, (_, index) => (
              <View
                key={`c${index}`}
                style={[styles.lineV, { left: (index + 1) * cell }]}
              />
            ))}
          {width > 0 &&
            Array.from({ length: rows - 1 }, (_, index) => (
              <View
                key={`r${index}`}
                style={[styles.lineH, { top: (index + 1) * cell }]}
              />
            ))}
          {width > 0 &&
            rooms.map(room => (
              <EditableRoomTile
                key={room.id}
                room={room}
                cell={cell}
                selected={room.id === selectedId}
                onSelect={() => setSelectedId(room.id)}
                onDragging={onDragging}
              />
            ))}
          {width > 0 &&
            selected &&
            selectedSpots.map(spot => {
              const pin = pins.get(spot.id);
              return pin ? (
                <DraggableSpotPin
                  key={spot.id}
                  spot={spot}
                  room={selected}
                  pin={pin}
                  cell={cell}
                  onDragging={onDragging}
                />
              ) : null;
            })}
        </View>
        {selected ? (
          <View style={styles.card}>
            <Text
              style={styles.cardTitle}
              numberOfLines={1}
            >
              {selected.emoji} {selected.name}
            </Text>
            <Text style={styles.cardText}>
              {selectedSpots.length === 0
                ? 'No spots yet.'
                : selectedSpots.map(spot => `${spot.emoji} ${spot.name}`).join('   ')}
            </Text>
          </View>
        ) : (
          <Text style={styles.hint}>Tap a room to select it.</Text>
        )}
        <View style={styles.actions}>
          <Button onPress={() => setRoomDialog({})}>＋ Room</Button>
          {selected && <Button onPress={() => setRoomDialog({ roomId: selected.id })}>Edit room</Button>}
        </View>
        <Text style={styles.hint}>
          Width and height are in squares. Shrinking the plan moves rooms inside it. Tiles can overlap, and rooms keep
          their spots wherever they move.
        </Text>
      </ScrollView>
      {roomDialog && (
        <RoomDialog
          roomId={roomDialog.roomId}
          onSaved={roomId => setSelectedId(roomId)}
          onClose={() => setRoomDialog(undefined)}
        />
      )}
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  hint: { color: Colors.text.muted, fontSize: 12, lineHeight: 17 },
  plan: {
    backgroundColor: Colors.bg.darker,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  lineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: Colors.bg.input },
  lineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: Colors.bg.input },
  card: { backgroundColor: Colors.bg.primary, borderRadius: 12, padding: 12, gap: 4 },
  cardTitle: { color: Colors.text.primary, fontSize: 15, fontWeight: '700' },
  cardText: { color: Colors.text.light, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8 },
  sizeRow: { flexDirection: 'row', gap: 8 },
});
