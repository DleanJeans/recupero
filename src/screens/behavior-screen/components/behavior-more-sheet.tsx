import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetOption } from '../../../components/behavior-action-sheet';
import { MergeLogsPicker } from '../../../components/merge-logs-picker';
import { EffectEditDialog } from '../../../components/needs/effect-edit-dialog';
import { useBehaviorStore } from '../../../store/behavior-store';
import type { BehaviorEntry } from '../../../types/behavior';
import { isArchived } from '../../../utils/archive-utils';
import { Colors } from '../../../utils/colors';

interface BehaviorMoreSheetProps {
  behavior: BehaviorEntry;
  /** Show "Ride out a craving" here when it isn't already on the button row. */
  showRideOut: boolean;
  onClose: () => void;
  onEdit: () => void;
  onRideOut: () => void;
  onDelete: () => void;
}

/** Bottom sheet behind the ⋯ button on a behaviour's screen: the less used actions. */
export function BehaviorMoreSheet({
  behavior,
  showRideOut,
  onClose,
  onEdit,
  onRideOut,
  onDelete,
}: BehaviorMoreSheetProps) {
  const insets = useSafeAreaInsets();
  const archiveBehavior = useBehaviorStore(state => state.archiveBehavior);
  const unarchiveBehavior = useBehaviorStore(state => state.unarchiveBehavior);
  const archived = isArchived(behavior);
  const [merging, setMerging] = useState(false);
  const [addingEffect, setAddingEffect] = useState(false);

  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  if (addingEffect) {
    return (
      <EffectEditDialog
        behaviorId={behavior.id}
        behaviorName={behavior.name}
        onClose={onClose}
      />
    );
  }

  if (merging) {
    return (
      <MergeLogsPicker
        behavior={behavior}
        onClose={onClose}
      />
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close menu"
        />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grabber} />
          <SheetOption
            icon="create-outline"
            label="Edit behaviour"
            onPress={run(onEdit)}
          />
          {showRideOut && (
            <SheetOption
              icon="flame-outline"
              label="Ride out a craving"
              onPress={run(onRideOut)}
            />
          )}
          <SheetOption
            icon="pulse-outline"
            label="Add an effect…"
            hint="e.g. it makes you sleepy: lowers Brain Energy."
            onPress={() => setAddingEffect(true)}
          />
          <SheetOption
            icon={archived ? 'arrow-undo-outline' : 'archive-outline'}
            label={archived ? 'Unarchive' : 'Archive'}
            hint={archived ? undefined : 'Hide it everywhere. Logs and XP stay.'}
            onPress={run(() => (archived ? unarchiveBehavior(behavior.id) : archiveBehavior(behavior.id)))}
          />
          {behavior.logs.length > 0 && (
            <SheetOption
              icon="git-merge-outline"
              label="Move logs to…"
              hint="Merge all logs into another behaviour."
              onPress={() => setMerging(true)}
            />
          )}
          <SheetOption
            icon="trash-outline"
            label="Delete behaviour…"
            danger
            onPress={run(onDelete)}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border.dim,
    marginBottom: 6,
  },
});
