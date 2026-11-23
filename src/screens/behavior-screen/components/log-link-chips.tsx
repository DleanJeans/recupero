import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppIcon } from '../../../components/app-icon';
import { Text } from '../../../components/text';
import { useLinkTargets } from '../../../hooks/use-link-targets';
import type { LogEntry, MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { buildLogLinkChips, LINK_TYPE_EMOJIS } from '../../../utils/metadata-link-utils';

interface LogLinkChipsProps {
  fields: MetadataField[];
  metadata: LogEntry['metadata'];
}

/** The task, behavior and person a log is linked to, as small chips on the log card. */
export function LogLinkChips({ fields, metadata }: LogLinkChipsProps) {
  const targets = useLinkTargets();
  const chips = useMemo(() => buildLogLinkChips(fields, metadata, targets), [fields, metadata, targets]);
  if (chips.length === 0) return null;
  return (
    <View style={styles.row}>
      {chips.map(chip => (
        <View
          key={chip.key}
          style={styles.chip}
          accessibilityLabel={`${chip.fieldLabel}: ${chip.label}`}
        >
          <AppIcon
            value={chip.icon ?? ''}
            size={14}
            fallback={LINK_TYPE_EMOJIS[chip.type]}
          />
          <Text
            style={[styles.text, chip.missing && styles.missing]}
            numberOfLines={1}
          >
            {chip.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexShrink: 1,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: { flexShrink: 1, color: Colors.text.secondary, fontSize: 12, fontWeight: '600' },
  missing: { color: Colors.text.faint, fontStyle: 'italic' },
});
