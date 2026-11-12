import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Button } from '../../../components/button';
import { LogRewardPreview } from '../../../components/log-reward-preview';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { FabButtonRow } from '../../components/fab-button-row';
import { SplitLogButton } from '../../components/split-log-button';
import type { BehaviorLogFormModel } from './use-behavior-log-form';

interface Props {
  form: BehaviorLogFormModel;
}

/** Bottom row of the log form: a split Log (reward inside) | ⏱ button for a new log, or Delete + Save when editing. */
export function BehaviorLogActions({ form }: Props) {
  const {
    behavior,
    editLogId,
    earnedXp,
    handleConfirm,
    handleDelete,
    handleStartTimer,
    hasTimerRange,
    moneyRewardAmount,
    moneyRewardMultiplier,
    moneyRewardOriginalAmount,
    pending,
    stackedLogs,
  } = form;

  const label = editLogId ? 'Save' : stackedLogs.length > 0 ? `Log ${stackedLogs.length + 1}` : 'Log';
  const showTimerSegment = !editLogId && !hasTimerRange;

  return (
    <FabButtonRow>
      {editLogId && (
        <Button
          variant="icon"
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={pending}
          accessibilityLabel="Delete log"
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={Colors.type.undesirable}
          />
        </Button>
      )}
      <SplitLogButton
        style={styles.logButton}
        onPress={handleConfirm}
        disabled={pending}
        accessibilityLabel={label}
        segmentIcon={showTimerSegment ? 'stopwatch-outline' : undefined}
        onSegmentPress={showTimerSegment ? handleStartTimer : undefined}
        segmentAccessibilityLabel="Start a timer instead"
      >
        {pending ? (
          <ActivityIndicator
            size="small"
            color={Colors.bg.black}
          />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
        <LogRewardPreview
          variant="inline"
          xp={behavior.xpEnabled ? earnedXp : undefined}
          money={moneyRewardAmount}
          moneyOriginal={moneyRewardOriginalAmount}
          moneyMultiplier={moneyRewardMultiplier}
          undesirable={behavior.type === 'undesirable'}
          animate={pending}
        />
      </SplitLogButton>
    </FabButtonRow>
  );
}

const styles = StyleSheet.create({
  logButton: {
    flex: 1,
  },
  label: {
    color: Colors.bg.black,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    width: 48,
    height: 48,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.bg.input,
  },
});
