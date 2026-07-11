import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import type { MoneyLogTransaction } from '../../../utils/money-utils';
import { formatVnd } from '../../../utils/money-utils';
import { formatCompactDate, formatTimeRange } from '../../../utils/time-utils';

interface Props {
  transaction: MoneyLogTransaction;
}

export function MoneyLogRow({ transaction }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.details}>
        <Text
          selectable
          style={styles.name}
          numberOfLines={1}
        >
          {transaction.behaviorName}
        </Text>
        <Text style={styles.date}>
          {formatCompactDate(transaction.log.timestamp)} ·{' '}
          {formatTimeRange(transaction.log.timestamp, transaction.log.endTimestamp)}
        </Text>
      </View>
      <View style={styles.values}>
        <Text
          selectable
          style={[styles.amount, transaction.amount > 0 ? styles.earned : styles.lost]}
        >
          {transaction.amount > 0 ? '+' : '-'}
          {formatVnd(Math.abs(transaction.amount))}
        </Text>
        <Text
          selectable
          style={styles.balance}
        >
          Balance {formatVnd(transaction.balanceAfter)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  details: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  date: {
    color: Colors.text.faint,
    fontSize: 12,
  },
  values: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  earned: {
    color: Colors.type.desirable,
  },
  lost: {
    color: Colors.type.undesirable,
  },
  balance: {
    color: Colors.text.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
