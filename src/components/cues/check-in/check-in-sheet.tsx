import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
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
  selectedMood?: MoodId;
  selectedSensation?: BodySensationId;
  onPickMood: (mood: MoodId) => void;
  onPickSensation: (sensation: BodySensationId) => void;
  onClose: () => void;
}

/** Bottom sheet with the mood or body grid; one tap logs and closes it. No text input, so no keyboard docking. */
export function CheckInSheet({
  kind,
  xp,
  selectedMood,
  selectedSensation,
  onPickMood,
  onPickSensation,
  onClose,
}: CheckInSheetProps) {
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
        <Text style={styles.title}>{kind === 'mood' ? 'How do you feel right now?' : 'What does your body say?'}</Text>
        {kind === 'mood' ? (
          <MoodGrid
            selectedMood={selectedMood}
            onSelect={onPickMood}
          />
        ) : (
          <BodySensationGrid
            selected={selectedSensation}
            onSelect={onPickSensation}
          />
        )}
        <View style={styles.footer}>
          <Pressable
            onPress={openFullScreen}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.link}>Add a note or see suggestions ›</Text>
          </Pressable>
          {xp > 0 ? <Text style={styles.xp}>+{xp} XP</Text> : null}
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
  title: { color: Colors.text.primary, fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: Colors.text.muted, fontSize: 12 },
  xp: { color: Colors.cooldown.yellow, fontSize: 12, fontWeight: '700' },
});
