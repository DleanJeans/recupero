import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Text';
import type { BehaviorEntry } from '../../../types/behavior';
import type { TaskStarValue } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import { BehaviorSelector } from './behavior-selector';
import { StarPicker } from './star-picker';

interface TaskComposerProps {
  title: string;
  behaviorQuery: string;
  stars: TaskStarValue;
  behaviors: BehaviorEntry[];
  selectedBehaviorId: string | undefined;
  onTitleChange: (title: string) => void;
  onBehaviorQueryChange: (query: string) => void;
  onStarsChange: (stars: TaskStarValue) => void;
  onBehaviorSelect: (behaviorId: string | undefined) => void;
  onAdd: () => void;
  onCancel: () => void;
}

export function TaskComposer({
  title,
  behaviorQuery,
  stars,
  behaviors,
  selectedBehaviorId,
  onTitleChange,
  onBehaviorQueryChange,
  onStarsChange,
  onBehaviorSelect,
  onAdd,
  onCancel,
}: TaskComposerProps) {
  const hasAttachedBehavior = selectedBehaviorId != null;
  const canAdd = title.trim().length > 0 || hasAttachedBehavior;

  return (
    <View style={styles.composer}>
      <View style={styles.fields}>
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
          query={behaviorQuery}
          onQueryChange={onBehaviorQueryChange}
          onSelect={onBehaviorSelect}
        />
      </View>

      <View style={styles.composerFooter}>
        {!hasAttachedBehavior && (
          <StarPicker
            value={stars}
            onChange={onStarsChange}
          />
        )}
        <Button
          variant="ghost"
          size="sm"
          onPress={onCancel}
          style={styles.footerButton}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onPress={onAdd}
          disabled={!canAdd}
          style={[styles.footerButton, hasAttachedBehavior && styles.fullWidthAddButton]}
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
  titleInput: {
    height: 44,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 15,
  },
  fields: {
    gap: 10,
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  fullWidthAddButton: {
    flex: 1,
  },
  footerButton: {
    minWidth: 88,
  },
});
