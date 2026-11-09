import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBehaviorActionSheetStore } from '../store/behavior-action-sheet-store';
import { useBehaviorStore } from '../store/behavior-store';
import { useChecklistSelectionStore } from '../store/checklist-selection-store';
import type { RootStackParamList } from '../types/navigation';
import { isArchived } from '../utils/archive-utils';
import { Colors } from '../utils/colors';
import { BehaviorIcon } from './behavior-icon';
import { Text } from './text';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface BehaviorActionSheetProps {
  /** Show "Select", which starts picking behaviours for a new checklist. Only Routines supports select mode. */
  showSelect?: boolean;
}

/** Bottom sheet opened by long-pressing a behaviour: Edit, Select, Archive (or Unarchive) and Delete. */
export function BehaviorActionSheet({ showSelect = false }: BehaviorActionSheetProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const behaviorId = useBehaviorActionSheetStore(state => state.behaviorId);
  const close = useBehaviorActionSheetStore(state => state.close);
  const behavior = useBehaviorStore(
    useCallback(state => (behaviorId ? state.behaviors.find(b => b.id === behaviorId) : undefined), [behaviorId]),
  );
  const category = useBehaviorStore(
    useCallback(state => state.categories.find(c => c.id === behavior?.categoryId), [behavior?.categoryId]),
  );
  const archiveBehavior = useBehaviorStore(state => state.archiveBehavior);
  const unarchiveBehavior = useBehaviorStore(state => state.unarchiveBehavior);
  const removeBehavior = useBehaviorStore(state => state.removeBehavior);
  const startSelection = useChecklistSelectionStore(state => state.start);

  if (!behavior) return null;
  const archived = isArchived(behavior);

  const handleEdit = () => {
    close();
    navigation.navigate('BehaviorForm', { behaviorId: behavior.id });
  };

  const handleSelect = () => {
    close();
    startSelection(behavior.id);
  };

  const handleArchive = () => {
    if (archived) unarchiveBehavior(behavior.id);
    else archiveBehavior(behavior.id);
    close();
  };

  const handleDelete = () => {
    close();
    Alert.alert('Remove Behavior', `Remove "${behavior.name}"? Its logs are deleted too.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeBehavior(behavior.id) },
    ]);
  };

  const subtitle = [category?.name, `${behavior.logs.length} ${behavior.logs.length === 1 ? 'log' : 'logs'}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityLabel="Close menu"
        />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <BehaviorIcon
              behavior={behavior}
              size={32}
            />
            <View style={styles.headerText}>
              <Text
                style={styles.name}
                numberOfLines={1}
              >
                {behavior.name}
              </Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </View>
          <SheetOption
            icon="create-outline"
            label="Edit"
            onPress={handleEdit}
          />
          {!archived && showSelect && (
            <SheetOption
              icon="checkbox-outline"
              label="Select"
              hint="Pick several behaviours to make a checklist."
              onPress={handleSelect}
            />
          )}
          <SheetOption
            icon={archived ? 'arrow-undo-outline' : 'archive-outline'}
            label={archived ? 'Unarchive' : 'Archive'}
            hint={archived ? undefined : 'Hide it everywhere. Logs and XP stay.'}
            onPress={handleArchive}
          />
          <SheetOption
            icon="trash-outline"
            label="Delete…"
            danger
            onPress={handleDelete}
          />
        </View>
      </View>
    </Modal>
  );
}

interface SheetOptionProps {
  icon: IoniconName;
  label: string;
  hint?: string;
  danger?: boolean;
  onPress: () => void;
}

function SheetOption({ icon, label, hint, danger = false, onPress }: SheetOptionProps) {
  const color = danger ? Colors.type.undesirable : Colors.text.primary;
  return (
    <Pressable
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons
        name={icon}
        size={20}
        color={color}
      />
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, { color }]}>{label}</Text>
        {hint ? <Text style={styles.optionHint}>{hint}</Text> : null}
      </View>
    </Pressable>
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
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.text.muted,
    fontSize: 12,
    marginTop: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 52,
    paddingHorizontal: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border.default,
  },
  optionText: {
    flex: 1,
    paddingVertical: 10,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionHint: {
    color: Colors.text.muted,
    fontSize: 12,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
