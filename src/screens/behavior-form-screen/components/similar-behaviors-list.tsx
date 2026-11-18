import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import type { RootStackParamList } from '../../../types/navigation';
import { isArchived } from '../../../utils/archive-utils';
import { findSimilarBehaviors } from '../../../utils/behavior-group-utils';
import { Colors } from '../../../utils/colors';

const DEBOUNCE_MS = 1000;
const MAX_SHOWN = 5;

interface Props {
  name: string;
  excludeId?: string;
}

/** Shows existing behaviours like the typed name, once the user pauses typing, to prevent duplicates. */
export function SimilarBehaviorsList({ name, excludeId }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(s => s.behaviors);
  const [settledName, setSettledName] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSettledName(name), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [name]);

  const matches = useMemo(
    () => findSimilarBehaviors(behaviors, settledName, excludeId).slice(0, MAX_SHOWN),
    [behaviors, settledName, excludeId],
  );

  if (matches.length === 0 || settledName.trim() === '') return null;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Already exists. Open one instead?</Text>
      {matches.map(b => (
        <Pressable
          key={b.id}
          style={styles.row}
          onPress={() => navigation.navigate('BehaviorLog', { behaviorId: b.id })}
        >
          <BehaviorIcon
            behavior={b}
            size={22}
          />
          <Text style={styles.name}>{isArchived(b) ? `${b.name} (archived)` : b.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  title: {
    color: Colors.text.muted,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  name: {
    color: Colors.text.primary,
    fontSize: 15,
  },
});
