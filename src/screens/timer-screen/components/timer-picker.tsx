import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import type { BehaviorEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { BehaviorSelector } from '../../task-screen/components/behavior-selector';

interface TimerPickerProps {
  behaviors: BehaviorEntry[];
  behaviorQuery: string;
  selectedBehaviorId: string | undefined;
  onBehaviorQueryChange: (query: string) => void;
  onBehaviorSelect: (behaviorId: string | undefined) => void;
  onContinue: () => void;
  onAddNewTimedBehavior: () => void;
}

export function TimerPicker({
  behaviors,
  behaviorQuery,
  selectedBehaviorId,
  onBehaviorQueryChange,
  onBehaviorSelect,
  onContinue,
  onAddNewTimedBehavior,
}: TimerPickerProps) {
  return (
    <View style={styles.container}>
      <BehaviorSelector
        behaviors={behaviors}
        selectedBehaviorId={selectedBehaviorId}
        query={behaviorQuery}
        showAllWhenEmpty
        emptyMessage={
          "No Timed behaviors available.\nTurn on Track XP and Track duration for XP\nin a behavior's settings to use it here."
        }
        onQueryChange={onBehaviorQueryChange}
        onSelect={onBehaviorSelect}
        appearance="timer"
      />

      <View style={styles.actions}>
        {behaviors.length > 0 && (
          <Button
            variant="primary"
            onPress={onContinue}
            disabled={selectedBehaviorId == null}
            style={styles.continueButton}
          >
            Continue
          </Button>
        )}
        <Button
          variant="secondary"
          onPress={onAddNewTimedBehavior}
          style={styles.addButton}
        >
          + Add new timed behavior
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  actions: {
    gap: 10,
    marginTop: 'auto',
  },
  continueButton: {
    minHeight: 56,
    borderRadius: 15,
    justifyContent: 'center',
    paddingVertical: 0,
    width: '100%',
  },
  addButton: {
    minHeight: 52,
    borderRadius: 14,
    width: '100%',
    backgroundColor: Colors.bg.input,
    justifyContent: 'center',
    paddingVertical: 0,
  },
});
