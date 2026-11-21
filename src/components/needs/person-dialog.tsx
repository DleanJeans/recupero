import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardVisible } from '../../hooks/use-keyboard-visible';
import { EMPTY_PERSON, type PersonDraft, usePeopleStore } from '../../store/people-store';
import type { ContactKind, Person } from '../../types/person';
import { Colors } from '../../utils/colors';
import {
  CONTACT_AMOUNTS,
  CONTACT_EMOJIS,
  CONTACT_LABELS,
  formatBirthdayHint,
  formatDaysSince,
  getDaysSince,
  getLastContactTs,
  parseBirthday,
} from '../../utils/people-utils';
import { Button } from '../button';
import { Text, TextInput } from '../text';

interface PersonDialogProps {
  /** Undefined to add a new person. */
  person?: Person;
  now: number;
  onClose: () => void;
}

const KINDS: ContactKind[] = ['in-person', 'call', 'message'];

/** Add or edit one person: contact details, matching names and a quick "we talked" log. */
export function PersonDialog({ person, now, onClose }: PersonDialogProps) {
  const keyboardUp = useKeyboardVisible();
  const insets = useSafeAreaInsets();
  const addPerson = usePeopleStore(state => state.addPerson);
  const updatePerson = usePeopleStore(state => state.updatePerson);
  const removePerson = usePeopleStore(state => state.removePerson);
  const logContact = usePeopleStore(state => state.logContact);
  const contacts = usePeopleStore(state => state.contacts);
  const [draft, setDraft] = useState<PersonDraft>(person ? { ...person } : EMPTY_PERSON);
  const [nudgeText, setNudgeText] = useState(String(draft.nudgeDays));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<PersonDraft>) => setDraft(current => ({ ...current, ...patch }));

  const birthdayValid = !draft.birthday.trim() || parseBirthday(draft.birthday) != null;
  const nudgeDays = Math.round(Number(nudgeText));
  const nudgeValid = Number.isFinite(nudgeDays) && nudgeDays >= 1 && nudgeDays <= 365;
  const valid = draft.name.trim().length > 0 && birthdayValid && nudgeValid;
  const last = person ? getLastContactTs(person.id, contacts) : undefined;
  const birthdayHint = formatBirthdayHint(draft.birthday, now);

  const save = () => {
    const finished = { ...draft, birthday: draft.birthday.trim(), nudgeDays };
    if (person) updatePerson(person.id, finished);
    else addPerson(finished);
    onClose();
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          keyboardUp && styles.overlayTop,
          { paddingTop: 24 + (keyboardUp ? insets.top : 0), paddingBottom: 24 + insets.bottom },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, keyboardUp && styles.sheetKeyboard]}>
          <Text style={styles.title}>{person ? person.name : 'Add a person'}</Text>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.form}
          >
            {person ? (
              <>
                <Text style={styles.label}>
                  {`LAST CONTACT · ${last == null ? 'never' : formatDaysSince(getDaysSince(last, now))}`}
                </Text>
                <View style={styles.kinds}>
                  {KINDS.map(kind => (
                    <Pressable
                      key={kind}
                      style={({ pressed }) => [styles.kind, pressed && styles.pressed]}
                      onPress={() => {
                        logContact(person.id, kind);
                        onClose();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${CONTACT_LABELS[kind]}, adds ${CONTACT_AMOUNTS[kind]} percent`}
                    >
                      <Text style={styles.kindEmoji}>{CONTACT_EMOJIS[kind]}</Text>
                      <Text
                        style={styles.kindLabel}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {CONTACT_LABELS[kind]}
                      </Text>
                      <Text style={styles.kindAmount}>{`+${CONTACT_AMOUNTS[kind]}%`}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <View style={styles.nameRow}>
              <TextInput
                style={[styles.input, styles.emojiInput]}
                value={draft.emoji}
                onChangeText={text => set({ emoji: text.trim().slice(-4) || '🧑' })}
                accessibilityLabel="Emoji"
              />
              <TextInput
                style={[styles.input, styles.flex]}
                value={draft.name}
                onChangeText={name => set({ name })}
                placeholder="Name"
                placeholderTextColor={Colors.text.faint}
                autoFocus={!person}
              />
            </View>
            <Field
              label="Also known as (nicknames, chat names)"
              value={draft.nicknames}
              onChange={nicknames => set({ nicknames })}
              placeholder="Lex, Alexander"
            />
            <Field
              label="Phone"
              value={draft.phone}
              onChange={phone => set({ phone })}
              placeholder="+84 912 345 678"
              keyboardType="phone-pad"
            />
            <Field
              label={`Birthday (MM-DD or YYYY-MM-DD)${birthdayHint ? ` · ${birthdayHint}` : ''}`}
              value={draft.birthday}
              onChange={birthday => set({ birthday })}
              placeholder="05-14"
              invalid={!birthdayValid}
            />
            <Field
              label="Address"
              value={draft.address}
              onChange={address => set({ address })}
              multiline
            />
            <Field
              label="Preferences (likes, dislikes, gift ideas)"
              value={draft.preferences}
              onChange={preferences => set({ preferences })}
              multiline
            />
            <View style={styles.nudgeRow}>
              <Text style={styles.nudgeLabel}>Turns red after</Text>
              <TextInput
                style={[styles.input, styles.nudgeInput]}
                value={nudgeText}
                onChangeText={setNudgeText}
                keyboardType="number-pad"
              />
              <Text style={styles.nudgeLabel}>days</Text>
            </View>
          </ScrollView>
          <View style={styles.actions}>
            {person ? (
              <Button
                onPress={() => {
                  if (!confirmDelete) return setConfirmDelete(true);
                  removePerson(person.id);
                  onClose();
                }}
              >
                {confirmDelete ? 'Tap again to delete' : 'Delete'}
              </Button>
            ) : null}
            <View style={styles.flex} />
            <Button onPress={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!valid}
              onPress={save}
            >
              Save
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  invalid?: boolean;
  keyboardType?: 'phone-pad';
}

function Field({ label, value, onChange, placeholder, multiline, invalid, keyboardType }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, invalid && styles.invalid]}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline, invalid && styles.invalidInput]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.faint}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayTop: { justifyContent: 'flex-start' },
  sheet: { backgroundColor: Colors.bg.card, borderRadius: 14, padding: 16, gap: 10, maxHeight: '88%' },
  sheetKeyboard: { maxHeight: '60%' },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  form: { gap: 10 },
  flex: { flex: 1 },
  field: { gap: 4 },
  label: { color: Colors.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  invalid: { color: Colors.type.undesirable },
  input: {
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  invalidInput: { borderWidth: 1, borderColor: Colors.type.undesirable },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  nameRow: { flexDirection: 'row', gap: 8 },
  emojiInput: { width: 56, textAlign: 'center', fontSize: 22 },
  kinds: { flexDirection: 'row', gap: 8 },
  kind: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: Colors.bg.input,
  },
  pressed: { opacity: 0.6 },
  kindEmoji: { fontSize: 20 },
  kindLabel: { color: Colors.text.primary, fontSize: 12, fontWeight: '600', maxWidth: '100%' },
  kindAmount: { color: Colors.type.desirable, fontSize: 11, fontWeight: '700' },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nudgeLabel: { color: Colors.text.light, fontSize: 13 },
  nudgeInput: { width: 64, textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
