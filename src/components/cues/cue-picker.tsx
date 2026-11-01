import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useCuesStore } from '../../store/cues-store';
import type { CueRef, CueSourceKind } from '../../types/cue';
import { Colors } from '../../utils/colors';
import { type CueSource, cueKindToTriggerType, getCueAccent, getCueSources } from '../../utils/cue-utils';
import { Text } from '../text';

const GROUP_LABELS: Record<CueSourceKind, string> = {
  place: 'Place',
  mood: 'Mood',
  body: 'Body',
};

const GROUP_ORDER: CueSourceKind[] = ['place', 'mood', 'body'];

interface CuePickerProps {
  selected: CueRef[];
  onToggle: (ref: CueRef) => void;
}

/** Multi-select chips for the cues (places, moods, body sensations) that led to a log. */
export function CuePicker({ selected, onToggle }: CuePickerProps) {
  const places = useCuesStore(state => state.places);
  const groups = useMemo(() => {
    const sources = getCueSources(places);
    return GROUP_ORDER.map(kind => ({ kind, sources: sources.filter(source => source.kind === kind) })).filter(
      group => group.sources.length > 0,
    );
  }, [places]);

  return (
    <View style={styles.container}>
      {groups.map(group => (
        <View
          key={group.kind}
          style={styles.group}
        >
          <Text style={styles.groupLabel}>{GROUP_LABELS[group.kind]}</Text>
          <View style={styles.chips}>
            {group.sources.map(source => (
              <CueChip
                key={source.ref}
                source={source}
                active={selected.includes(source.ref)}
                onPress={() => onToggle(source.ref)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

interface CueChipProps {
  source: CueSource;
  active: boolean;
  onPress: () => void;
}

function CueChip({ source, active, onPress }: CueChipProps) {
  const accent = getCueAccent(cueKindToTriggerType(source.kind));
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: `${accent}22`, borderColor: accent },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={`${GROUP_LABELS[source.kind]} cue: ${source.label}`}
      accessibilityState={{ checked: active }}
    >
      {source.emoji ? (
        <Text style={styles.emoji}>{source.emoji}</Text>
      ) : (
        <Ionicons
          name="location-outline"
          size={14}
          color={active ? accent : Colors.text.faint}
        />
      )}
      <Text
        style={[styles.label, active && styles.activeLabel]}
        numberOfLines={1}
      >
        {source.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  group: { gap: 6 },
  groupLabel: { color: Colors.text.faint, fontSize: 11, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  emoji: { fontSize: 14 },
  label: { color: Colors.text.muted, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  activeLabel: { color: Colors.text.primary },
  pressed: { opacity: 0.7 },
});
