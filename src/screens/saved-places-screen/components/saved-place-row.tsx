import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { SavedPlace } from '../../../types/cue';
import { Colors } from '../../../utils/colors';

interface SavedPlaceRowProps {
  place: SavedPlace;
  onPress: () => void;
}

export function SavedPlaceRow({ place, onPress }: SavedPlaceRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, place.isHome && styles.homeRow, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.icon, place.isHome && styles.homeIcon]}>
        <Text style={styles.emoji}>{place.isHome ? '🏠' : '📍'}</Text>
      </View>
      <View style={styles.copy}>
        <View style={styles.nameRow}>
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {place.name}
          </Text>
          {place.isHome && <Text style={styles.homeTag}>HOME</Text>}
        </View>
        <Text
          style={styles.detail}
          numberOfLines={1}
        >
          {place.address ? `${place.address} · ` : ''}
          {place.radiusM} m
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={19}
        color={Colors.text.faint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 12,
  },
  homeRow: { borderColor: `${Colors.cue.location}88`, backgroundColor: `${Colors.cue.location}0f` },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.input,
  },
  homeIcon: { backgroundColor: `${Colors.cue.location}1f` },
  emoji: { fontSize: 21 },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { flexShrink: 1, color: Colors.text.primary, fontSize: 15, fontWeight: '700' },
  homeTag: {
    color: Colors.cue.location,
    backgroundColor: `${Colors.cue.location}1f`,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 9,
    fontWeight: '800',
  },
  detail: { color: Colors.text.faint, fontSize: 12 },
  pressed: { opacity: 0.72 },
});
