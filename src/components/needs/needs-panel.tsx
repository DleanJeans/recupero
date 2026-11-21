import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNeedLevels } from '../../hooks/use-need-levels';
import { useSunlight } from '../../hooks/use-sunlight';
import { useHealthStore } from '../../store/health-store';
import { useNeedsStore } from '../../store/needs-store';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { toDateString } from '../../utils/date-utils';
import { formatNextCraving, formatTimerFull, getPanelOrder, type PanelRowKey } from '../../utils/need-utils';
import { formatTime } from '../../utils/time-utils';
import { CueSectionLabel } from '../cues/cue-section-label';
import { Text } from '../text';
import { AzmBarRow } from './azm-bar-row';
import { NeedBarRow } from './need-bar-row';
import { SunlightBarRow } from './sunlight-bar-row';

/** Hunger, Thirst, Hygiene and Energy bars (plus today's sunlight) at the top of the Cues tab. */
export function NeedsPanel() {
  const { needs, now } = useNeedLevels();
  const sunlight = useSunlight();
  const needOrder = useNeedsStore(state => state.needOrder);
  const azmConnected = useHealthStore(state => state.tokens != null);
  const azmByDay = useHealthStore(state => state.azmByDay);
  const azmGoal = useHealthStore(state => state.azmDailyGoal);
  const sortMode = useNeedsStore(state => state.needSortMode);
  const setSortMode = useNeedsStore(state => state.setNeedSortMode);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const rows = useMemo(() => {
    const manual = getPanelOrder(needOrder);
    const azmRatio = azmGoal > 0 ? (azmByDay[toDateString(new Date(now))] ?? 0) / azmGoal : 0;
    const sunRatio = sunlight.goalMinutes > 0 ? sunlight.today.minutes / sunlight.goalMinutes : 0;
    const ratioOf = (key: PanelRowKey) => {
      if (key === 'azm') return azmRatio;
      if (key === 'sunlight') return sunRatio;
      return (needs.find(need => need.id === key)?.level ?? Number.POSITIVE_INFINITY) / 100;
    };
    const shown = manual.filter(
      key =>
        (key === 'azm' && azmConnected) ||
        (key === 'sunlight' && sunlight.enabled) ||
        needs.some(need => need.id === key),
    );
    // Manual keeps the settings order; otherwise the least filled bar (need level or goal progress) is first.
    return sortMode === 'level' ? shown.sort((a, b) => ratioOf(a) - ratioOf(b)) : shown;
  }, [needOrder, needs, now, azmConnected, azmByDay, azmGoal, sunlight, sortMode]);

  return (
    <View style={styles.group}>
      <View style={styles.header}>
        <CueSectionLabel>Needs</CueSectionLabel>
        <View style={styles.actions}>
          <Pressable
            onPress={() => setSortMode(sortMode === 'manual' ? 'level' : 'manual')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Change need sort order"
          >
            <Text
              numberOfLines={1}
              style={[styles.action, styles.sortAction]}
            >
              {sortMode === 'manual' ? '↕ Manual' : '↕ By %'}
            </Text>
          </Pressable>
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
        {rows.map(key => {
          if (key === 'azm')
            return (
              <AzmBarRow
                key={key}
                now={now}
              />
            );
          if (key === 'sunlight') {
            return (
              <SunlightBarRow
                key={key}
                sunlight={sunlight}
                onPress={() => navigation.navigate('Sunlight')}
              />
            );
          }
          const need = needs.find(item => item.id === key);
          if (!need) return null;
          return (
            <NeedBarRow
              key={key}
              needId={need.id}
              config={need.config}
              level={need.level}
              detail={
                need.timerFullInMs != null
                  ? formatTimerFull(need.timerFullInMs)
                  : formatNextCraving(need.level, need.config, now, ts => formatTime(ts))
              }
              timerNames={need.timerBehaviorNames}
              onPress={() =>
                need.id === 'tidiness'
                  ? navigation.navigate('Tidiness')
                  : navigation.navigate('Need', { needId: need.id })
              }
            />
          );
        })}
      </View>
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
  sortAction: { flexShrink: 0 },
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
