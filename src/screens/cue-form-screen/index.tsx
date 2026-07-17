import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../components/button';
import { CueBehaviorPicker } from '../../components/cues/cue-behavior-picker';
import { CueScreenHeader } from '../../components/cues/cue-screen-header';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { CueToggle } from '../../components/cues/cue-toggle';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text, TextInput } from '../../components/text';
import { useBehaviorStore } from '../../store/behavior-store';
import { useCuesStore } from '../../store/cues-store';
import type { CueTrigger, CueTriggerType } from '../../types/cue';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { createDefaultCueTrigger, getCueAccent, isCueTriggerComplete } from '../../utils/cue-utils';
import { AdditionalConditionsEditor } from './components/additional-conditions-editor';
import { TriggerEditor } from './components/trigger-editor';
import { TriggerTypeGrid } from './components/trigger-type-grid';

type CueFormRoute = NativeStackScreenProps<RootStackParamList, 'CueForm'>['route'];

export function CueFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<CueFormRoute>();
  const cueId = route.params?.cueId;
  const existingCue = useCuesStore(state => state.cues.find(cue => cue.id === cueId));
  const places = useCuesStore(state => state.places);
  const addCue = useCuesStore(state => state.addCue);
  const updateCue = useCuesStore(state => state.updateCue);
  const removeCue = useCuesStore(state => state.removeCue);
  const behaviors = useBehaviorStore(state => state.behaviors);
  const defaultOptions = { placeId: places[0]?.id, behaviorId: behaviors[0]?.id };
  const [name, setName] = useState(existingCue?.name ?? '');
  const [trigger, setTrigger] = useState<CueTrigger>(
    existingCue?.trigger ?? createDefaultCueTrigger('location', defaultOptions),
  );
  const [conditions, setConditions] = useState<CueTrigger[]>(existingCue?.conditions ?? []);
  const [combiner, setCombiner] = useState<'AND' | 'OR'>(existingCue?.combiner ?? 'AND');
  const [behaviorIds, setBehaviorIds] = useState<string[]>(existingCue?.behaviorIds ?? []);
  const [notifyPush, setNotifyPush] = useState(existingCue?.notify.push ?? true);

  const changeTriggerType = (type: CueTriggerType) => {
    setTrigger(createDefaultCueTrigger(type, defaultOptions));
  };

  const handleSave = () => {
    if (!isCueTriggerComplete(trigger)) {
      Alert.alert('Finish the trigger', 'Choose all required trigger details before saving.');
      return;
    }
    if (conditions.some(condition => !isCueTriggerComplete(condition))) {
      Alert.alert('Finish the conditions', 'One of the extra conditions is incomplete.');
      return;
    }
    if (behaviorIds.length === 0) {
      Alert.alert('Choose a behaviour', 'Select at least one behaviour to suggest.');
      return;
    }

    const input = {
      enabled: existingCue?.enabled ?? true,
      name: name.trim() || undefined,
      trigger,
      conditions: conditions.length > 0 ? conditions : undefined,
      combiner: conditions.length > 0 ? combiner : undefined,
      behaviorIds,
      notify: { push: notifyPush },
    };
    if (existingCue) updateCue(existingCue.id, input);
    else addCue(input);
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!existingCue) return;
    Alert.alert('Delete cue?', 'This rule will stop suggesting behaviours.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeCue(existingCue.id);
          navigation.goBack();
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
        title={existingCue ? 'Edit cue' : 'New cue'}
        showBalance={false}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <CueSectionLabel>When · trigger</CueSectionLabel>
          <TriggerTypeGrid
            value={trigger.type}
            onChange={changeTriggerType}
          />
          <View style={styles.editorCard}>
            <TriggerEditor
              value={trigger}
              onChange={setTrigger}
            />
          </View>
        </View>

        <View style={styles.section}>
          <CueSectionLabel>Conditions · optional</CueSectionLabel>
          <AdditionalConditionsEditor
            conditions={conditions}
            combiner={combiner}
            onConditionsChange={setConditions}
            onCombinerChange={setCombiner}
          />
        </View>

        <View style={styles.section}>
          <CueSectionLabel>Then · suggest</CueSectionLabel>
          <View style={styles.editorCard}>
            <CueBehaviorPicker
              selectedIds={behaviorIds}
              onChange={setBehaviorIds}
            />
          </View>
        </View>

        <View style={styles.section}>
          <CueSectionLabel>Details</CueSectionLabel>
          <View style={styles.editorCard}>
            <Text style={styles.fieldLabel}>Cue name · optional</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Evening groceries"
              placeholderTextColor={Colors.text.faint}
            />
            <View style={styles.notifyRow}>
              <View style={styles.notifyCopy}>
                <Text style={styles.notifyTitle}>Send push notification</Text>
                <Text style={styles.notifyDetail}>The engine will use this after native setup.</Text>
              </View>
              <CueToggle
                value={notifyPush}
                accent={getCueAccent(trigger.type)}
                onValueChange={setNotifyPush}
              />
            </View>
          </View>
        </View>

        <Button
          variant="primary"
          style={styles.saveButton}
          onPress={handleSave}
        >
          Save cue
        </Button>
        {existingCue && (
          <Button
            variant="danger"
            onPress={handleDelete}
          >
            Delete cue
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { gap: 18, paddingHorizontal: 16, paddingBottom: 32 },
  section: { gap: 9 },
  editorCard: {
    gap: 12,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 12,
  },
  fieldLabel: { color: Colors.text.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  input: {
    height: 46,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 14,
  },
  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 2 },
  notifyCopy: { flex: 1, gap: 2 },
  notifyTitle: { color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
  notifyDetail: { color: Colors.text.faint, fontSize: 11, lineHeight: 16 },
  saveButton: { borderRadius: 999 },
});
