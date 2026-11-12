import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { NeedId } from '../../../types/need';
import { Colors } from '../../../utils/colors';
import { NEED_IDS } from '../../../utils/need-utils';
import { NeedSettingsRow } from './need-settings-row';
import { NeedSourcePickerModal } from './need-source-picker-modal';
import { SunlightSettingsRow } from './sunlight-settings-row';

/** Needs: on/off, the learned decay rate, and which metadata field fills each need (Hunger from calories). */
export function NeedsSection() {
  const [picking, setPicking] = useState<NeedId>();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>NEEDS</Text>
      <View style={styles.card}>
        {NEED_IDS.map((id, index) => (
          <NeedSettingsRow
            key={id}
            needId={id}
            first={index === 0}
            onPickSource={() => setPicking(id)}
          />
        ))}
        <SunlightSettingsRow />
      </View>
      <NeedSourcePickerModal
        needId={picking}
        onClose={() => setPicking(undefined)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionTitle: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
  },
});
