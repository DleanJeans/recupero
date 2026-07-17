import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CueActivityRow } from '../../../components/cues/cue-activity-row';
import { CueSectionLabel } from '../../../components/cues/cue-section-label';
import { Text } from '../../../components/text';
import { useCuesStore } from '../../../store/cues-store';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';

export function ActivityPreview() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const activity = useCuesStore(state => state.activity);
  const recent = useMemo(() => [...activity].sort((a, b) => b.ts - a.ts).slice(0, 3), [activity]);

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.heading}
        onPress={() => navigation.navigate('CueActivity')}
      >
        <CueSectionLabel>Recent activity</CueSectionLabel>
        <View style={styles.viewAll}>
          <Text style={styles.viewAllText}>View all</Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={Colors.text.faint}
          />
        </View>
      </Pressable>
      <View style={styles.card}>
        {recent.length === 0 ? (
          <Text style={styles.empty}>Location and mood changes will appear here.</Text>
        ) : (
          recent.map(event => (
            <CueActivityRow
              key={event.id}
              event={event}
            />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  viewAllText: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  empty: {
    color: Colors.text.faint,
    fontSize: 13,
    lineHeight: 19,
    padding: 16,
  },
});
