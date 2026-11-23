import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardVisible } from '../../hooks/use-keyboard-visible';
import type { EnergyProfile, EnergySex } from '../../types/need';
import { ACTIVITY_LEVELS, DEFAULT_ENERGY_PROFILE, getBmr, getDailyBurn } from '../../utils/calorie-balance-utils';
import { Colors } from '../../utils/colors';
import { parseDecimalInput } from '../../utils/metadata-calculation-utils';
import { Button } from '../button';
import { Text, TextInput } from '../text';

interface EnergyProfileDialogProps {
  initial?: EnergyProfile;
  onSave: (profile: EnergyProfile) => void;
  onClose: () => void;
}

const SEXES: ReadonlyArray<{ value: EnergySex; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

function toText(value: number | undefined): string {
  return value == null ? '' : String(Number(value.toFixed(1)));
}

/** Body details used to estimate how many kcal you burn a day (Mifflin-St Jeor x activity). */
export function EnergyProfileDialog({ initial, onSave, onClose }: EnergyProfileDialogProps) {
  const keyboardUp = useKeyboardVisible();
  const insets = useSafeAreaInsets();
  const start = initial ?? DEFAULT_ENERGY_PROFILE;
  const [sex, setSex] = useState<EnergySex>(start.sex);
  const [age, setAge] = useState(toText(initial?.age));
  const [weight, setWeight] = useState(toText(initial?.weightKg));
  const [height, setHeight] = useState(toText(initial?.heightCm));
  const [activity, setActivity] = useState(start.activity);
  const [fixed, setFixed] = useState(toText(initial?.fixedKcal));

  const ageValue = parseDecimalInput(age);
  const weightValue = parseDecimalInput(weight);
  const heightValue = parseDecimalInput(height);
  const fixedValue = parseDecimalInput(fixed);
  const hasFixed = fixedValue != null && fixedValue > 0;
  const bodyValid =
    ageValue != null &&
    ageValue >= 10 &&
    ageValue <= 110 &&
    weightValue != null &&
    weightValue >= 25 &&
    weightValue <= 350 &&
    heightValue != null &&
    heightValue >= 100 &&
    heightValue <= 250;
  const profile: EnergyProfile | undefined = bodyValid
    ? {
        sex,
        age: ageValue,
        weightKg: weightValue,
        heightCm: heightValue,
        activity,
        ...(hasFixed ? { fixedKcal: fixedValue } : {}),
      }
    : undefined;
  const preview = profile ? Math.round(hasFixed ? getDailyBurn(profile) : getBmr(profile) * activity) : undefined;

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
        <View style={styles.sheet}>
          <Text style={styles.title}>Your body</Text>
          <Text style={styles.hint}>Used to estimate the kcal you burn a day. Stays on this phone.</Text>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.form}
          >
            <View style={styles.chips}>
              {SEXES.map(item => (
                <Pressable
                  key={item.value}
                  style={[styles.chip, sex === item.value && styles.chipOn]}
                  onPress={() => setSex(item.value)}
                  accessibilityRole="button"
                >
                  <Text
                    style={[styles.chipText, sex === item.value && styles.chipTextOn]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.fields}>
              <LabeledInput
                label="Age"
                suffix="y"
                value={age}
                onChange={setAge}
              />
              <LabeledInput
                label="Weight"
                suffix="kg"
                value={weight}
                onChange={setWeight}
              />
              <LabeledInput
                label="Height"
                suffix="cm"
                value={height}
                onChange={setHeight}
              />
            </View>
            <Text style={styles.label}>Everyday activity</Text>
            <View style={styles.chips}>
              {ACTIVITY_LEVELS.map(level => (
                <Pressable
                  key={level.factor}
                  style={[styles.chip, activity === level.factor && styles.chipOn]}
                  onPress={() => setActivity(level.factor)}
                  accessibilityRole="button"
                  accessibilityLabel={`${level.label}, ${level.hint}`}
                >
                  <Text
                    style={[styles.chipText, activity === level.factor && styles.chipTextOn]}
                    numberOfLines={1}
                  >
                    {level.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>
              {ACTIVITY_LEVELS.find(level => level.factor === activity)?.hint ?? ''} · x{activity}
            </Text>
            <Text style={styles.label}>Or type your own burn per day (optional)</Text>
            <View style={styles.fields}>
              <LabeledInput
                label="Burn"
                suffix="kcal"
                value={fixed}
                onChange={setFixed}
              />
            </View>
            <Text style={styles.preview}>
              {preview != null ? `≈ ${preview.toLocaleString('en-US')} kcal a day` : 'Fill age, weight and height'}
            </Text>
          </ScrollView>
          <View style={styles.actions}>
            <Button onPress={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!profile}
              onPress={() => profile && onSave(profile)}
            >
              Save
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface LabeledInputProps {
  label: string;
  suffix: string;
  value: string;
  onChange: (text: string) => void;
}

function LabeledInput({ label, suffix, value, onChange }: LabeledInputProps) {
  return (
    <View style={styles.field}>
      <Text
        style={styles.fieldLabel}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholderTextColor={Colors.text.faint}
          selectTextOnFocus
        />
        <Text
          style={styles.suffix}
          numberOfLines={1}
        >
          {suffix}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayTop: { justifyContent: 'flex-start' },
  sheet: { backgroundColor: Colors.bg.card, borderRadius: 14, padding: 16, gap: 8, maxHeight: '100%' },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  hint: { color: Colors.text.muted, fontSize: 12, lineHeight: 17 },
  form: { gap: 10, paddingVertical: 4 },
  label: { color: Colors.text.secondary, fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.input,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipOn: { borderColor: Colors.type.desirable, backgroundColor: '#1f3a28' },
  chipText: { color: Colors.text.light, fontSize: 14, fontWeight: '600' },
  chipTextOn: { color: Colors.text.primary },
  fields: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, gap: 4 },
  fieldLabel: { color: Colors.text.muted, fontSize: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: {
    flex: 1,
    minWidth: 0,
    height: 42,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontSize: 16,
    fontWeight: '600',
  },
  suffix: { color: Colors.text.muted, fontSize: 13, flexShrink: 0, minWidth: 22 },
  preview: { color: Colors.text.primary, fontSize: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
