import React from 'react';
import { View } from 'react-native';
import { Colors } from '../../utils/colors';
import type { SunlightStatusKind } from '../../utils/sunlight-utils';

export const SUNLIGHT_STATUS_COLORS: Record<SunlightStatusKind, string> = {
  counting: Colors.type.desirable,
  indoors: Colors.cue.location,
  sunDown: Colors.text.muted,
  unknown: Colors.text.faint,
  off: Colors.status.dangerLight,
};

/** A small dot that is green while the sunlight counter is running. */
export function SunlightStatusDot({ kind, size = 8 }: { kind: SunlightStatusKind; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: SUNLIGHT_STATUS_COLORS[kind] }}
    />
  );
}
