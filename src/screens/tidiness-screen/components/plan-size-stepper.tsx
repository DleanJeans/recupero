import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

interface PlanSizeStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

/** "Width − 12 +": one side of the floor plan, in squares. */
export function PlanSizeStepper({ label, value, onChange }: PlanSizeStepperProps) {
  return (
    <View style={styles.box}>
      <Text
        style={styles.label}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => onChange(value - 1)}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`Smaller ${label.toLowerCase()}`}
      >
        <Ionicons
          name="remove"
          size={18}
          color={Colors.text.primary}
        />
      </Pressable>
      <Text
        style={styles.value}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => onChange(value + 1)}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`Bigger ${label.toLowerCase()}`}
      >
        <Ionicons
          name="add"
          size={18}
          color={Colors.text.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.primary,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  label: { flex: 1, color: Colors.text.light, fontSize: 13, fontWeight: '600' },
  button: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.bg.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  value: {
    minWidth: 26,
    flexShrink: 0,
    textAlign: 'center',
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
