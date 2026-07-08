import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BehaviorSelector } from '../../../components/behavior-selector';
import { Button } from '../../../components/button';
import { Text, TextInput } from '../../../components/text';
import type { BehaviorEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';

interface CueTriggerComposerProps {
  behaviors: BehaviorEntry[];
  onAdd: (sourceBehaviorId: string, targetBehaviorId: string, delayMinutes: number) => void;
}

export function CueTriggerComposer({ behaviors, onAdd }: CueTriggerComposerProps) {
  const [sourceBehaviorId, setSourceBehaviorId] = useState<string | undefined>();
  const [sourceQuery, setSourceQuery] = useState('');
  const [targetBehaviorId, setTargetBehaviorId] = useState<string | undefined>();
  const [targetQuery, setTargetQuery] = useState('');
  const [delay, setDelay] = useState('25');
  const delayMinutes = useMemo(() => Math.max(1, Math.round(Number(delay) || 0)), [delay]);
  const canAdd = sourceBehaviorId != null && targetBehaviorId != null && delayMinutes > 0;

  const handleAdd = () => {
    if (!sourceBehaviorId || !targetBehaviorId || delayMinutes <= 0) return;
    onAdd(sourceBehaviorId, targetBehaviorId, delayMinutes);
    setSourceBehaviorId(undefined);
    setSourceQuery('');
    setTargetBehaviorId(undefined);
    setTargetQuery('');
    setDelay('25');
  };

  return (
    <View style={styles.composer}>
      <View style={styles.behaviorBlock}>
        <Text style={styles.label}>After logging</Text>
        <BehaviorSelector
          behaviors={behaviors}
          selectedBehaviorId={sourceBehaviorId}
          query={sourceQuery}
          showAllWhenEmpty
          emptyMessage="No behaviors yet."
          onQueryChange={setSourceQuery}
          onSelect={setSourceBehaviorId}
        />
      </View>

      <View style={styles.delayRow}>
        <Text style={styles.label}>Delay</Text>
        <TextInput
          style={styles.delayInput}
          keyboardType="number-pad"
          value={delay}
          onChangeText={setDelay}
          maxLength={4}
        />
        <Text style={styles.delayUnit}>min</Text>
      </View>

      <View style={styles.behaviorBlock}>
        <Text style={styles.label}>Trigger</Text>
        <BehaviorSelector
          behaviors={behaviors}
          selectedBehaviorId={targetBehaviorId}
          query={targetQuery}
          showAllWhenEmpty
          emptyMessage="No behaviors yet."
          onQueryChange={setTargetQuery}
          onSelect={setTargetBehaviorId}
        />
      </View>

      <Button
        variant="primary"
        onPress={handleAdd}
        disabled={!canAdd}
      >
        Save trigger
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    gap: 14,
  },
  behaviorBlock: {
    gap: 8,
  },
  label: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  delayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  delayInput: {
    width: 82,
    height: 42,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 15,
    textAlign: 'center',
  },
  delayUnit: {
    color: Colors.text.light,
    fontSize: 14,
    fontWeight: '600',
  },
});
