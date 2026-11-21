import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../../utils/colors';
import { getTidyColor, TIDY_LOW_LINE } from '../../../utils/tidiness-utils';

interface TidyBarProps {
  level: number | undefined;
  height?: number;
  /** Draws the tick at the low line, like need bars. */
  showLine?: boolean;
}

/** A level bar that fills from the left in the level's tone. */
export function TidyBar({ level, height = 8, showLine }: TidyBarProps) {
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      {level != null && (
        <View
          style={[
            styles.fill,
            { width: `${Math.max(2, level)}%`, backgroundColor: getTidyColor(level), borderRadius: height / 2 },
          ]}
        />
      )}
      {showLine && <View style={[styles.tick, { left: `${TIDY_LOW_LINE}%` }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1, minWidth: 40, backgroundColor: Colors.bg.input, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  tick: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: Colors.border.light },
});
