import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Text';
import type { BehaviorEntry } from '../../../types/behavior';
import type { TaskStarValue } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { BehaviorSelector } from './behavior-selector';
import { ModeButton } from './mode-button';
import { StarPicker } from './star-picker';

export type TaskMode = 'oneOff' | 'behavior';

interface TaskComposerProps {
  mode: TaskMode;
  title: string;
  stars: TaskStarValue;
  behaviors: BehaviorEntry[];
  selectedBehaviorId: string | undefined;
  onModeChange: (mode: TaskMode) => void;
  onTitleChange: (title: string) => void;
  onStarsChange: (stars: TaskStarValue) => void;
  onBehaviorSelect: (behaviorId: string | undefined) => void;
  onAdd: () => void;
}

export function TaskComposer({
  mode,
  title,
  stars,
  behaviors,
  selectedBehaviorId,
  onModeChange,
  onTitleChange,
  onStarsChange,
  onBehaviorSelect,
  onAdd,
}: TaskComposerProps) {
  const canAdd = mode === 'behavior' ? !!selectedBehaviorId : title.trim().length > 0;
  const handleModeChange = (nextMode: TaskMode) => {
    if (nextMode !== mode) onBehaviorSelect(undefined);
    onModeChange(nextMode);
  };
  const oneOffHasAttachedBehavior = mode === 'oneOff' && selectedBehaviorId != null;

  return (
    <View style={styles.composer}>
      <View style={styles.modeRow}>
        <ModeButton
          label="One-off"
          icon="create-outline"
          active={mode === 'oneOff'}
          onPress={() => handleModeChange('oneOff')}
        />
        <ModeButton
          label="Behavior"
          icon="repeat-outline"
          active={mode === 'behavior'}
          onPress={() => handleModeChange('behavior')}
        />
      </View>

      {mode === 'oneOff' ? (
        <View style={styles.oneOffFields}>
          <TextInput
            style={styles.titleInput}
            placeholder="Task name"
            placeholderTextColor={Colors.text.faint}
            value={title}
            onChangeText={onTitleChange}
            returnKeyType="done"
            onSubmitEditing={onAdd}
          />
          <BehaviorSelector
            behaviors={behaviors}
            selectedBehaviorId={selectedBehaviorId}
            onSelect={onBehaviorSelect}
          />
        </View>
      ) : (
        <BehaviorSelector
          behaviors={behaviors}
          selectedBehaviorId={selectedBehaviorId}
          onSelect={onBehaviorSelect}
        />
      )}

      <View style={styles.composerFooter}>
        {mode === 'oneOff' && !oneOffHasAttachedBehavior && (
          <StarPicker
            value={stars}
            onChange={onStarsChange}
          />
        )}
        <Button
          variant="primary"
          size="sm"
          onPress={onAdd}
          disabled={!canAdd}
          style={mode === 'behavior' && styles.behaviorAddButton}
        >
          Add
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.primary,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  titleInput: {
    height: 44,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 15,
  },
  oneOffFields: {
    gap: 10,
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  behaviorAddButton: {
    flex: 1,
  },
});
