import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
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

export function MoneyLogSection({ behaviors, purchases }: Props) {
  const [expanded, setExpanded] = useState(false);
  const transactions = useMemo(() => getMoneyLogTransactions(behaviors, purchases), [behaviors, purchases]);

  if (transactions.length === 0) return null;

  return (
    <View style={styles.section}>
      <Button
        variant="secondary"
        size="sm"
        onPress={() => setExpanded(value => !value)}
        accessibilityLabel={expanded ? 'Collapse money log' : 'Expand money log'}
        style={styles.toggle}
      >
        <View style={styles.toggleContent}>
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={Colors.text.light}
          />
          <Text style={styles.toggleLabel}>Money log</Text>
        </View>
      </Button>

      {expanded && (
        <View style={styles.list}>
          {transactions.map(transaction => (
            <MoneyLogRow
              key={transaction.id}
              transaction={transaction}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  toggle: {
    alignSelf: 'stretch',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    color: Colors.text.light,
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
});
