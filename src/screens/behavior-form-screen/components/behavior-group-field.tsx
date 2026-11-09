import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { EmojiPicker } from '../../../components/emoji-picker';
import { Text, TextInput } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { getGroupNames, isSameGroup, normalizeGroupName } from '../../../utils/behavior-group-utils';
import { Colors } from '../../../utils/colors';

interface Props {
  value: string;
  onChange: (group: string) => void;
  /** Emoji for the whole group, shared by every member. */
  emoji: string;
  onEmojiChange: (emoji: string) => void;
}

const MAX_SUGGESTIONS = 8;

/** Group name for variants of one thing (e.g. flavours of Omachi). Existing groups show as tap-to-fill chips. */
export function BehaviorGroupField({ value, onChange, emoji, onEmojiChange }: Props) {
  const behaviors = useBehaviorStore(state => state.behaviors);
  const groupNames = useMemo(() => getGroupNames(behaviors), [behaviors]);
  const suggestions = useMemo(() => {
    const query = normalizeGroupName(value)?.toLocaleLowerCase() ?? '';
    return groupNames
      .filter(name => !isSameGroup(name, value) && name.toLocaleLowerCase().includes(query))
      .slice(0, MAX_SUGGESTIONS);
  }, [groupNames, value]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Group</Text>
      <View style={styles.row}>
        {normalizeGroupName(value) != null && (
          <EmojiPicker
            value={emoji}
            onChangeText={onEmojiChange}
            nameHint={value}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="e.g. Omachi"
          placeholderTextColor={Colors.text.faint}
          value={value}
          onChangeText={onChange}
          autoCorrect={false}
        />
      </View>
      {suggestions.length > 0 && (
        <View style={styles.chips}>
          {suggestions.map(name => (
            <Pressable
              key={name}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              onPress={() => onChange(name)}
              accessibilityRole="button"
              accessibilityLabel={`Use group ${name}`}
            >
              <Text style={styles.chipLabel}>{name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Text style={styles.hint}>
        Behaviors in the same group (like flavors of one food) show as chips on the log screen. Each keeps its own XP.
        The emoji is the group's icon on Routines.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipLabel: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    color: Colors.text.faint,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
