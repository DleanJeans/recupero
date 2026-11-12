import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useTimerStore } from '../../../store/timer-store';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { prefersTimer } from '../../../utils/log-action-utils';
import { FabButtonRow } from '../../components/fab-button-row';
import { SplitLogButton } from '../../components/split-log-button';
import { BehaviorMoreSheet } from './behavior-more-sheet';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface BehaviorActionsProps {
  behaviorId: string;
  onDelete: () => void;
  onEdit: () => void;
  onLog: () => void;
}

/** Bottom row on a behaviour's details view: ⋯ (Edit, Archive, Delete), a split Log / Timer button whose main
 *  main part is the likeliest action (Start timer for usually-timed habits), and Ride it out for undesirable behaviours. */
export function BehaviorActions({ behaviorId, onDelete, onEdit, onLog }: BehaviorActionsProps) {
  const navigation = useNavigation<NavigationProp>();
  const startTimer = useTimerStore(s => s.start);
  const behavior = useBehaviorStore(useCallback(state => state.behaviors.find(b => b.id === behaviorId), [behaviorId]));
  const [menuOpen, setMenuOpen] = useState(false);
  const timerFirst = useMemo(() => (behavior ? prefersTimer(behavior) : false), [behavior]);

  if (!behavior) return null;
  const undesirable = behavior.type === 'undesirable';
  // Undesirable behaviours already lead with Ride it out, so their split stays Log | ⏱.
  const timerMain = timerFirst && !undesirable;

  const handleStartTimer = () => {
    startTimer(behaviorId);
    navigation.navigate('Timer');
  };
  const handleRideOut = () => navigation.navigate('RideItOut', { behaviorId });

  return (
    <>
      <FabButtonRow>
        <Button
          variant="icon"
          style={styles.iconAction}
          onPress={() => setMenuOpen(true)}
          accessibilityLabel="More actions"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={Colors.text.secondary}
          />
        </Button>
        {timerMain ? (
          <SplitLogButton
            style={styles.split}
            icon="stopwatch-outline"
            onPress={handleStartTimer}
            segmentLabel="Log"
            onSegmentPress={onLog}
            segmentAccessibilityLabel="Log without a timer"
          >
            Start timer
          </SplitLogButton>
        ) : (
          <SplitLogButton
            style={styles.split}
            onPress={onLog}
            segmentIcon="stopwatch-outline"
            onSegmentPress={handleStartTimer}
            segmentAccessibilityLabel="Start timer"
          >
            Log
          </SplitLogButton>
        )}
        {undesirable && (
          <Button
            variant="danger"
            style={styles.rideOut}
            onPress={handleRideOut}
            accessibilityLabel="Ride out a craving"
          >
            <Ionicons
              name="flame"
              size={18}
              color={Colors.typeText.undesirable}
            />
            <Text style={styles.rideOutLabel}>Ride it out</Text>
          </Button>
        )}
      </FabButtonRow>
      {menuOpen && (
        <BehaviorMoreSheet
          behavior={behavior}
          showRideOut={!undesirable}
          onClose={() => setMenuOpen(false)}
          onEdit={onEdit}
          onRideOut={handleRideOut}
          onDelete={onDelete}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  iconAction: {
    width: 48,
    height: 48,
    padding: 0,
    justifyContent: 'center',
    backgroundColor: Colors.bg.input,
  },
  split: {
    flex: 1,
  },
  rideOut: {
    flex: 1.15,
    height: 48,
    paddingVertical: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: Colors.typeBtn.undesirable,
  },
  rideOutLabel: {
    color: Colors.typeText.undesirable,
    fontSize: 15,
    fontWeight: '600',
  },
});
