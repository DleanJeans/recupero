import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { BackButton } from '../../components/back-button';
import { Button } from '../../components/button';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Text } from '../../components/text';
import { useBehaviorStore } from '../../store/behavior-store';
import { useShopStore } from '../../store/shop-store';
import type { RootStackParamList } from '../../types/navigation';
import type { ShopItem } from '../../types/shop';
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
import { MoneyLogSection } from './components/money-log-section';
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
  const undoPurchase = useShopStore(state => state.undoPurchase);
  const [itemName, setItemName] = useState('');
  const [itemCost, setItemCost] = useState('');
  const [itemOneTime, setItemOneTime] = useState(false);
  const [itemFormMode, setItemFormMode] = useState<'add' | { type: 'edit'; itemId: string } | null>(null);

  const balance = useMemo(() => getMoneyBalance(behaviors, purchases), [behaviors, purchases]);
  const earned = useMemo(() => getTotalMoneyEarned(behaviors), [behaviors]);
  const penalties = useMemo(() => getTotalMoneyPenalties(behaviors), [behaviors]);
  const spent = useMemo(() => getTotalMoneySpent(purchases), [purchases]);
  const recentPurchases = useMemo(() => [...purchases].reverse(), [purchases]);

  const resetItemForm = () => {
    setItemName('');
    setItemCost('');
    setItemOneTime(false);
    setItemFormMode(null);
  };

  const handleSubmitItem = () => {
    if (itemFormMode == null) return;
    const cost = parseVndInput(itemCost);
    const saved =
      itemFormMode === 'add'
        ? addItem(itemName, cost, itemOneTime)
        : updateItem(itemFormMode.itemId, itemName, cost, itemOneTime);
    if (saved) resetItemForm();
  };

  const handleEditItem = (item: ShopItem) => {
    setItemName(item.name);
    setItemCost(String(item.cost));
    setItemOneTime(item.oneTime === true);
    setItemFormMode({ type: 'edit', itemId: item.id });
  };

  const handleDeleteItem = (item: ShopItem) => {
    Alert.alert('Delete reward?', `Remove "${item.name}" from your shop?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeItem(item.id);
          if (itemFormMode !== 'add' && itemFormMode?.itemId === item.id) resetItemForm();
        },
      },
    ]);
  };

  const handleBuyItem = (item: ShopItem) => {
    Alert.alert('Buy reward?', `Spend ${formatVnd(item.cost)} on "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Buy', onPress: () => buyItem(item.id, balance) },
    ]);
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
            <Text style={[styles.stat, styles.earnedStat]}>Earned {formatVnd(earned)}</Text>
            <Text style={[styles.stat, styles.lostStat]}>Lost {formatVnd(penalties)}</Text>
            <Text style={[styles.stat, styles.spentStat]}>Spent {formatVnd(spent)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items</Text>
            {itemFormMode == null && (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  setItemName('');
                  setItemCost('');
                  setItemOneTime(false);
                  setItemFormMode('add');
                }}
              >
                Add Item
              </Button>
            )}
          </View>
          {itemFormMode && (
            <AddShopItemForm
              name={itemName}
              cost={itemCost}
              onNameChange={setItemName}
              onCostChange={setItemCost}
              onSubmit={handleSubmitItem}
              onCancel={resetItemForm}
              oneTime={itemOneTime}
              onOneTimeChange={() => setItemOneTime(value => !value)}
              title={itemFormMode === 'add' ? 'Add item' : 'Edit item'}
              submitLabel={itemFormMode === 'add' ? 'Add item' : 'Save'}
            />
          )}
          {items.length === 0 ? (
            <Text style={styles.empty}>Add a reward to start your shop.</Text>
          ) : (
            items.map(item => (
              <ShopItemRow
                key={item.id}
                item={item}
                balance={balance}
                onBuy={() => handleBuyItem(item)}
                onEdit={() => handleEditItem(item)}
                onDelete={() => handleDeleteItem(item)}
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
                  onUndo={() => undoPurchase(purchase.id)}
                />
              ))}
            </View>
          )}
        </View>

        <MoneyLogSection
          behaviors={behaviors}
          purchases={purchases}
        />
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
    fontSize: 12,
  },
  earnedStat: {
    color: Colors.type.desirable,
  },
  lostStat: {
    color: Colors.type.undesirable,
  },
  spentStat: {
    color: Colors.type.neutral,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
