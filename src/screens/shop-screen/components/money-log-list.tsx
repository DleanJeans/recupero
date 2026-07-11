import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useAfterInteractionsFlag } from '../../../hooks/use-after-interactions-flag';
import type { BehaviorEntry } from '../../../types/behavior';
import type { ShopPurchase } from '../../../types/shop';
import { Colors } from '../../../utils/colors';
import { getMoneyLogTransactions } from '../../../utils/money-utils';
import { MoneyLogRow } from './money-log-row';

interface Props {
  behaviors: BehaviorEntry[];
  purchases: ShopPurchase[];
}

export function MoneyLogList({ behaviors, purchases }: Props) {
  const ready = useAfterInteractionsFlag([behaviors, purchases]);
  const transactions = useMemo(
    () => (ready ? getMoneyLogTransactions(behaviors, purchases) : []),
    [behaviors, purchases, ready],
  );

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          color={Colors.text.faint}
          size="small"
        />
        <Text style={styles.loadingText}>Loading money log...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={transactions}
      keyExtractor={transaction => transaction.id}
      renderItem={({ item }) => <MoneyLogRow transaction={item} />}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
      removeClippedSubviews
      ListEmptyComponent={<Text style={styles.empty}>No money-affecting behavior logs yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: Colors.text.faint,
    fontSize: 13,
  },
  list: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 32,
  },
  empty: {
    color: Colors.text.faint,
    fontSize: 14,
    paddingVertical: 8,
  },
});
