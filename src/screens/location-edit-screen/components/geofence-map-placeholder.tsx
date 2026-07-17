import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

interface GeofenceMapPlaceholderProps {
  radiusM: number;
}

export function GeofenceMapPlaceholder({ radiusM }: GeofenceMapPlaceholderProps) {
  const circleSize = Math.min(150, 66 + radiusM / 8);
  return (
    <View style={styles.map}>
      <View style={[styles.verticalRoad, styles.roadOne]} />
      <View style={[styles.verticalRoad, styles.roadTwo]} />
      <View style={styles.horizontalRoad} />
      <View style={[styles.geofence, { width: circleSize, height: circleSize, borderRadius: circleSize / 2 }]} />
      <Ionicons
        name="location"
        size={36}
        color={Colors.cue.location}
      />
      <View style={styles.chip}>
        <Text style={styles.chipText}>📍 Dropped pin</Text>
      </View>
      <Text style={styles.caption}>Map preview · SDK selection pending</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 224,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#17202a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  verticalRoad: { position: 'absolute', top: -30, bottom: -30, width: 14, backgroundColor: '#263442' },
  roadOne: { left: '30%', transform: [{ rotate: '8deg' }] },
  roadTwo: { right: '18%', width: 9, transform: [{ rotate: '-4deg' }] },
  horizontalRoad: { position: 'absolute', left: -20, right: -20, top: '62%', height: 16, backgroundColor: '#263442' },
  geofence: {
    position: 'absolute',
    backgroundColor: `${Colors.cue.location}25`,
    borderWidth: 1,
    borderColor: Colors.cue.location,
  },
  chip: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: Colors.bg.card,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: Colors.text.secondary, fontSize: 11, fontWeight: '700' },
  caption: { position: 'absolute', bottom: 11, color: Colors.text.faint, fontSize: 11, fontWeight: '600' },
});
