import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSunlightStore } from '../../store/sunlight-store';
import type { SunlightStretch } from '../../types/sunlight';
import { Colors } from '../../utils/colors';
import { parseDecimalInput } from '../../utils/metadata-calculation-utils';
import { formatSunlightMinutes, getManualLuxFromText, getSessionEditError } from '../../utils/sunlight-utils';
import { FullScreenModal } from '../full-screen-modal';
import { Text, TextInput } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';
import { SunlightTimeField } from './sunlight-time-field';

interface SunlightSessionEditorProps {
  stretch: SunlightStretch;
  onClose: () => void;
  onDelete: () => void;
}

/** Change a Today session's start, end and light level. */
export function SunlightSessionEditor({ stretch, onClose, onDelete }: SunlightSessionEditorProps) {
  const editSession = useSunlightStore(state => state.editSession);
  const insets = useSafeAreaInsets();
  const [start, setStart] = useState(stretch.start);
  const [end, setEnd] = useState(stretch.end);
  const initialLux = stretch.lux != null ? String(Math.round(stretch.lux)) : '';
  const [luxText, setLuxText] = useState(initialLux);
  const typedLux = getManualLuxFromText(parseDecimalInput(luxText));
  const luxChanged = luxText.trim() !== initialLux;
  const error = getSessionEditError(start, end, Date.now());
  const luxInvalid = luxChanged && luxText.trim() !== '' && typedLux == null;
  const fixedLux = stretch.manual && stretch.lux != null;

  const save = () => {
    if (error || luxInvalid) return;
    // Untouched light on a detected session keeps following the weather; a typed one is fixed.
    const lux = luxChanged ? typedLux : fixedLux ? stretch.lux : undefined;
    editSession(stretch, { start, end, lux });
    onClose();
  };

  return (
    <FullScreenModal
      title="Edit session"
      onClose={onClose}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <SunlightTimeField
          label="Start"
          value={start}
          onChange={setStart}
        />
        <SunlightTimeField
          label="End"
          value={end}
          onChange={setEnd}
        />
        <Text style={styles.duration}>{error ?? formatSunlightMinutes(Math.floor((end - start) / 60_000))}</Text>

        <View style={styles.luxRow}>
          <Text style={styles.label}>Light</Text>
          <TextInput
            style={styles.input}
            value={luxText}
            onChangeText={setLuxText}
            keyboardType="decimal-pad"
            placeholder="weather"
            placeholderTextColor={Colors.text.dim}
          />
          <Text style={styles.label}>lux</Text>
        </View>
        <Text style={styles.hint}>
          {stretch.manual
            ? 'The light at your eyes, as when you started the session.'
            : 'Leave it to keep the weather estimate. A typed level counts as the light at your eyes, like a manual session.'}
        </Text>

        <Pressable
          style={({ pressed }) => [styles.save, (error || luxInvalid) && styles.disabled, pressed && styles.pressed]}
          onPress={save}
          disabled={!!error || luxInvalid}
          accessibilityRole="button"
        >
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
          onPress={onDelete}
          accessibilityRole="button"
        >
          <Text style={styles.deleteText}>Delete session</Text>
        </Pressable>
      </ScrollView>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  duration: {
    color: SUNLIGHT_COLOR,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  luxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  input: {
    flex: 1,
    textAlign: 'right',
    color: Colors.text.primary,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  hint: {
    color: Colors.text.faint,
    fontSize: 12,
    lineHeight: 17,
  },
  save: {
    backgroundColor: SUNLIGHT_COLOR,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveText: {
    color: '#1a1300',
    fontSize: 15,
    fontWeight: '700',
  },
  delete: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  deleteText: {
    color: Colors.status.dangerLight,
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
