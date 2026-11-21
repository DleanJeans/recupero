import { TimePickerSheet } from '@elik56a/react-native-pickers';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { formatClockTime } from '../../../utils/clock-time-utils';
import { Colors } from '../../../utils/colors';

interface TimePickerProps {
  label: string;
  hour: number;
  minute: number;
  second: number;
  maxHour: number;
  maxMinute: number;
  maxSecond: number;
  showSeconds: boolean;
  /** Called with the picked time of day in seconds. */
  onTimeChange: (totalSeconds: number) => void;
}

const PICKER_THEME = {
  dark: true,
  colors: {
    background: Colors.bg.card,
    surface: Colors.bg.input,
    sheet: Colors.bg.card,
    text: Colors.text.primary,
    textSecondary: Colors.text.light,
    textDisabled: Colors.text.dim,
    indicator: Colors.bg.elevated,
  },
};

function TimePickerComponent({
  label,
  hour,
  minute,
  second,
  maxHour,
  maxMinute,
  maxSecond,
  showSeconds,
  onTimeChange,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => new Date(2000, 0, 1, hour, minute, second), [hour, minute, second]);
  const maxTime = useMemo(
    () => new Date(2000, 0, 1, maxHour, maxMinute, showSeconds ? maxSecond : 0),
    [maxHour, maxMinute, maxSecond, showSeconds],
  );
  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);
  const handleConfirm = useCallback(
    (picked: Date) => {
      setOpen(false);
      const total = picked.getHours() * 3600 + picked.getMinutes() * 60 + (showSeconds ? picked.getSeconds() : 0);
      const max = maxHour * 3600 + maxMinute * 60 + (showSeconds ? maxSecond : 0);
      onTimeChange(Math.min(total, max));
    },
    [maxHour, maxMinute, maxSecond, onTimeChange, showSeconds],
  );

  return (
    <>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.timeRow}>
        <Pressable
          onPress={handleOpen}
          accessibilityLabel={`${label} time`}
          hitSlop={8}
        >
          <Text
            style={styles.timeText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatClockTime(hour, minute, second, showSeconds)}
          </Text>
        </Pressable>
      </View>
      <TimePickerSheet
        visible={open}
        onClose={handleClose}
        onConfirm={handleConfirm}
        value={value}
        title={label}
        presentation="modal"
        format="24h"
        showSeconds={showSeconds}
        maxTime={maxTime}
        design="material"
        theme={PICKER_THEME}
      />
    </>
  );
}

export const TimePicker = memo(TimePickerComponent);

const styles = StyleSheet.create({
  sectionLabel: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: 'center',
  },
  timeRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  timeText: {
    color: Colors.text.primary,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
