import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { RootStackParamList } from '../types/navigation';
import { Colors } from '../utils/colors';
import { Button } from './button';
import { MoneyBalance } from './money-balance';
import { ScreenTitle } from './screen-title';

interface TabHeaderProps {
  title: string;
  /** Screen-specific icon buttons, shown before the cog. */
  actions?: React.ReactNode;
}

/** Shared header of the five bottom-nav tabs: title, optional actions, balance and the Settings cog in the same spot. */
export function TabHeader({ title, actions }: TabHeaderProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.header}>
      <ScreenTitle style={styles.title}>{title}</ScreenTitle>
      {actions}
      <MoneyBalance />
      <Button
        variant="icon"
        onPress={() => navigation.navigate('Settings')}
        accessibilityLabel="Settings"
      >
        <Ionicons
          name="settings-outline"
          size={22}
          color={Colors.text.secondary}
        />
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 26,
    paddingHorizontal: 0,
  },
});
