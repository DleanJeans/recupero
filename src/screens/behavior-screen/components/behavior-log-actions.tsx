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
  const { behavior, editLogId, earnedXp, handleConfirm, handleDelete, moneyRewardAmount, pending } = form;

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
      ) : null}
      <View style={styles.logAction}>
        <LogRewardPreview
          xp={behavior.xpEnabled ? earnedXp : undefined}
          money={moneyRewardAmount}
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
