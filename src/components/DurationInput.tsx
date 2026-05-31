import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

const ALL_DAYS = Array.from(
  {
    length: 31,
  },
  (_, i) => pad2(i),
);
const ALL_HOURS = Array.from(
  {
    length: 24,
  },
  (_, i) => pad2(i),
);
const ALL_MINUTES = Array.from(
  {
    length: 60,
  },
  (_, i) => pad2(i),
);

interface WheelProps {
  values: string[];
  initialIndex: number;
  onChange: (index: number) => void;
}

function Wheel({ values, initialIndex, onChange }: WheelProps) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.scrollTo({
        y: initialIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [
    initialIndex,
  ]);

  const onScrollEnd = useCallback(
    (e: {
      nativeEvent: {
        contentOffset: {
          y: number;
        };
      };
    }) => {
      const index = Math.max(0, Math.min(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT), values.length - 1));
      onChange(index);
    },
    [
      onChange,
      values.length,
    ],
  );

  return (
    <View style={wStyles.container}>
      <View
        style={wStyles.highlight}
        pointerEvents="none"
      />
      <ScrollView
        ref={ref}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{
          paddingVertical: PAD,
        }}
      >
        {values.map((v) => (
          <View
            key={v}
            style={wStyles.item}
          >
            <Text style={wStyles.text}>{v}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const wStyles = StyleSheet.create({
  container: {
    width: 64,
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#ccc',
    fontSize: 22,
    fontVariant: [
      'tabular-nums',
    ],
  },
});

interface Props {
  totalMinutes: number;
  onChange: (totalMinutes: number) => void;
}

export function DurationInput({ totalMinutes, onChange }: Props) {
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const handleDaysChange = (index: number) => {
    const newTotalMinutes = index * 24 * 60 + hours * 60 + minutes;
    onChange(newTotalMinutes);
  };

  const handleHoursChange = (index: number) => {
    const newTotalMinutes = days * 24 * 60 + index * 60 + minutes;
    onChange(newTotalMinutes);
  };

  const handleMinutesChange = (index: number) => {
    const newTotalMinutes = days * 24 * 60 + hours * 60 + index;
    onChange(newTotalMinutes);
  };

  return (
    <View style={styles.container}>
      <View style={styles.wheels}>
        <View style={styles.wheelWrapper}>
          <Wheel
            values={ALL_DAYS}
            initialIndex={days}
            onChange={handleDaysChange}
          />
          <Text style={styles.label}>days</Text>
        </View>
        <Text style={styles.separator}>:</Text>
        <View style={styles.wheelWrapper}>
          <Wheel
            values={ALL_HOURS}
            initialIndex={hours}
            onChange={handleHoursChange}
          />
          <Text style={styles.label}>hrs</Text>
        </View>
        <Text style={styles.separator}>:</Text>
        <View style={styles.wheelWrapper}>
          <Wheel
            values={ALL_MINUTES}
            initialIndex={minutes}
            onChange={handleMinutesChange}
          />
          <Text style={styles.label}>min</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  wheelWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  separator: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  label: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
});
