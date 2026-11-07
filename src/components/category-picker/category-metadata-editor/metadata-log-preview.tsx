import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BehaviorLogItem } from '../../../screens/behavior-screen/components/behavior-log-item';
import type { BehaviorEntry, LogEntry, MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { Text } from '../../text';

interface Props {
  behavior: BehaviorEntry;
  log: LogEntry;
  fields: MetadataField[];
}

const noop = () => {};

/** Shows the category's latest log as it will look in the log list, using the unsaved field settings. */
export function MetadataLogPreview({ behavior, log, fields }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Log card preview · <Text style={styles.behaviorName}>{behavior.name}</Text>
      </Text>
      <BehaviorLogItem
        behavior={behavior}
        log={log}
        metadataFields={fields}
        elapsedTick={0}
        onEdit={noop}
        style={styles.card}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  behaviorName: {
    color: Colors.text.muted,
    textTransform: 'none',
    letterSpacing: 0,
  },
  card: {
    marginHorizontal: 0,
    marginVertical: 0,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
});
