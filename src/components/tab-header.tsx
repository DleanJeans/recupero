import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MoneyBalance } from './money-balance';
import { ScreenTitle } from './screen-title';
import { TabHeaderMenu } from './tab-header-menu';

interface TabHeaderProps {
  title: string;
  /** Screen-specific icon buttons, shown before the menu. */
  actions?: React.ReactNode;
}

/** Shared header of the five bottom-nav tabs: title, optional actions, balance and the "..." menu in the same spot. */
export function TabHeader({ title, actions }: TabHeaderProps) {
  return (
    <View style={styles.header}>
      <ScreenTitle style={styles.title}>{title}</ScreenTitle>
      {actions}
      <MoneyBalance />
      <TabHeaderMenu />
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
