import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNeedLevels } from '../../hooks/use-need-levels';
import { useSunlight } from '../../hooks/use-sunlight';
import type { RootStackParamList } from '../../types/navigation';
import type { NeedId } from '../../types/need';
import { Colors } from '../../utils/colors';
import { formatNextCraving } from '../../utils/need-utils';
import { formatTime } from '../../utils/time-utils';
import { CueSectionLabel } from '../cues/cue-section-label';
import { Text } from '../text';
import { NeedBarRow } from './need-bar-row';
import { NeedSheet } from './need-sheet';
import { SunlightBarRow } from './sunlight-bar-row';
import { SunlightSheet } from './sunlight-sheet';

/** Hunger, Thirst, Hygiene and Energy bars (plus today's sunlight) at the top of the Cues tab. */
export function NeedsPanel() {
  const { needs, now } = useNeedLevels();
  const sunlight = useSunlight();
  const [openId, setOpenId] = useState<NeedId>();
  const [sunlightOpen, setSunlightOpen] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={styles.group}>
      <View style={styles.header}>
        <CueSectionLabel>Needs</CueSectionLabel>
        <View style={styles.actions}>
          {needs.length > 0 && (
            <Pressable
              onPress={() => navigation.navigate('NeedsHistory')}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.action}>History ›</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => navigation.navigate('NeedsSettings')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Needs settings"
          >
            <Ionicons
              name="settings-outline"
              size={16}
              color={Colors.text.light}
            />
          </Pressable>
        </View>
      </View>
      <View style={styles.card}>
        {needs.length === 0 && !sunlight.enabled && (
          <Text style={styles.empty}>All needs are off. Turn them on in settings.</Text>
        )}
        {needs.map(need => (
          <NeedBarRow
            key={need.id}
            needId={need.id}
            config={need.config}
            level={need.level}
            detail={formatNextCraving(need.level, need.config, now, ts => formatTime(ts))}
            onPress={() => setOpenId(need.id)}
          />
        ))}
        {sunlight.enabled && (
          <SunlightBarRow
            sunlight={sunlight}
            onPress={() => setSunlightOpen(true)}
          />
        )}
      </View>
      <SunlightSheet
        visible={sunlightOpen}
        onClose={() => setSunlightOpen(false)}
      />
      <NeedSheet
        needId={openId}
        onClose={() => setOpenId(undefined)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  empty: {
    color: Colors.text.faint,
    fontSize: 13,
    paddingVertical: 8,
  },
  action: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
