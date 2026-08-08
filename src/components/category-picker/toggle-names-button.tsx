import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSettingsStore } from '../../store/settings-store';
import { Colors } from '../../utils/colors';
import { CategoryBarChip } from './category-bar-chip';

export function ToggleNamesButton() {
  const hideNames = useSettingsStore(s => s.hideCategoryNames);
  const setHideNames = useSettingsStore(s => s.setHideCategoryNames);
  return (
    <CategoryBarChip
      active={hideNames}
      onPress={() => setHideNames(!hideNames)}
      style={[styles.button, hideNames && styles.buttonActive]}
      accessibilityLabel={hideNames ? 'Show category names' : 'Hide category names'}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name="text-outline"
          size={18}
          color={Colors.text.muted}
        />
        {hideNames && (
          <View style={[styles.strikethrough, styles.strikethroughActive]}>
            <View style={[styles.strikethroughInner, styles.strikethroughInnerActive]} />
          </View>
        )}
      </View>
    </CategoryBarChip>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 30,
    height: 30,
    padding: 5,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  buttonActive: {
    backgroundColor: Colors.bg.input,
    borderColor: Colors.border.light,
  },
  iconWrap: {
    width: 18,
    height: 18,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strikethrough: {
    position: 'absolute',
    width: 24,
    height: 4.5,
    backgroundColor: Colors.bg.card,
    transform: [{ rotate: '-45deg' }],
  },
  strikethroughActive: {
    backgroundColor: Colors.bg.input,
  },
  strikethroughInner: {
    height: 1.5,
    backgroundColor: Colors.text.muted,
    position: 'absolute',
    top: 1.5,
    left: 0,
    right: 0,
    borderRadius: 2,
  },
  strikethroughInnerActive: {
    backgroundColor: Colors.text.muted,
  },
});
