import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { Colors } from '../../../utils/colors';

interface ArchivedBannerProps {
  behaviorId: string;
}

/** Shown on an archived behaviour's page, with a button to bring it back. */
export function ArchivedBanner({ behaviorId }: ArchivedBannerProps) {
  const unarchiveBehavior = useBehaviorStore(state => state.unarchiveBehavior);

  return (
    <View style={styles.banner}>
      <Ionicons
        name="archive-outline"
        size={20}
        color={Colors.type.neutral}
      />
      <View style={styles.text}>
        <Text style={styles.title}>Archived</Text>
        <Text style={styles.detail}>Hidden from Routines, Cravings, pickers and suggestions</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => unarchiveBehavior(behaviorId)}
        accessibilityRole="button"
        accessibilityLabel="Unarchive"
      >
        <Text style={styles.buttonLabel}>Unarchive</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: Colors.type.neutral,
    fontSize: 14,
    fontWeight: '700',
  },
  detail: {
    color: Colors.text.light,
    fontSize: 12,
    marginTop: 2,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.type.neutral,
  },
  buttonLabel: {
    color: Colors.type.neutral,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
