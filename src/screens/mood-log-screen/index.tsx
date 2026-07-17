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
import type { MoodId } from '../../types/cue';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { getCurrentMood } from '../../utils/cue-utils';
import { MoodGrid } from './components/mood-grid';
import { MoodSuggestions } from './components/mood-suggestions';

export function MoodLogScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const moodLogs = useCuesStore(state => state.moodLogs);
  const logMood = useCuesStore(state => state.logMood);
  const updateMoodNote = useCuesStore(state => state.updateMoodNote);
  const currentMood = getCurrentMood(moodLogs);
  const [selectedMood, setSelectedMood] = useState<MoodId | undefined>(currentMood?.mood);
  const [moodLogId, setMoodLogId] = useState<string | undefined>();
  const [note, setNote] = useState('');

  const handleMoodSelect = (mood: MoodId) => {
    const id = logMood(mood);
    setSelectedMood(mood);
    setMoodLogId(id);
    setNote('');
  };

  const handleDone = () => {
    if (moodLogId) updateMoodNote(moodLogId, note);
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <CueScreenHeader title="Mood" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <CueSectionLabel>How are you feeling?</CueSectionLabel>
          <MoodGrid
            selectedMood={selectedMood}
            onSelect={handleMoodSelect}
          />
          <Text style={styles.immediateHint}>Selecting a mood logs it immediately.</Text>
        </View>

        {selectedMood && (
          <View style={styles.section}>
            <CueSectionLabel>Suggested for this mood</CueSectionLabel>
            <MoodSuggestions mood={selectedMood} />
          </View>
        )}

        <View style={styles.section}>
          <CueSectionLabel>Note · optional</CueSectionLabel>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="What's on your mind?"
            placeholderTextColor={Colors.text.faint}
            multiline
            textAlignVertical="top"
          />
        </View>

        <Button
          variant="primary"
          style={styles.doneButton}
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
  doneButton: { borderRadius: 999 },
});
