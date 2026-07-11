import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BackButton } from '../../components/back-button';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { useBehaviorStore } from '../../store/behavior-store';
import { useShopStore } from '../../store/shop-store';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { MoneyLogList } from '../shop-screen/components/money-log-list';

export function MoneyLogScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const purchases = useShopStore(state => state.purchases);

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <ScreenTitle>Money Log</ScreenTitle>
      </View>
      <MoneyLogList
        behaviors={behaviors}
        purchases={purchases}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
});
