import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/button';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { ScreenFrame } from '../../components/screen-frame';
import { Text } from '../../components/text';
import { useTidiness } from '../../hooks/use-tidiness';
import { useTidinessStore } from '../../store/tidiness-store';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { getRoomLevel } from '../../utils/tidiness-utils';
import { FloorPlan } from './components/floor-plan';
import { FloorPlanEditor } from './components/floor-plan-editor';
import { RoomCard } from './components/room-card';
import { RoomDialog } from './components/room-dialog';
import { SpotDialog } from './components/spot-dialog';
import { SpotSheet } from './components/spot-sheet';
import { TidinessSetup } from './components/tidiness-setup';
import { TidinessSummary } from './components/tidiness-summary';

/** Tidiness by room and spot: overall ring, floor plan heat map and the room list. */
export function TidinessScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const rooms = useTidinessStore(store => store.rooms);
  const spots = useTidinessStore(store => store.spots);
  const showPlan = useTidinessStore(store => store.showPlan);
  const setShowPlan = useTidinessStore(store => store.setShowPlan);
  const expandedRoomIds = useTidinessStore(store => store.expandedRoomIds);
  const toggleRoomExpanded = useTidinessStore(store => store.toggleRoomExpanded);
  const { states, overall, now } = useTidiness();
  const [openSpotId, setOpenSpotId] = useState<string>();
  const [spotDialog, setSpotDialog] = useState<{ spotId?: string; roomId?: string }>();
  const [roomDialog, setRoomDialog] = useState<{ roomId?: string }>();
  const [editingPlan, setEditingPlan] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const roomYs = useRef(new Map<string, number>());
  const listY = useRef(0);

  const roomLevels = useMemo(
    () => new Map(rooms.map(room => [room.id, getRoomLevel(room.id, states)])),
    [rooms, states],
  );
  const spotLevels = useMemo(() => new Map(states.map(state => [state.spot.id, state.level])), [states]);
  const openState = states.find(state => state.spot.id === openSpotId);
  const openRoom = rooms.find(room => room.id === openState?.spot.roomId);

  const showRoom = (roomId: string) => {
    if (!expandedRoomIds.includes(roomId)) toggleRoomExpanded(roomId);
    const y = roomYs.current.get(roomId);
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, listY.current + y - 8), animated: true });
  };

  return (
    <ScreenFrame
      title="🏠 Tidiness"
      onClose={() => navigation.goBack()}
      rightContent={
        <Button
          variant="icon"
          onPress={() => navigation.navigate('Need', { needId: 'tidiness' })}
          accessibilityLabel="Tidiness need settings"
        >
          <Ionicons
            name="options-outline"
            size={22}
            color={Colors.text.light}
          />
        </Button>
      }
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
      >
        {rooms.length === 0 ? (
          <TidinessSetup onStartEmpty={() => setRoomDialog({})} />
        ) : (
          <>
            <TidinessSummary
              level={overall.level}
              states={states}
              now={now}
            />
            <View style={styles.sectionHeader}>
              <CueSectionLabel>Floor plan</CueSectionLabel>
              <View style={styles.actions}>
                {showPlan && (
                  <Pressable
                    onPress={() => setEditingPlan(true)}
                    hitSlop={8}
                    accessibilityRole="button"
                  >
                    <Text style={styles.action}>✎ Edit</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setShowPlan(!showPlan)}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={styles.action}>{showPlan ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </View>
            {showPlan && (
              <FloorPlan
                rooms={rooms}
                spots={spots}
                roomLevels={roomLevels}
                spotLevels={spotLevels}
                onRoomPress={showRoom}
                onSpotPress={setOpenSpotId}
              />
            )}
            <View style={styles.sectionHeader}>
              <CueSectionLabel>Rooms</CueSectionLabel>
              <Pressable
                onPress={() => setRoomDialog({})}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.action}>＋ Room</Text>
              </Pressable>
            </View>
            <View
              style={styles.list}
              onLayout={event => {
                listY.current = event.nativeEvent.layout.y;
              }}
            >
              {rooms.map(room => (
                <View
                  key={room.id}
                  onLayout={event => roomYs.current.set(room.id, event.nativeEvent.layout.y)}
                >
                  <RoomCard
                    room={room}
                    level={roomLevels.get(room.id)}
                    states={states.filter(state => state.spot.roomId === room.id)}
                    now={now}
                    onSpotPress={setOpenSpotId}
                    onAddSpot={() => setSpotDialog({ roomId: room.id })}
                    onEditRoom={() => setRoomDialog({ roomId: room.id })}
                  />
                </View>
              ))}
            </View>
            <Text style={styles.hint}>
              Tidiness on Cues is the average of your spots; spots set to High count three times as much as Low.
              Long-press a room to rename it.
            </Text>
          </>
        )}
      </ScrollView>
      {openState && (
        <SpotSheet
          state={openState}
          roomName={openRoom?.name ?? ''}
          onEdit={() => {
            setOpenSpotId(undefined);
            setSpotDialog({ spotId: openState.spot.id });
          }}
          onClose={() => setOpenSpotId(undefined)}
        />
      )}
      {spotDialog && (
        <SpotDialog
          spotId={spotDialog.spotId}
          defaultRoomId={spotDialog.roomId}
          onClose={() => setSpotDialog(undefined)}
        />
      )}
      {roomDialog && (
        <RoomDialog
          roomId={roomDialog.roomId}
          onClose={() => setRoomDialog(undefined)}
        />
      )}
      {editingPlan && <FloorPlanEditor onClose={() => setEditingPlan(false)} />}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: 4,
    marginTop: 6,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  action: { color: Colors.text.light, fontSize: 12, fontWeight: '700' },
  list: { gap: 8 },
  hint: { color: Colors.text.faint, fontSize: 12, lineHeight: 17, marginTop: 4 },
});
