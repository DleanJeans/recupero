import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSettingsStore } from '../../store/settings-store';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { BackButton } from '../back-button';
import { Button } from '../button';
import { MoneyBalance } from '../money-balance';
import { ScreenTitle } from '../screen-title';

interface CueScreenHeaderProps {
  title: string;
  showBalance?: boolean;
  /** Cog button that opens Settings. */
  showSettings?: boolean;
}

export function CueScreenHeader({ title, showBalance = true, showSettings = false }: CueScreenHeaderProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const moneyRewardsEnabled = useSettingsStore(state => state.moneyRewardsEnabled);

  return (
    <View style={styles.header}>
      <BackButton />
      <ScreenTitle style={styles.title}>{title}</ScreenTitle>
      {showSettings && (
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
      )}
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
