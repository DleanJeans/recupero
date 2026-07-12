import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { useTimerStore } from '../../../store/timer-store';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { FabButtonRow } from '../../components/fab-button-row';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface BehaviorActionsProps {
  behaviorId: string;
  canTrackTimer: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onLog: () => void;
}

export function BehaviorActions({ behaviorId, canTrackTimer, onDelete, onEdit, onLog }: BehaviorActionsProps) {
  const navigation = useNavigation<NavigationProp>();
  const startTimer = useTimerStore(s => s.start);

  const handleStartTimer = () => {
    startTimer(behaviorId);
    navigation.navigate('Timer');
  };

  return (
    <FabButtonRow>
      <Button
        variant="danger"
        style={styles.deleteButton}
        onPress={onDelete}
        accessibilityLabel="Delete behavior"
      >
        <View style={styles.deleteIconWrapper}>
          <Ionicons
            name="trash-outline"
            size={20}
            color={Colors.text.primary}
          />
        </View>
      </Button>
      <Button
        variant="secondary"
        style={styles.iconAction}
        onPress={onEdit}
        accessibilityLabel="Edit behavior"
      >
        <Ionicons
          name="create-outline"
          size={18}
          color={Colors.text.light}
        />
      </Button>
      <Button
        variant="primary"
        style={styles.detailAction}
        onPress={onLog}
      >
        Log
      </Button>
      {canTrackTimer && (
        <Button
          variant="secondary"
          style={styles.iconAction}
          onPress={handleStartTimer}
          accessibilityLabel="Start timer"
        >
          <Ionicons
            name="stopwatch-outline"
            size={20}
            color={Colors.text.light}
          />
        </Button>
      )}
    </FabButtonRow>
  );
}

const styles = StyleSheet.create({
  detailAction: { flex: 1 },
  iconAction: {
    width: 48,
    height: 48,
    padding: 0,
    justifyContent: 'center',
  },
  deleteButton: {
    width: 48,
    height: 48,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
