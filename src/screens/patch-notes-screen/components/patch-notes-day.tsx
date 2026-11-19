import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type {
  PatchNotesDay as PatchNotesDayData,
  PatchNotesItem,
  PatchNotesLinkedItem,
} from '../../../data/patch-notes';
import { usePatchNotesStore } from '../../../store/patch-notes-store';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { formatPatchNotesDate, patchNotesItemText, splitAtPhrase } from '../../../utils/patch-notes-utils';

export function PatchNotesDay({ day, newTexts }: { day: PatchNotesDayData; newTexts: string[] }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const checked = usePatchNotesStore(state => state.checked);
  const toggle = usePatchNotesStore(state => state.toggle);

  const open = (item: PatchNotesLinkedItem) =>
    (navigation.navigate as (screen: string, params?: object) => void)(item.screen, item.params);

  const renderText = (item: PatchNotesItem, text: string, done: boolean) => {
    const textStyle = done ? styles.itemDone : undefined;
    if (typeof item === 'string') return <Text style={textStyle}>{text}</Text>;
    const link = (label: string) => (
      <Text
        style={styles.linkText}
        onPress={() => open(item)}
        accessibilityRole="link"
      >
        {label}
      </Text>
    );
    const parts = splitAtPhrase(text, item.linkPhrase);
    if (parts) {
      return (
        <>
          <Text style={textStyle}>{parts.before}</Text>
          {link(parts.match)}
          <Text style={textStyle}>{parts.after}</Text>
        </>
      );
    }
    return (
      <>
        <Text style={textStyle}>{text} </Text>
        {link(item.linkLabel ?? 'Open')}
      </>
    );
  };

  return (
    <View style={styles.day}>
      <Text style={styles.date}>{formatPatchNotesDate(day.date)}</Text>
      {day.items.map(item => {
        const text = patchNotesItemText(item);
        const done = checked.includes(text);
        const isNew = newTexts.includes(text);
        return (
          <View
            key={text}
            style={styles.itemRow}
          >
            <Pressable
              onPress={() => toggle(text)}
              style={styles.checkRow}
              accessibilityRole="checkbox"
              accessibilityLabel={text}
              accessibilityState={{ checked: done }}
            >
              <Ionicons
                name={done ? 'checkbox' : 'checkbox-outline'}
                size={22}
                color={done ? Colors.text.primary : Colors.border.light}
              />
              <Text style={styles.item}>
                {isNew ? <Text style={styles.newTag}>NEW </Text> : null}
                {renderText(item, text, done)}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  day: { marginBottom: 20 },
  date: { color: Colors.text.white, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  checkRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  item: { flex: 1, color: Colors.text.white, fontSize: 14, lineHeight: 22 },
  itemDone: { opacity: 0.5, textDecorationLine: 'line-through' },
  newTag: { color: Colors.text.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  linkText: { color: '#5ab0ff', textDecorationLine: 'underline' },
});
