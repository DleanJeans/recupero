import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
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
  const transactions = useMemo(() => getMoneyLogTransactions(behaviors, purchases), [behaviors, purchases]);

  if (transactions.length === 0) {
    return <Text style={styles.empty}>No money-affecting behavior logs yet.</Text>;
  }

  return (
    <View style={styles.list}>
      {transactions.map(transaction => (
        <MoneyLogRow
          key={transaction.id}
          transaction={transaction}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  empty: {
    color: Colors.text.faint,
    fontSize: 14,
    paddingVertical: 8,
  },
});
