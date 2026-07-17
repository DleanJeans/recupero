import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { MoneyBalance } from '../../../components/money-balance';
import { Text } from '../../../components/text';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { StatsIcon } from './stats-icon';

interface HomeHeaderProps {
  showXp: boolean;
  onToggleXp: () => void;
  isSearching: boolean;
  onSearchPress: () => void;
}

export function HomeHeader({ showXp, onToggleXp, isSearching, onSearchPress }: HomeHeaderProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.titleRow}>
      <Text style={styles.title}>Recupero</Text>
      <View style={styles.titleActions}>
        <View style={styles.iconActions}>
          <HeaderIcon
            icon={
              <StatsIcon
                size={22}
                active={showXp}
              />
            }
            onPress={onToggleXp}
            accessibilityLabel={showXp ? 'Hide XP' : 'Show XP'}
          />
          <HeaderIcon
            name={isSearching ? 'search' : 'search-outline'}
            onPress={onSearchPress}
            accessibilityLabel={isSearching ? 'Close search' : 'Search'}
          />
          <HeaderIcon
            name="radio-outline"
            onPress={() => navigation.navigate('Cues')}
            accessibilityLabel="Cues"
          />
          <HeaderIcon
            name="settings-outline"
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Settings"
          />
        </View>
        <MoneyBalance />
      </View>
    </View>
  );
}

interface HeaderIconProps {
  icon?: React.ReactNode;
  name?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
}

function HeaderIcon({ icon, name, onPress, accessibilityLabel }: HeaderIconProps) {
  return (
    <Button
      variant="icon"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      {icon ??
        (name ? (
          <Ionicons
            name={name}
            size={22}
            color={Colors.text.muted}
          />
        ) : null)}
    </Button>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  titleActions: {
    alignItems: 'flex-end',
    gap: 12,
  },
  iconActions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
});
