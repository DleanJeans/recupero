import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '../../components/button';
import { CueScreenHeader } from '../../components/cues/cue-screen-header';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { EmojiPicker } from '../../components/emoji-picker';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text, TextInput } from '../../components/text';
import { useBehaviorStore } from '../../store/behavior-store';
import { useChecklistsStore } from '../../store/checklists-store';
import type { ChecklistItemInput } from '../../types/checklist';
import type { RootStackParamList } from '../../types/navigation';
import { getChecklistBehaviorIds, getDragShift, moveItem } from '../../utils/checklist-utils';
import { Colors } from '../../utils/colors';
import { StackBehaviorPickerModal } from '../behavior-screen/components/stack-behavior-picker-modal';
import { ChecklistItemRow } from './components/checklist-item-row';

type ChecklistFormRoute = NativeStackScreenProps<RootStackParamList, 'ChecklistForm'>['route'];
type DraftItem = ChecklistItemInput & { key: string };

export function ChecklistFormScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ChecklistFormRoute>();
  const checklistId = route.params?.checklistId;
  const existing = useChecklistsStore(
    useCallback(state => state.checklists.find(checklist => checklist.id === checklistId), [checklistId]),
  );
  const addChecklist = useChecklistsStore(state => state.addChecklist);
  const updateChecklist = useChecklistsStore(state => state.updateChecklist);
  const removeChecklist = useChecklistsStore(state => state.removeChecklist);
  const behaviors = useBehaviorStore(state => state.behaviors);

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '');
  const [items, setItems] = useState<DraftItem[]>(() =>
    existing
      ? existing.items.map(({ id, ...item }) => ({ ...item, key: id }))
      : (route.params?.behaviorIds ?? []).map(behaviorId => ({ kind: 'behavior', behaviorId, key: uuidv4() })),
  );
  const [plainLabel, setPlainLabel] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);

  const behaviorIds = useMemo(() => getChecklistBehaviorIds(items), [items]);
  const lastBehaviorId = behaviorIds[behaviorIds.length - 1];

  const addBehaviors = (ids: string[]) => {
    setPickerOpen(false);
    setItems(current => [
      ...current,
      ...ids
        .filter(id => !current.some(item => item.kind === 'behavior' && item.behaviorId === id))
        .map(behaviorId => ({ kind: 'behavior' as const, behaviorId, key: uuidv4() })),
    ]);
  };

  const addPlainItem = () => {
    const label = plainLabel.trim();
    if (!label) return;
    setItems(current => [...current, { kind: 'plain', label, key: uuidv4() }]);
    setPlainLabel('');
  };

  const removeItem = (key: string) => setItems(current => current.filter(item => item.key !== key));

  const dragRef = useRef(drag);
  dragRef.current = drag;
  const handleDragStart = useCallback((from: number) => {
    dragRef.current = { from, to: from };
    setDrag(dragRef.current);
  }, []);
  const handleDragMove = useCallback((to: number) => {
    if (!dragRef.current) return;
    dragRef.current = { ...dragRef.current, to };
    setDrag(dragRef.current);
  }, []);
  const handleDragEnd = useCallback(() => {
    const current = dragRef.current;
    if (current && current.from !== current.to) setItems(list => moveItem(list, current.from, current.to));
    dragRef.current = null;
    setDrag(null);
  }, []);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name it', 'Give the checklist a name, like Morning routine.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Add an item', 'Add at least one behaviour or item.');
      return;
    }
    const input = {
      name: trimmedName,
      emoji: emoji || undefined,
      items: items.map(({ key: _key, ...item }) => item),
    };
    if (existing) updateChecklist(existing.id, input);
    else addChecklist(input);
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert('Delete checklist?', `"${existing.name}" is removed. Logs you ticked from it stay.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeChecklist(existing.id);
          navigation.navigate('Home');
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <CueScreenHeader
        title={existing ? 'Edit checklist' : 'New checklist'}
        showBalance={false}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={drag === null}
      >
        <View style={styles.nameRow}>
          <EmojiPicker
            value={emoji}
            onChangeText={setEmoji}
            nameHint={name}
          />
          <TextInput
            style={[styles.input, styles.nameInput]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Morning routine"
            placeholderTextColor={Colors.text.faint}
          />
        </View>

        <View style={styles.section}>
          <CueSectionLabel>{items.length > 1 ? 'Items · drag to reorder' : 'Items'}</CueSectionLabel>
          <View>
            {items.map((item, index) => {
              const behavior =
                item.kind === 'behavior' ? behaviors.find(candidate => candidate.id === item.behaviorId) : undefined;
              const label = item.kind === 'plain' ? item.label : (behavior?.name ?? 'Deleted behaviour');
              const subtitle =
                item.kind === 'plain'
                  ? 'Plain item · just a tick'
                  : behavior
                    ? 'Behaviour · ticking logs it'
                    : 'Remove it';
              return (
                <ChecklistItemRow
                  key={item.key}
                  index={index}
                  count={items.length}
                  behavior={behavior}
                  label={label}
                  subtitle={subtitle}
                  shift={getDragShift(index, drag)}
                  dragActive={drag !== null}
                  dragging={drag?.from === index}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  onRemove={() => removeItem(item.key)}
                />
              );
            })}
            {items.length === 0 && (
              <Text style={styles.empty}>Add the behaviours you do, in order. Plain items suit packing lists.</Text>
            )}
          </View>
          <Button
            onPress={() => setPickerOpen(true)}
            accessibilityLabel="Add behaviours"
          >
            + Behaviours
          </Button>
          <View style={styles.plainRow}>
            <TextInput
              style={[styles.input, styles.plainInput]}
              value={plainLabel}
              onChangeText={setPlainLabel}
              onSubmitEditing={addPlainItem}
              placeholder="Plain item, e.g. Keys"
              placeholderTextColor={Colors.text.faint}
              returnKeyType="done"
              submitBehavior="submit"
            />
            <Button
              variant="icon"
              onPress={addPlainItem}
              disabled={!plainLabel.trim()}
              accessibilityLabel="Add plain item"
            >
              <Ionicons
                name="add-circle"
                size={30}
                color={plainLabel.trim() ? Colors.text.primary : Colors.text.dim}
              />
            </Button>
          </View>
        </View>

        <Button
          variant="primary"
          onPress={handleSave}
        >
          {existing ? 'Save checklist' : 'Create checklist'}
        </Button>
        {existing && (
          <Button
            variant="danger"
            onPress={handleDelete}
          >
            Delete checklist
          </Button>
        )}
      </ScrollView>

      <StackBehaviorPickerModal
        visible={pickerOpen}
        behaviorId={lastBehaviorId}
        excludeIds={behaviorIds}
        onClose={() => setPickerOpen(false)}
        onPickMany={addBehaviors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { gap: 18, paddingHorizontal: 16 },
  section: { gap: 9 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    height: 46,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 15,
  },
  nameInput: { flex: 1, fontSize: 17, fontWeight: '600' },
  plainRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  plainInput: { flex: 1 },
  empty: { color: Colors.text.faint, fontSize: 13, lineHeight: 19, paddingVertical: 8 },
});
