import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { NeedId } from '../../../types/need';
import { Colors } from '../../../utils/colors';
import { NEED_IDS } from '../../../utils/need-utils';
import { CustomNeedModal } from './custom-need-modal';
import { NeedSettingsRow } from './need-settings-row';
import { NeedSourcePickerModal } from './need-source-picker-modal';
import { SunlightSettingsRow } from './sunlight-settings-row';

/** Needs: on/off, the learned decay rate, and which metadata field fills each need (Hunger from calories). */
export function NeedsSection() {
  const [picking, setPicking] = useState<NeedId>();
  const [editing, setEditing] = useState<{ needId?: NeedId }>();

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
            onEdit={id.startsWith('custom:') ? () => setEditing({ needId: id }) : undefined}
          />
        ))}
        <SunlightSettingsRow />
      </View>
      <Pressable
        style={({ pressed }) => [styles.add, pressed && styles.pressed]}
        onPress={() => setEditing({})}
        accessibilityRole="button"
      >
        <Text style={styles.addText}>＋ Add your own need</Text>
      </Pressable>
      <CustomNeedModal
        visible={editing != null}
        needId={editing?.needId}
        onClose={() => setEditing(undefined)}
        onAdded={setPicking}
      />
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
  add: { alignItems: 'center', paddingVertical: 14 },
  pressed: { opacity: 0.7 },
  addText: { color: Colors.status.success, fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
  },
});
