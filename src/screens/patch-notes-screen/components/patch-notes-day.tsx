import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { PatchNotesDay as PatchNotesDayData } from '../../../data/patch-notes';
import { usePatchNotesStore } from '../../../store/patch-notes-store';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { formatPatchNotesDate, patchNotesItemText } from '../../../utils/patch-notes-utils';

export function PatchNotesDay({ day }: { day: PatchNotesDayData }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const checked = usePatchNotesStore(state => state.checked);
  const toggle = usePatchNotesStore(state => state.toggle);

  return (
    <View style={styles.day}>
      <Text style={styles.date}>{formatPatchNotesDate(day.date)}</Text>
      {day.items.map(item => {
        const text = patchNotesItemText(item);
        const done = checked.includes(text);
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
              <Text style={[styles.item, done && styles.itemDone]}>{text}</Text>
            </Pressable>
            {typeof item !== 'string' && (
              <Pressable
                onPress={() =>
                  (navigation.navigate as (screen: string, params?: object) => void)(item.screen, item.params)
                }
                style={styles.link}
                accessibilityRole="link"
                accessibilityLabel={`Open ${item.linkLabel ?? item.screen}`}
              >
                <Text
                  style={styles.linkText}
                  numberOfLines={1}
                >
                  {item.linkLabel ?? 'Open'}
                </Text>
                <Ionicons
                  name="open-outline"
                  size={14}
                  color={Colors.text.primary}
                />
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  day: { marginBottom: 20 },
  date: { color: Colors.text.dim, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  checkRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  item: { flex: 1, color: Colors.text.faint, fontSize: 14, lineHeight: 22 },
  itemDone: { opacity: 0.5, textDecorationLine: 'line-through' },
  link: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 1,
  },
  linkText: { color: Colors.text.primary, fontSize: 12, fontWeight: '600' },
});
