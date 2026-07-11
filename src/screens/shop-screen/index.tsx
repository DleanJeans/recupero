import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { BackButton } from '../../components/back-button';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Text } from '../../components/text';
import { useBehaviorStore } from '../../store/behavior-store';
import { useShopStore } from '../../store/shop-store';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import {
  formatVnd,
  getMoneyBalance,
  getTotalMoneyEarned,
  getTotalMoneyPenalties,
  getTotalMoneySpent,
  parseVndInput,
} from '../../utils/money-utils';
import { AddShopItemForm } from './components/add-shop-item-form';
import { PurchaseLogRow } from './components/purchase-log-row';
import { ShopItemRow } from './components/shop-item-row';

export function ShopScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const items = useShopStore(state => state.items);
  const purchases = useShopStore(state => state.purchases);
  const addItem = useShopStore(state => state.addItem);
  const updateItem = useShopStore(state => state.updateItem);
  const removeItem = useShopStore(state => state.removeItem);
  const buyItem = useShopStore(state => state.buyItem);
  const [itemName, setItemName] = useState('');
  const [itemCost, setItemCost] = useState('');

  const balance = useMemo(() => getMoneyBalance(behaviors, purchases), [behaviors, purchases]);
  const earned = useMemo(() => getTotalMoneyEarned(behaviors), [behaviors]);
  const penalties = useMemo(() => getTotalMoneyPenalties(behaviors), [behaviors]);
  const spent = useMemo(() => getTotalMoneySpent(purchases), [purchases]);
  const recentPurchases = useMemo(() => [...purchases].reverse(), [purchases]);

  const handleAddItem = () => {
    if (!addItem(itemName, parseVndInput(itemCost))) return;
    setItemName('');
    setItemCost('');
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <ScreenTitle>Shop</ScreenTitle>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available</Text>
          <Text
            selectable
            style={styles.balanceValue}
          >
            {formatVnd(balance)}
          </Text>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>Earned {formatVnd(earned)}</Text>
            <Text style={styles.stat}>Lost {formatVnd(penalties)}</Text>
            <Text style={styles.stat}>Spent {formatVnd(spent)}</Text>
          </View>
        </View>

        <AddShopItemForm
          name={itemName}
          cost={itemCost}
          onNameChange={setItemName}
          onCostChange={setItemCost}
          onAdd={handleAddItem}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {items.length === 0 ? (
            <Text style={styles.empty}>Add a reward to start your shop.</Text>
          ) : (
            items.map(item => (
              <ShopItemRow
                key={item.id}
                item={item}
                balance={balance}
                onBuy={() => buyItem(item.id, balance)}
                onEdit={(name, cost) => updateItem(item.id, name, cost)}
                onDelete={() =>
                  Alert.alert('Delete reward?', `Remove "${item.name}" from your shop?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => removeItem(item.id) },
                  ])
                }
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Purchase log</Text>
          {recentPurchases.length === 0 ? (
            <Text style={styles.empty}>Bought items will appear here.</Text>
          ) : (
            <View style={styles.purchaseList}>
              {recentPurchases.map(purchase => (
                <PurchaseLogRow
                  key={purchase.id}
                  purchase={purchase}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
  content: {
    gap: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  balanceCard: {
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    gap: 6,
    padding: 18,
  },
  balanceLabel: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  balanceValue: {
    color: Colors.type.desirable,
    fontSize: 30,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    color: Colors.text.muted,
    fontSize: 12,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  empty: {
    color: Colors.text.faint,
    fontSize: 14,
    paddingVertical: 8,
  },
  purchaseList: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
});
