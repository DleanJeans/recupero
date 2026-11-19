import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BackButton } from '../../components/back-button';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { PATCH_NOTES } from '../../data/patch-notes';
import { usePatchNotesStore } from '../../store/patch-notes-store';
import { Colors } from '../../utils/colors';
import { findNewPatchNotes, patchNotesItemText } from '../../utils/patch-notes-utils';
import { PatchNotesDay } from './components/patch-notes-day';

/** What changed in the app, newest day first. Opened from the bottom of Settings. */
export function PatchNotesScreen() {
  // Snapshot at open so the NEW tags stay visible while reading; everything counts as seen on leaving.
  const [newTexts] = useState(() => findNewPatchNotes(PATCH_NOTES, usePatchNotesStore.getState().seen));
  useEffect(
    () => () => usePatchNotesStore.getState().markSeen(PATCH_NOTES.flatMap(day => day.items.map(patchNotesItemText))),
    [],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <ScreenTitle>Patch notes</ScreenTitle>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {PATCH_NOTES.map(day => (
          <PatchNotesDay
            key={day.date}
            day={day}
            newTexts={newTexts}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
});
