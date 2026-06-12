import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BehaviorEntry } from '../types/behavior';
import { Colors } from '../utils/colors';
import { BehaviorIcon } from './BehaviorIcon';
import { CooldownLabel } from './CooldownLabel';
import { ScreenTitle } from './ScreenTitle';
import { XpBar } from './XpBar';

interface Props {
  behavior: BehaviorEntry;
  /** Override the displayed name (e.g. "Edit Time" instead of behavior.name). */
  titleOverride?: string;
  /** Icon size. Defaults to 24. */
  iconSize?: number;
}

export function BehaviorTitle({ behavior, titleOverride, iconSize = 24 }: Props) {
  const color = Colors.type[behavior.type] ?? Colors.type.neutral;
  const title = titleOverride ?? behavior.name;

  return (
    <View style={styles.titleContainer}>
      <View style={styles.titleRow}>
        <ScreenTitle>
          <BehaviorIcon
            behavior={behavior}
            size={iconSize}
          />{' '}
          {title}
        </ScreenTitle>
        <CooldownLabel behavior={behavior} />
      </View>
      <View style={styles.xpBarWrapper}>
        <XpBar
          logCount={behavior.logs.length}
          color={color}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flex: 1,
    paddingRight: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpBarWrapper: {
    marginHorizontal: 12,
  },
});
