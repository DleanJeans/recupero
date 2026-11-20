import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BodySensationGrid } from '../../../screens/body-log-screen/components/body-sensation-grid';
import { MoodGrid } from '../../../screens/mood-log-screen/components/mood-grid';
import type { BodySensationId, MoodId } from '../../../types/cue';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { Text } from '../../text';

export type CheckInSheetKind = 'mood' | 'body';

interface CheckInSheetProps {
  kind: CheckInSheetKind;
  /** XP the log earns, shown as a hint. */
  xp: number;
  onLogMoods: (moods: MoodId[]) => void;
  onLogSensations: (sensations: BodySensationId[]) => void;
  onClose: () => void;
}

/** Bottom sheet with the mood or body grid: tap one or several tiles, then Log. No text input, so no keyboard docking. */
export function CheckInSheet({ kind, xp, onLogMoods, onLogSensations, onClose }: CheckInSheetProps) {
  const [moods, setMoods] = useState<MoodId[]>([]);
  const [sensations, setSensations] = useState<BodySensationId[]>([]);
  const toggle = <T extends string>(list: T[], item: T) =>
    list.includes(item) ? list.filter(entry => entry !== item) : [...list, item];
  const count = kind === 'mood' ? moods.length : sensations.length;
  const submit = () => {
    if (kind === 'mood') onLogMoods(moods);
    else onLogSensations(sensations);
  };
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const openFullScreen = () => {
    onClose();
    navigation.navigate(kind === 'mood' ? 'MoodLog' : 'BodyLog');
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close"
      />
      <View style={[styles.sheet, { paddingBottom: 18 + insets.bottom }]}>
        <View style={styles.grabber} />
        <Text style={styles.title}>
          {kind === 'mood' ? 'How do you feel right now?' : 'What does your body say?'}{' '}
          <Text style={styles.hint}>Pick all that apply</Text>
        </Text>
        {kind === 'mood' ? (
          <MoodGrid
            selectedMany={moods}
            onSelect={mood => setMoods(list => toggle(list, mood))}
          />
        ) : (
          <BodySensationGrid
            selectedMany={sensations}
            onSelect={sensation => setSensations(list => toggle(list, sensation))}
          />
        )}
        <View style={styles.footer}>
          <Pressable
            onPress={openFullScreen}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text
              style={styles.link}
              numberOfLines={1}
            >
              Add a note or see suggestions ›
            </Text>
          </Pressable>
          <Pressable
            onPress={submit}
            disabled={count === 0}
            style={[styles.logButton, count === 0 && styles.logButtonOff]}
            accessibilityRole="button"
            accessibilityLabel="Log selected"
          >
            <Text
              style={styles.logText}
              numberOfLines={1}
            >
              {count === 0 ? 'Pick any' : `Log ${count}${xp > 0 ? ` · +${xp} XP` : ''}`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000a' },
  sheet: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 12,
  },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border.light },
  hint: { color: Colors.text.muted, fontSize: 12, fontWeight: '400' },
  title: { color: Colors.text.primary, fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  link: { flexShrink: 1, color: Colors.text.muted, fontSize: 12 },
  logButton: {
    flexShrink: 0,
    minWidth: 96,
    alignItems: 'center',
    backgroundColor: Colors.cooldown.yellow,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  logButtonOff: { backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.default },
  logText: { color: '#1a1a1a', fontSize: 13, fontWeight: '700' },
});
