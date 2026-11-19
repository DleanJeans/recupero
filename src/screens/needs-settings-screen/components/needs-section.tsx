import React, { useEffect, useRef, useState } from 'react';
import { Pressable, type ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { NeedId } from '../../../types/need';
import { Colors } from '../../../utils/colors';
import { NEED_IDS } from '../../../utils/need-utils';
import { CustomNeedModal } from './custom-need-modal';
import { NeedSettingsRow } from './need-settings-row';
import { NeedSortRow } from './need-sort-row';
import { NeedSourcePickerModal } from './need-source-picker-modal';
import { SunlightSettingsRow } from './sunlight-settings-row';

/** Needs: on/off, the learned decay rate, and which metadata field fills each need (Hunger from calories). */
interface NeedsSectionProps {
  /** Need to scroll into view when the screen opens (from the cog on a need screen). */
  focusNeedId?: NeedId;
  scrollRef?: React.RefObject<ScrollView | null>;
}

export function NeedsSection({ focusNeedId, scrollRef }: NeedsSectionProps) {
  const rowRefs = useRef<Record<string, View | null>>({});
  const [picking, setPicking] = useState<NeedId>();
  const [sorting, setSorting] = useState(false);
  const [editing, setEditing] = useState<{ needId?: NeedId }>();

  useEffect(() => {
    const row = focusNeedId ? rowRefs.current[focusNeedId] : undefined;
    const scroll = scrollRef?.current;
    if (!row || !scroll) return;
    const timer = setTimeout(() => {
      row.measureLayout(
        scroll.getInnerViewNode() as never,
        (_x, y) => scroll.scrollTo({ y: Math.max(0, y - 8), animated: true }),
        () => {},
      );
    }, 150);
    return () => clearTimeout(timer);
  }, [focusNeedId, scrollRef]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>NEEDS</Text>
        <Pressable
          onPress={() => setSorting(value => !value)}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.sortText}>{sorting ? 'Done' : 'Sort'}</Text>
        </Pressable>
      </View>
      <View style={styles.card}>
        {NEED_IDS.map((id, index) =>
          sorting ? (
            <NeedSortRow
              key={id}
              needId={id}
              first={index === 0}
              last={index === NEED_IDS.length - 1}
            />
          ) : (
            <View
              key={id}
              ref={node => {
                rowRefs.current[id] = node;
              }}
              collapsable={false}
            >
              <NeedSettingsRow
                needId={id}
                first={index === 0}
                onPickSource={() => setPicking(id)}
                onEdit={id.startsWith('custom:') ? () => setEditing({ needId: id }) : undefined}
              />
            </View>
          ),
        )}
        {sorting ? null : <SunlightSettingsRow />}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: 4,
  },
  sortText: { color: Colors.status.success, fontSize: 13, fontWeight: '600' },
  add: { alignItems: 'center', paddingVertical: 14 },
  pressed: { opacity: 0.7 },
  addText: { color: Colors.status.success, fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
  },
});
