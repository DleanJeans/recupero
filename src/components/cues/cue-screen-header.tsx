import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSettingsStore } from '../../store/settings-store';
import { BackButton } from '../back-button';
import { MoneyBalance } from '../money-balance';
import { ScreenTitle } from '../screen-title';

interface CueScreenHeaderProps {
  title: string;
  showBalance?: boolean;
}

export function CueScreenHeader({ title, showBalance = true }: CueScreenHeaderProps) {
  const moneyRewardsEnabled = useSettingsStore(state => state.moneyRewardsEnabled);

  return (
    <View style={styles.header}>
      <BackButton />
      <ScreenTitle style={styles.title}>{title}</ScreenTitle>
      {showBalance && moneyRewardsEnabled ? <MoneyBalance /> : <View style={styles.trailingSpacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 24,
  },
  trailingSpacer: {
    width: 28,
  },
});
