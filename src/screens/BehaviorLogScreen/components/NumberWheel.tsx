import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/Text';
import { Colors } from '../../../utils/colors';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

interface Props {
  values: string[];
  initialIndex: number;
  resetKey: number;
  onChange: (index: number) => void;
}

function NumberWheelComponent({ values, initialIndex, resetKey, onChange }: Props) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialIndex, resetKey]);

  const onScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const index = Math.max(0, Math.min(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT), values.length - 1));
      onChange(index);
    },
    [onChange, values.length],
  );

  const items = useMemo(
    () =>
      values.map(v => (
        <View
          key={v}
          style={styles.item}
        >
          <Text style={styles.text}>{v}</Text>
        </View>
      )),
    [values],
  );

  return (
    <View style={styles.container}>
      <View
        style={styles.highlight}
        pointerEvents="none"
      />
      <ScrollView
        ref={ref}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={styles.content}
        contentOffset={{ x: 0, y: initialIndex * ITEM_HEIGHT }}
        removeClippedSubviews
      >
        {items}
      </ScrollView>
    </View>
  );
}

export const NumberWheel = memo(NumberWheelComponent);

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
  content: { paddingVertical: PAD },
  item: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  text: { color: Colors.text.secondary, fontSize: 22, fontVariant: ['tabular-nums'] },
});
