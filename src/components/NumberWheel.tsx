import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';
import { Text } from './Text';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

interface Props {
  values: string[];
  initialIndex: number;
  onChange: (index: number) => void;
}

export function NumberWheel({ values, initialIndex, onChange }: Props) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [initialIndex]);

  const onScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const index = Math.max(0, Math.min(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT), values.length - 1));
      onChange(index);
    },
    [onChange, values.length],
  );

  return (
    <View style={styles.container}>
      <View style={styles.highlight} pointerEvents="none" />
      <ScrollView
        ref={ref}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{ paddingVertical: PAD }}
      >
        {values.map(v => (
          <View key={v} style={styles.item}>
            <Text style={styles.text}>{v}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 64, height: ITEM_HEIGHT * VISIBLE_ITEMS, overflow: 'hidden' },
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
  item: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  text: { color: Colors.text.secondary, fontSize: 22, fontVariant: ['tabular-nums'] },
});
