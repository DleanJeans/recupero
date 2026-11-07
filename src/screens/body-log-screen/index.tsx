import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../components/button';
import { CueScreenHeader } from '../../components/cues/cue-screen-header';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text, TextInput } from '../../components/text';
import { useCuesStore } from '../../store/cues-store';
import { useNeedsStore } from '../../store/needs-store';
import type { BodySensationId } from '../../types/cue';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { getNeedIdForBodySensation } from '../../utils/need-utils';
import { BodySensationGrid } from './components/body-sensation-grid';
import { BodySuggestions } from './components/body-suggestions';

export function BodyLogScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const logBodySensation = useCuesStore(state => state.logBodySensation);
  const updateBodyNote = useCuesStore(state => state.updateBodyNote);
  const needs = useNeedsStore(state => state.needs);
  const needCheckIn = useNeedsStore(state => state.checkIn);
  const [selected, setSelected] = useState<BodySensationId | undefined>();
  const [bodyLogId, setBodyLogId] = useState<string | undefined>();
  const [note, setNote] = useState('');

  const handleSelect = (sensation: BodySensationId) => {
    if (bodyLogId) updateBodyNote(bodyLogId, note);
    setBodyLogId(logBodySensation(sensation));
    // Feeling hungry, thirsty or tired means that need just reached its craving line.
    const needId = getNeedIdForBodySensation(sensation);
    if (needId && needs[needId].enabled) needCheckIn(needId, needs[needId].cravingLine, 'body');
    setSelected(sensation);
    setNote('');
  };

  const handleDone = () => {
    if (bodyLogId) updateBodyNote(bodyLogId, note);
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <CueScreenHeader title="Body" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <CueSectionLabel>What is your body telling you?</CueSectionLabel>
          <BodySensationGrid
            selected={selected}
            onSelect={handleSelect}
          />
          <Text style={styles.immediateHint}>Tapping a sensation logs it immediately.</Text>
        </View>

        {selected && (
          <View style={styles.section}>
            <CueSectionLabel>Suggested for this sensation</CueSectionLabel>
            <BodySuggestions sensation={selected} />
          </View>
        )}

        {selected && (
          <View style={styles.section}>
            <CueSectionLabel>Note · optional</CueSectionLabel>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Where, how strong, since when?"
              placeholderTextColor={Colors.text.faint}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}

        <Button
          variant="primary"
          onPress={handleDone}
        >
          Done
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { gap: 18, paddingHorizontal: 16, paddingBottom: 32 },
  section: { gap: 9 },
  immediateHint: { color: Colors.text.faint, fontSize: 11, textAlign: 'center' },
  noteInput: {
    minHeight: 96,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 13,
    fontSize: 14,
  },
});
