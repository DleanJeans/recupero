import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { FOCUS_BONUS_STARS, TODAY_FOCUS_LIMIT } from '../../../utils/task-utils';

interface FocusStreakStripProps {
  streak: number;
  pickedCount: number;
  doneCount: number;
  bonusEarned: boolean;
  starsToday: number;
}

function getProgressText({ pickedCount, doneCount, bonusEarned }: FocusStreakStripProps): string {
  if (bonusEarned) return `All ${TODAY_FOCUS_LIMIT} done · +${FOCUS_BONUS_STARS} bonus earned`;
  if (pickedCount === 0) return `Pick ${TODAY_FOCUS_LIMIT} tasks to start`;
  if (pickedCount < TODAY_FOCUS_LIMIT)
    return `${doneCount} of ${pickedCount} done · pick ${TODAY_FOCUS_LIMIT} for the bonus`;
  return `${doneCount} of ${pickedCount} done · +${FOCUS_BONUS_STARS} bonus at ${TODAY_FOCUS_LIMIT}`;
}

/** Streak, Today's 3 progress and stars earned on the day. */
export function FocusStreakStrip(props: FocusStreakStripProps) {
  const { streak, doneCount, starsToday } = props;
  return (
    <View style={styles.strip}>
      <Text style={styles.flame}>{streak > 0 ? '🔥' : '🎯'}</Text>
      <View style={styles.text}>
        <Text
          style={styles.title}
          numberOfLines={1}
        >
          {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
        </Text>
        <Text
          style={styles.sub}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {getProgressText(props)}
        </Text>
      </View>
      <View style={styles.dots}>
        {Array.from({ length: TODAY_FOCUS_LIMIT }).map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index < doneCount && styles.dotOn]}
          />
        ))}
      </View>
      <View
        style={styles.stars}
        accessibilityLabel={`${starsToday} stars on this date`}
      >
        <Ionicons
          name="star"
          size={14}
          color={Colors.star.filled}
        />
        <Text
          style={styles.starsText}
          numberOfLines={1}
        >
          {starsToday}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  flame: {
    fontSize: 22,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  sub: {
    color: Colors.text.muted,
    fontSize: 12,
    marginTop: 1,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  dot: {
    width: 16,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.bg.elevated,
  },
  dotOn: {
    backgroundColor: Colors.star.filled,
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
    minWidth: 32,
    justifyContent: 'flex-end',
  },
  starsText: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
