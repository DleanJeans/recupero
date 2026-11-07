import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { CueSectionLabel } from '../../../components/cues/cue-section-label';
import { Text, TextInput } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useCravingsStore } from '../../../store/cravings-store';
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorEntry } from '../../../types/behavior';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { getCravingAlternatives, searchAlternativeBehaviors } from '../../../utils/craving-utils';
import { formatElapsedNumeric } from '../../../utils/time-utils';

const MAX_SUGGESTIONS = 4;
const MAX_RESULTS = 8;

interface CravingAlternativesProps {
  cravedBehaviorId: string;
  onLog: (behaviorId: string) => void;
  onTime: (behaviorId: string) => void;
}

export function CravingAlternatives({ cravedBehaviorId, onLog, onTime }: CravingAlternativesProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const cravings = useCravingsStore(state => state.cravings);
  const alternatives = useCravingsStore(state => state.alternatives);
  const hidePrivate = useSettingsStore(state => state.hidePrivate);
  const [query, setQuery] = useState('');

  const suggestions = useMemo(
    () => getCravingAlternatives(cravedBehaviorId, behaviors, cravings, alternatives).slice(0, MAX_SUGGESTIONS),
    [alternatives, behaviors, cravedBehaviorId, cravings],
  );
  const results = useMemo(
    () =>
      query.trim()
        ? searchAlternativeBehaviors(query, behaviors, [cravedBehaviorId], hidePrivate).slice(0, MAX_RESULTS)
        : [],
    [behaviors, cravedBehaviorId, hidePrivate, query],
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <CueSectionLabel>Do this instead</CueSectionLabel>
        <Pressable
          onPress={() => navigation.navigate('BehaviorForm', { behaviorId: cravedBehaviorId })}
          accessibilityRole="button"
        >
          <Text style={styles.edit}>Edit list</Text>
        </Pressable>
      </View>
      <View style={styles.search}>
        <Ionicons
          name="search"
          size={16}
          color={Colors.text.faint}
        />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search behaviours"
          placeholderTextColor={Colors.text.faint}
          autoCorrect={false}
        />
        {query ? (
          <Pressable
            onPress={() => setQuery('')}
            accessibilityLabel="Clear search"
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={Colors.text.faint}
            />
          </Pressable>
        ) : null}
      </View>
      {query.trim() ? (
        results.length === 0 ? (
          <Text style={styles.empty}>No behaviours match "{query.trim()}".</Text>
        ) : (
          results.map(behavior => (
            <AlternativeRow
              key={behavior.id}
              behavior={behavior}
              detail={behavior.lastTimestamp ? `Last ${formatElapsedNumeric(behavior.lastTimestamp)}` : 'Not done yet'}
              onLog={onLog}
              onTime={onTime}
            />
          ))
        )
      ) : suggestions.length === 0 ? (
        <Text style={styles.empty}>
          No alternatives yet. Search for one, or add some under "Instead, try…" on this behaviour.
        </Text>
      ) : (
        suggestions.map(({ behavior, redirectCount, isPicked }) => (
          <AlternativeRow
            key={behavior.id}
            behavior={behavior}
            detail={
              redirectCount > 0
                ? `Picked ${redirectCount} ${redirectCount === 1 ? 'time' : 'times'} instead`
                : isPicked
                  ? 'Your alternative'
                  : ''
            }
            highlight={redirectCount > 0}
            onLog={onLog}
            onTime={onTime}
          />
        ))
      )}
    </View>
  );
}

interface AlternativeRowProps {
  behavior: BehaviorEntry;
  detail: string;
  highlight?: boolean;
  onLog: (behaviorId: string) => void;
  onTime: (behaviorId: string) => void;
}

function AlternativeRow({ behavior, detail, highlight = false, onLog, onTime }: AlternativeRowProps) {
  return (
    <View style={styles.row}>
      <BehaviorIcon
        behavior={behavior}
        size={28}
      />
      <View style={styles.rowText}>
        <Text
          style={styles.name}
          numberOfLines={1}
        >
          {behavior.name}
        </Text>
        {detail ? <Text style={[styles.detail, highlight && styles.detailHighlight]}>{detail}</Text> : null}
      </View>
      <Pressable
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        onPress={() => onLog(behavior.id)}
        accessibilityRole="button"
        accessibilityLabel={`Log ${behavior.name} instead`}
      >
        <Text style={styles.actionText}>Log</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.action, styles.actionGo, pressed && styles.pressed]}
        onPress={() => onTime(behavior.id)}
        accessibilityRole="button"
        accessibilityLabel={`Start a timer for ${behavior.name} instead`}
      >
        <Ionicons
          name="play"
          size={14}
          color={Colors.typeText.desirable}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  edit: { color: Colors.cue.location, fontSize: 13, paddingHorizontal: 4 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: Colors.text.primary, fontSize: 15, paddingVertical: 10 },
  empty: { color: Colors.text.faint, fontSize: 13, lineHeight: 19, paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 10,
  },
  rowText: { flex: 1, gap: 2 },
  name: { color: Colors.text.primary, fontSize: 15, fontWeight: '600' },
  detail: { color: Colors.text.muted, fontSize: 12 },
  detailHighlight: { color: Colors.star.filled },
  action: {
    height: 32,
    minWidth: 40,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: Colors.bg.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGo: { backgroundColor: Colors.typeBtn.desirable },
  actionText: { color: Colors.text.secondary, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
