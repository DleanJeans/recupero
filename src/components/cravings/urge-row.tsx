import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { CopingUrgeItem } from '../../hooks/use-coping-urges';
import { useSettingsStore } from '../../store/settings-store';
import { Colors } from '../../utils/colors';
import { NEED_INFO } from '../../utils/need-utils';
import { formatElapsedNumeric, formatTime } from '../../utils/time-utils';
import { formatCrossesAt, getUrgeTone, type UrgeTone } from '../../utils/urge-utils';
import { BehaviorIcon } from '../behavior-icon';
import { StripedProgressBar } from '../striped-progress-bar';
import { Text } from '../text';

export const URGE_TONE_COLORS: Record<UrgeTone, string> = {
  past: Colors.type.undesirable,
  near: '#fb923c',
  calm: Colors.type.neutral,
};

interface UrgeRowProps {
  item: CopingUrgeItem;
  now: number;
  /** Shows "copes for <need>" in the detail line. Off when the row already sits under that need. */
  showCopesFor?: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

/** One coping behaviour as a bar that rises since it was last done. Tap rides it out, long-press edits it. */
export function UrgeRow({ item, now, showCopesFor = true, onPress, onLongPress }: UrgeRowProps) {
  const hidePrivate = useSettingsStore(state => state.hidePrivate);
  const { urge, behavior, state } = item;
  const tone = getUrgeTone(state.level, urge.line);
  const color = URGE_TONE_COLORS[tone];
  const pct = Math.round(state.level);
  const name = hidePrivate && behavior.private ? 'Private' : behavior.name;

  const parts: string[] = [];
  if (state.crossesLineAt == null) parts.push('Past your line');
  else parts.push(`Hits line ${formatCrossesAt(state.crossesLineAt, now, ts => formatTime(ts))}`);
  const need = urge.copesFor ? NEED_INFO[urge.copesFor] : undefined;
  if (showCopesFor && need) parts.push(`copes for ${need.label}`);
  else parts.push(state.lastDoneAt ? `${formatElapsedNumeric(state.lastDoneAt, now)} ago` : 'not done yet');

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${name} urge ${pct}%. Tap to ride it out, long press to edit.`}
    >
      <BehaviorIcon
        behavior={behavior}
        size={26}
      />
      <View style={styles.main}>
        <View style={styles.top}>
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {name}
          </Text>
          <View style={styles.track}>
            <StripedProgressBar
              ratio={state.level / 100}
              color={color}
              direction={1}
              height={10}
              motionEnabled={tone === 'past'}
            />
            <View style={[styles.tick, { left: `${urge.line}%` }]} />
          </View>
          <Text
            style={[styles.pct, { color }]}
            numberOfLines={1}
          >
            {pct}%
          </Text>
        </View>
        <Text
          style={[styles.detail, tone === 'past' && { color }]}
          numberOfLines={1}
        >
          {parts.join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  pressed: { opacity: 0.7 },
  main: { flex: 1, minWidth: 0, gap: 3 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { width: 112, color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
  track: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  tick: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  pct: { minWidth: 40, flexShrink: 0, textAlign: 'right', fontSize: 13, fontWeight: '700' },
  detail: { color: Colors.text.muted, fontSize: 11.5 },
});
