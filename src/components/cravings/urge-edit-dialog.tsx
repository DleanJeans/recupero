import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CopingUrgeItem } from '../../hooks/use-coping-urges';
import { useNeedLevels } from '../../hooks/use-need-levels';
import { useCravingsStore } from '../../store/cravings-store';
import { Colors } from '../../utils/colors';
import { NEED_INFO } from '../../utils/need-utils';
import { formatFullIn, getLearnedFullInHours, toUrgeLevel } from '../../utils/urge-utils';
import { BehaviorIcon } from '../behavior-icon';
import { Button } from '../button';
import { Text } from '../text';

const FULL_IN_HOURS = [6, 12, 24, 48, 24 * 7, 24 * 14];
const LINES = [50, 60, 70, 80, 90];
const DROPS = [20, 40, 60, 100];

interface UrgeEditDialogProps {
  item: CopingUrgeItem;
  onLogNow: () => void;
  onClose: () => void;
}

/** Long-press sheet for one coping urge: rate, line, how much riding it out lowers it, and the need it copes for. */
export function UrgeEditDialog({ item, onLogNow, onClose }: UrgeEditDialogProps) {
  const insets = useSafeAreaInsets();
  const updateUrge = useCravingsStore(state => state.updateUrge);
  const removeUrge = useCravingsStore(state => state.removeUrge);
  const { needs } = useNeedLevels();
  const { urge, behavior, state } = item;
  const learned = getLearnedFullInHours(behavior.logs.map(log => log.timestamp));
  const update = (patch: Parameters<typeof updateUrge>[1]) => updateUrge(urge.behaviorId, patch);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { paddingTop: 24 + insets.top, paddingBottom: 24 + insets.bottom }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <BehaviorIcon
                behavior={behavior}
                size={28}
              />
              <Text
                style={styles.title}
                numberOfLines={1}
              >
                {behavior.name}
              </Text>
              <Text
                style={styles.level}
                numberOfLines={1}
              >
                {Math.round(state.level)}% · {toUrgeLevel(state.level)}/5
              </Text>
            </View>
            <Text style={styles.hint}>
              The bar rises from 0% when you do it to 100% after the full-in time. Riding out a craving lowers it.
            </Text>

            <Text style={styles.label}>Full in</Text>
            <View style={styles.chips}>
              <Chip
                label={learned ? `Auto · ${formatFullIn(learned)}` : 'Auto · 1d'}
                active={urge.fullInHours == null}
                onPress={() => update({ fullInHours: undefined })}
              />
              {FULL_IN_HOURS.map(hours => (
                <Chip
                  key={hours}
                  label={formatFullIn(hours)}
                  active={urge.fullInHours === hours}
                  onPress={() => update({ fullInHours: hours })}
                />
              ))}
            </View>

            <Text style={styles.label}>Line</Text>
            <View style={styles.chips}>
              {LINES.map(line => (
                <Chip
                  key={line}
                  label={`${line}%`}
                  active={urge.line === line}
                  onPress={() => update({ line })}
                />
              ))}
            </View>

            <Text style={styles.label}>Riding it out lowers it by</Text>
            <View style={styles.chips}>
              {DROPS.map(drop => (
                <Chip
                  key={drop}
                  label={drop === 100 ? 'All' : `${drop}%`}
                  active={urge.resistDrop === drop}
                  onPress={() => update({ resistDrop: drop })}
                />
              ))}
            </View>

            <Text style={styles.label}>Copes for</Text>
            <View style={styles.chips}>
              <Chip
                label="None"
                active={urge.copesFor == null}
                onPress={() => update({ copesFor: undefined })}
              />
              {needs.map(need => {
                const info = NEED_INFO[need.id];
                if (!info) return null;
                return (
                  <Chip
                    key={need.id}
                    label={`${info.emoji} ${info.label}`}
                    active={urge.copesFor === need.id}
                    onPress={() => update({ copesFor: need.id })}
                  />
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.actions}>
            <Button
              variant="danger"
              onPress={() => {
                removeUrge(urge.behaviorId);
                onClose();
              }}
            >
              Remove
            </Button>
            <View style={styles.spacer} />
            <Button onPress={onLogNow}>Log it</Button>
            <Button
              variant="primary"
              onPress={onClose}
            >
              Done
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[styles.chipText, active && styles.chipTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: Colors.bg.card, borderRadius: 14, maxHeight: '100%', overflow: 'hidden' },
  content: { padding: 16, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  level: { flexShrink: 0, color: Colors.type.undesirable, fontSize: 14, fontWeight: '700' },
  hint: { color: Colors.text.muted, fontSize: 12, lineHeight: 17 },
  label: { color: Colors.text.light, fontSize: 12, fontWeight: '700', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: Colors.bg.input,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  chipActive: { backgroundColor: '#3a2a12', borderColor: Colors.type.neutral },
  chipText: { color: Colors.text.secondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: Colors.type.neutral },
  pressed: { opacity: 0.7 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  spacer: { flex: 1 },
});
