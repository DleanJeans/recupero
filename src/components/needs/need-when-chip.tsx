import { Ionicons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { formatUpdateWhen, formatWhenAgo, NEED_UPDATE_WHEN_MINUTES } from '../../utils/need-utils';
import { formatTime } from '../../utils/time-utils';
import { Text } from '../text';

const IS_ANDROID = process.env.EXPO_OS === 'android';
const MENU_WIDTH = 220;
/** Rough menu height, to open it above the chip when it would run off the bottom. */
const MENU_HEIGHT = 270;

interface NeedWhenChipProps {
  /** Picked time, or undefined for Now. */
  value: number | undefined;
  onChange: (ts: number | undefined) => void;
  now: number;
}

/** "🕘 Now ▾" chip: picks when an unlogged top-up happened (a few minutes ago, or any date and time). */
export function NeedWhenChip({ value, onChange, now }: NeedWhenChipProps) {
  const chipRef = useRef<View>(null);
  const [menuTop, setMenuTop] = useState<number>();
  const { width, height } = useWindowDimensions();

  const openMenu = () =>
    chipRef.current?.measureInWindow((_x, y, _w, h) => {
      setMenuTop(y + h + 4 + MENU_HEIGHT > height ? Math.max(8, y - 4 - MENU_HEIGHT) : y + h + 4);
    });
  const closeMenu = () => setMenuTop(undefined);

  const pickDateTime = () => {
    closeMenu();
    const start = new Date(value ?? Date.now());
    DateTimePickerAndroid.open({
      value: start,
      mode: 'date',
      maximumDate: new Date(),
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        const day = date;
        DateTimePickerAndroid.open({
          value: start,
          mode: 'time',
          is24Hour: false,
          onChange: (timeEvent, time) => {
            if (timeEvent.type !== 'set' || !time) return;
            const picked = new Date(
              day.getFullYear(),
              day.getMonth(),
              day.getDate(),
              time.getHours(),
              time.getMinutes(),
            );
            // A time later than now can't have happened yet, so it means now.
            onChange(picked.getTime() >= Date.now() ? undefined : picked.getTime());
          },
        });
      },
    });
  };

  const label = formatUpdateWhen(value, now, ts => formatTime(ts));
  const isNow = value == null;

  return (
    <>
      <Pressable
        ref={chipRef}
        onPress={openMenu}
        style={({ pressed }) => [styles.chip, !isNow && styles.chipSet, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`When: ${label}. Change time`}
      >
        <Ionicons
          name="time-outline"
          size={13}
          color={isNow ? Colors.text.secondary : COLOR_SET}
        />
        <Text
          style={[styles.chipText, !isNow && styles.chipTextSet]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Ionicons
          name="chevron-down"
          size={12}
          color={isNow ? Colors.text.muted : COLOR_SET}
        />
      </Pressable>
      <Modal
        visible={menuTop != null}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable
          style={styles.backdrop}
          onPress={closeMenu}
        >
          <View style={[styles.menu, { top: menuTop ?? 0, left: Math.max(16, width - MENU_WIDTH - 16) }]}>
            {NEED_UPDATE_WHEN_MINUTES.map(minutes => {
              const selected = minutes === 0 && isNow;
              return (
                <Pressable
                  key={minutes}
                  style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                  onPress={() => {
                    onChange(minutes === 0 ? undefined : Date.now() - minutes * 60000);
                    closeMenu();
                  }}
                  accessibilityRole="button"
                >
                  <Text
                    style={[styles.itemText, selected && styles.itemSelected]}
                    numberOfLines={1}
                  >
                    {formatWhenAgo(minutes)}
                  </Text>
                  <Text
                    style={styles.itemHint}
                    numberOfLines={1}
                  >
                    {selected ? '✓' : minutes === 0 ? '' : formatTime(now - minutes * 60000)}
                  </Text>
                </Pressable>
              );
            })}
            {IS_ANDROID ? (
              <Pressable
                style={({ pressed }) => [styles.item, styles.pickItem, pressed && styles.pressed]}
                onPress={pickDateTime}
                accessibilityRole="button"
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={COLOR_SET}
                />
                <Text
                  style={[styles.itemText, styles.pickText]}
                  numberOfLines={1}
                >
                  Pick date & time…
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const COLOR_SET = '#93c5fd';

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    backgroundColor: Colors.bg.input,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipSet: {
    backgroundColor: '#1e2a3a',
    borderColor: '#2c4a6e',
  },
  chipText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSet: {
    color: COLOR_SET,
  },
  pressed: {
    opacity: 0.6,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    backgroundColor: Colors.bg.elevated,
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  itemText: {
    color: Colors.text.primary,
    fontSize: 14,
    flexShrink: 1,
  },
  itemSelected: {
    color: Colors.typeText.desirable,
  },
  itemHint: {
    color: Colors.text.muted,
    fontSize: 12,
    flexShrink: 0,
  },
  pickItem: {
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: Colors.border.dim,
  },
  pickText: {
    color: COLOR_SET,
  },
});
