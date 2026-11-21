import { Ionicons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardVisible } from '../../hooks/use-keyboard-visible';
import { GeofenceMap } from '../../screens/location-edit-screen/components/geofence-map';
import { EMPTY_PERSON, type PersonDraft, usePeopleStore } from '../../store/people-store';
import type { ContactKind, Person } from '../../types/person';
import { Colors } from '../../utils/colors';
import type { GeoPoint } from '../../utils/geofence-utils';
import { geocodeAddress, getCurrentPoint, reverseGeocodePoint } from '../../utils/location-utils';
import {
  CONTACT_AMOUNTS,
  CONTACT_EMOJIS,
  CONTACT_LABELS,
  formatBirthdayHint,
  formatBirthdayInput,
  formatDaysSince,
  getBirthdayPlaceholder,
  getDateLocale,
  getDaysSince,
  getLastContactTs,
  parseBirthday,
  parseBirthdayInput,
  toBirthday,
} from '../../utils/people-utils';
import { Button } from '../button';
import { EmojiPicker } from '../emoji-picker';
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
  const [dateLocale] = useState(getDateLocale);
  const [birthdayText, setBirthdayText] = useState(() => formatBirthdayInput(draft.birthday, dateLocale));
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const pinRequest = useRef(0);
  const point: GeoPoint | null = draft.lat != null && draft.lng != null ? { lat: draft.lat, lng: draft.lng } : null;
  const set = (patch: Partial<PersonDraft>) => setDraft(current => ({ ...current, ...patch }));

  const dropPin = async (next: GeoPoint, fillAddress: boolean) => {
    const requestId = ++pinRequest.current;
    set({ lat: next.lat, lng: next.lng });
    if (!fillAddress) return;
    try {
      const resolved = await reverseGeocodePoint(next);
      if (resolved && requestId === pinRequest.current) set({ address: resolved });
    } catch {
      // Best effort: the pin is what matters.
    }
  };

  const findAddress = async () => {
    const query = draft.address.trim();
    if (!query) return;
    setSearching(true);
    try {
      const found = await geocodeAddress(query);
      if (found) await dropPin(found, false);
      else Alert.alert('No match', `Couldn't find "${query}". Try a fuller address, or tap the map.`);
    } catch {
      Alert.alert('Search failed', 'Check your connection, or tap the map to drop a pin.');
    } finally {
      setSearching(false);
    }
  };

  const locateMe = async () => {
    setLocating(true);
    try {
      const current = await getCurrentPoint();
      if (current) await dropPin(current, true);
      else Alert.alert('Location unavailable', 'Allow location access, or tap the map to drop a pin.');
    } catch {
      Alert.alert('Location unavailable', 'Could not get your position. Tap the map to drop a pin.');
    } finally {
      setLocating(false);
    }
  };

  const pickBirthday = () => {
    const parsed = parseBirthday(draft.birthday);
    DateTimePickerAndroid.open({
      mode: 'date',
      value: new Date(parsed?.year ?? 1995, (parsed?.month ?? 1) - 1, parsed?.day ?? 1),
      minimumDate: new Date(1900, 0, 1),
      maximumDate: new Date(),
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        const picked = toBirthday(date);
        set({ birthday: picked });
        setBirthdayText(formatBirthdayInput(picked, dateLocale));
      },
    });
  };

  const birthdayValid = parseBirthdayInput(birthdayText, dateLocale) != null;
  const nudgeDays = Math.round(Number(nudgeText));
  const nudgeValid = Number.isFinite(nudgeDays) && nudgeDays >= 1 && nudgeDays <= 365;
  const valid = draft.name.trim().length > 0 && birthdayValid && nudgeValid;
  const last = person ? getLastContactTs(person.id, contacts) : undefined;
  const birthdayHint = formatBirthdayHint(draft.birthday, now);

  const save = () => {
    const finished = { ...draft, birthday: draft.birthday.trim(), address: draft.address.trim(), nudgeDays };
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
              <EmojiPicker
                value={draft.emoji}
                onChangeText={emoji => set({ emoji: emoji || '🧑' })}
                nameHint={draft.name}
                style={styles.emojiInput}
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
            <View style={styles.field}>
              <Text style={[styles.label, !birthdayValid && styles.invalid]}>
                {`BIRTHDAY${birthdayHint ? ` · ${birthdayHint}` : ''}`}
              </Text>
              <View style={styles.addressRow}>
                <TextInput
                  style={[styles.input, styles.flex, !birthdayValid && styles.invalidInput]}
                  value={birthdayText}
                  onChangeText={text => {
                    setBirthdayText(text);
                    const stored = parseBirthdayInput(text, dateLocale);
                    if (stored != null) set({ birthday: stored });
                  }}
                  placeholder={getBirthdayPlaceholder(dateLocale)}
                  placeholderTextColor={Colors.text.faint}
                  keyboardType="numbers-and-punctuation"
                />
                <Button
                  variant="icon"
                  onPress={pickBirthday}
                  accessibilityLabel="Open calendar"
                >
                  <Ionicons
                    name="calendar-outline"
                    size={22}
                    color={Colors.text.secondary}
                  />
                </Button>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Address</Text>
              <View style={styles.addressRow}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  value={draft.address}
                  onChangeText={address => set({ address })}
                  placeholder="Search address or place"
                  placeholderTextColor={Colors.text.faint}
                  returnKeyType="search"
                  onSubmitEditing={findAddress}
                  editable={!searching}
                />
                {searching ? (
                  <ActivityIndicator
                    size="small"
                    color={Colors.text.faint}
                  />
                ) : (
                  <Button onPress={findAddress}>Find</Button>
                )}
              </View>
            </View>
            <GeofenceMap
              point={point}
              radiusM={20}
              isLocating={locating}
              onChangePoint={next => dropPin(next, true)}
              onLocateMe={locateMe}
              label={draft.name.trim() || undefined}
              height={180}
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
  emojiInput: { height: 46, borderRadius: 10 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  dateText: { color: Colors.text.primary, fontSize: 15 },
  datePlaceholder: { color: Colors.text.faint, fontSize: 15 },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nudgeLabel: { color: Colors.text.light, fontSize: 13 },
  nudgeInput: { width: 64, textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
