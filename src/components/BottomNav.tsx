import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { RootStackParamList } from '../types/navigation';
import { Colors } from '../utils/colors';
import { Text } from './Text';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const ITEMS: Array<{
  route: keyof Pick<RootStackParamList, 'Home' | 'Day' | 'Tasks'>;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  activeIcon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { route: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { route: 'Day', label: 'Day', icon: 'calendar-outline', activeIcon: 'calendar' },
  { route: 'Tasks', label: 'Tasks', icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle' },
];

export function BottomNav() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute();

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {ITEMS.map(item => {
          const active = route.name === item.route;
          return (
            <Pressable
              key={item.route}
              style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.pressed]}
              onPress={() => {
                if (!active) navigation.navigate(item.route);
              }}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                size={22}
                color={active ? Colors.text.primary : Colors.text.faint}
              />
              <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 8,
    backgroundColor: Colors.bg.primary,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 4,
  },
  item: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  itemActive: {
    backgroundColor: Colors.bg.input,
  },
  pressed: {
    opacity: 0.72,
  },
  label: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
  },
  labelActive: {
    color: Colors.text.primary,
  },
});
