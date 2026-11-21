import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppIcon } from '../../../components/app-icon';
import { Text } from '../../../components/text';
import { useTidinessStore } from '../../../store/tidiness-store';
import type { TidyRoom } from '../../../types/tidiness';
import { Colors } from '../../../utils/colors';
import { formatTidyPercent, getTidyColor, type TidySpotState } from '../../../utils/tidiness-utils';
import { SpotRow } from './spot-row';
import { TidyBar } from './tidy-bar';

interface RoomCardProps {
  room: TidyRoom;
  level: number | undefined;
  states: TidySpotState[];
  now: number;
  onSpotPress: (spotId: string) => void;
  onAddSpot: () => void;
  onEditRoom: () => void;
}

/** A room with its bar; tap to unfold its spots. */
export function RoomCard({ room, level, states, now, onSpotPress, onAddSpot, onEditRoom }: RoomCardProps) {
  const expanded = useTidinessStore(store => store.expandedRoomIds.includes(room.id));
  const toggle = useTidinessStore(store => store.toggleRoomExpanded);
  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        onPress={() => toggle(room.id)}
        onLongPress={onEditRoom}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${room.name} ${formatTidyPercent(level)}`}
      >
        <AppIcon
          value={room.emoji}
          size={20}
          fallback="🏠"
        />
        <Text
          style={styles.name}
          numberOfLines={1}
        >
          {room.name}
        </Text>
        <TidyBar
          level={level}
          showLine
        />
        <Text
          style={[styles.pct, { color: getTidyColor(level) }]}
          numberOfLines={1}
        >
          {formatTidyPercent(level)}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.text.faint}
        />
      </Pressable>
      {expanded && (
        <>
          {states.map(state => (
            <SpotRow
              key={state.spot.id}
              state={state}
              now={now}
              onPress={() => onSpotPress(state.spot.id)}
            />
          ))}
          <View style={styles.footer}>
            <Pressable
              onPress={onAddSpot}
              hitSlop={6}
              accessibilityRole="button"
            >
              <Text style={styles.action}>＋ Spot</Text>
            </Pressable>
            <Pressable
              onPress={onEditRoom}
              hitSlop={6}
              accessibilityRole="button"
            >
              <Text style={styles.action}>Edit room</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  pressed: { backgroundColor: Colors.bg.darker },
  name: { width: 104, flexShrink: 1, color: Colors.text.primary, fontSize: 15, fontWeight: '600' },
  pct: { minWidth: 40, flexShrink: 0, textAlign: 'right', fontSize: 14, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.bg.input,
  },
  action: { color: Colors.text.light, fontSize: 13, fontWeight: '700' },
});
