import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { TODAY_FOCUS_LIMIT } from '../../../utils/task-utils';

interface FocusStreakStripProps {
  streak: number;
  pickedCount: number;
  doneCount: number;
  bonusEarned: boolean;
}

function getProgressText({ pickedCount, doneCount, bonusEarned }: FocusStreakStripProps): string {
  if (bonusEarned) return `All ${TODAY_FOCUS_LIMIT} done · streak day earned`;
  if (pickedCount === 0) return `Pick ${TODAY_FOCUS_LIMIT} tasks to start`;
  if (pickedCount < TODAY_FOCUS_LIMIT)
    return `${doneCount} of ${pickedCount} done · pick ${TODAY_FOCUS_LIMIT} for a streak day`;
  return `${doneCount} of ${pickedCount} done`;
}

/** Streak and Today's 3 progress. */
export function FocusStreakStrip(props: FocusStreakStripProps) {
  const { streak, doneCount } = props;
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
    backgroundColor: Colors.status.successLight,
  },
});
