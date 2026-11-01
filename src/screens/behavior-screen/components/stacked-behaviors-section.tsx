import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { StackBehaviorPickerModal } from './stack-behavior-picker-modal';
import { StackedBehaviorCard } from './stacked-behavior-card';
import type { BehaviorLogFormModel } from './use-behavior-log-form';

interface Props {
  form: BehaviorLogFormModel;
}

/** Habit stacking: log more behaviours at the same time, with the same cues and notes. */
export function StackedBehaviorsSection({ form }: Props) {
  const {
    addStackedBehavior,
    behavior,
    handleCollapseTime,
    removeStackedBehavior,
    setStackedMetadataValues,
    stackedLogs,
  } = form;
  const [pickerVisible, setPickerVisible] = useState(false);
  const excludeIds = useMemo(
    () => [behavior.id, ...stackedLogs.map(item => item.behaviorId)],
    [behavior.id, stackedLogs],
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Stack</Text>
      {stackedLogs.length > 0 && (
        <Text style={styles.hint}>Logged at the same time, with the same cues and notes.</Text>
      )}
      {stackedLogs.map(stacked => (
        <StackedBehaviorCard
          key={stacked.behaviorId}
          stacked={stacked}
          onChange={setStackedMetadataValues}
          onRemove={removeStackedBehavior}
          onFocus={handleCollapseTime}
        />
      ))}
      <Button
        variant="secondary"
        size="sm"
        style={styles.addButton}
        onPress={() => setPickerVisible(true)}
        accessibilityLabel="Add a behaviour to log at the same time"
      >
        <View style={styles.addContent}>
          <Ionicons
            name="add"
            size={18}
            color={Colors.text.light}
          />
          <Text style={styles.addLabel}>Add behaviour</Text>
        </View>
      </Button>
      <StackBehaviorPickerModal
        visible={pickerVisible}
        excludeIds={excludeIds}
        onClose={() => setPickerVisible(false)}
        onPick={behaviorId => {
          addStackedBehavior(behaviorId);
          setPickerVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    marginBottom: 20,
  },
  sectionLabel: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  hint: {
    color: Colors.text.faint,
    fontSize: 12,
    marginTop: -4,
  },
  addButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
  },
  addContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addLabel: {
    color: Colors.text.light,
    fontSize: 14,
    fontWeight: '600',
  },
});
