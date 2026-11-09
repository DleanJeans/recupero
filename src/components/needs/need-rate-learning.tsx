import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNeedsStore } from '../../store/needs-store';
import type { NeedId } from '../../types/need';
import { Colors } from '../../utils/colors';
import { getRateLearningPoints, NEED_CHART_COLORS } from '../../utils/need-history-utils';
import { DEFAULT_NEED_CONFIGS, formatEmptyHours } from '../../utils/need-utils';
import { formatCompactDate } from '../../utils/time-utils';
import { CueSectionLabel } from '../cues/cue-section-label';
import { Text } from '../text';
import { NeedLineChart } from './charts/need-line-chart';

interface NeedRateLearningProps {
  needId: NeedId;
}

/** "How it learned": hours to empty after each check-in that changed it, starting from the default. */
export function NeedRateLearning({ needId }: NeedRateLearningProps) {
  const history = useNeedsStore(state => state.rateHistory[needId]);
  const config = useNeedsStore(state => state.needs[needId]);
  const resetLearning = useNeedsStore(state => state.resetLearning);
  const defaultHours = DEFAULT_NEED_CONFIGS[needId].emptyHours;
  const points = useMemo(() => getRateLearningPoints(history ?? [], defaultHours), [defaultHours, history]);
  const values = points.map(point => point.emptyHours);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(1, hi - lo);
  const color = NEED_CHART_COLORS[needId];
  const first = points.find(point => point.ts != null)?.ts;

  return (
    <View style={styles.container}>
      <CueSectionLabel>How it learned</CueSectionLabel>
      {points.length < 2 ? (
        <Text style={styles.text}>
          Still on the default of {formatEmptyHours(defaultHours)} full to empty. Each check-in can move it by up to
          15%.
        </Text>
      ) : (
        <>
          <NeedLineChart
            xMin={0}
            xMax={points.length - 1}
            yMin={lo - span * 0.25}
            yMax={hi + span * 0.25}
            height={90}
            series={[{ key: 'rate', color, points: points.map(point => ({ x: point.index, y: point.emptyHours })) }]}
            guideY={defaultHours}
            guideColor={Colors.text.muted}
            dots={points.map(point => ({ key: `${point.index}`, x: point.index, y: point.emptyHours, color }))}
          />
          <Text style={styles.text}>
            Started at {formatEmptyHours(defaultHours)} (dashed). Now {formatEmptyHours(config.emptyHours)} full to
            empty, after {points.length - 1} change{points.length === 2 ? '' : 's'}
            {first ? ` since ${formatCompactDate(first)}` : ''}.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.reset, pressed && styles.pressed]}
            onPress={() => resetLearning(needId)}
            accessibilityRole="button"
          >
            <Text style={styles.resetText}>Reset to {formatEmptyHours(defaultHours)}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  text: {
    color: Colors.text.muted,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 4,
  },
  reset: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: Colors.bg.input,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  resetText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
