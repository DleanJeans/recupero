import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';
import { Text } from './text';

interface StaticStarSlotProps {
  filled: boolean;
  threshold: number | null;
  size: number;
  color: string;
  emptyColor: string;
}

export function StaticStarSlot({ filled, threshold, size, color, emptyColor }: StaticStarSlotProps) {
  return (
    <View style={styles.slot}>
      <Text
        style={[styles.threshold, { color: filled ? color : Colors.text.muted }]}
        accessibilityLabel={`${threshold} logs to earn`}
      >
        {threshold}
      </Text>
      <View style={[styles.iconWrap, { width: size, height: size }]}>
        <Ionicons
          name={filled ? 'star' : 'star-outline'}
          size={size}
          color={filled ? color : emptyColor}
          accessibilityLabel={threshold == null ? 'star tier skipped' : filled ? 'star earned' : 'star not earned'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  threshold: {
    fontSize: 10,
    fontWeight: '600',
  },
  slot: {
    alignItems: 'center',
    overflow: 'visible',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
