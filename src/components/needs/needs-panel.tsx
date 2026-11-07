import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNeedLevels } from '../../hooks/use-need-levels';
import type { NeedId } from '../../types/need';
import { Colors } from '../../utils/colors';
import { formatNextCraving } from '../../utils/need-utils';
import { formatTime } from '../../utils/time-utils';
import { CueSectionLabel } from '../cues/cue-section-label';
import { NeedBarRow } from './need-bar-row';
import { NeedSheet } from './need-sheet';

/** Hunger, Thirst, Hygiene and Energy bars at the top of the Cues tab. */
export function NeedsPanel() {
  const { needs, now } = useNeedLevels();
  const [openId, setOpenId] = useState<NeedId>();
  if (needs.length === 0) return null;

  return (
    <View style={styles.group}>
      <CueSectionLabel>Needs</CueSectionLabel>
      <View style={styles.card}>
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
      </View>
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
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
