import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { LogRewardPreview } from '../../../components/log-reward-preview';
import { Colors } from '../../../utils/colors';
import { FabButtonRow } from '../../components/fab-button-row';
import type { BehaviorLogFormModel } from './use-behavior-log-form';

interface Props {
  form: BehaviorLogFormModel;
}

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

  return (
    <FabButtonRow>
      {editLogId ? (
        <Button
          variant="danger"
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityLabel="Delete log"
        >
          <View style={styles.deleteIconWrapper}>
            <Ionicons
              name="trash-outline"
              size={20}
              color={Colors.text.primary}
            />
          </View>
        </Button>
      ) : (
        !hasTimerRange && (
          <Button
            variant="icon"
            style={styles.timerButton}
            onPress={handleStartTimer}
            disabled={pending}
            accessibilityLabel="Start a timer instead"
          >
            <Ionicons
              name="stopwatch-outline"
              size={20}
              color={Colors.text.light}
            />
          </Button>
        )
      )}
      <View style={styles.logAction}>
        <LogRewardPreview
          xp={behavior.xpEnabled ? earnedXp : undefined}
          money={moneyRewardAmount}
          moneyOriginal={moneyRewardOriginalAmount}
          moneyMultiplier={moneyRewardMultiplier}
          undesirable={behavior.type === 'undesirable'}
          animate={pending}
        />
        <Button
          variant="primary"
          style={styles.logButton}
          onPress={handleConfirm}
          disabled={pending}
        >
          {pending ? (
            <ActivityIndicator
              size="small"
              color={Colors.bg.black}
            />
          ) : editLogId ? (
            'Save'
          ) : stackedLogs.length > 0 ? (
            `Log ${stackedLogs.length + 1}`
          ) : (
            'Log'
          )}
        </Button>
      </View>
    </FabButtonRow>
  );
}

const styles = StyleSheet.create({
  logAction: {
    flex: 1,
    gap: 6,
  },
  logButton: {
    flex: 1,
  },
  timerButton: {
    width: 48,
    height: 48,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg.input,
    marginTop: 'auto',
  },
  deleteButton: {
    width: 48,
    height: 48,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 'auto',
  },
  deleteIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
