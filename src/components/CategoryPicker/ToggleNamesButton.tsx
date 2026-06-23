import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';
import { Colors } from '../../utils/colors';
import { Button } from '../Button';

export function ToggleNamesButton() {
  const hideNames = useSettingsStore(s => s.hideCategoryNames);
  const setHideNames = useSettingsStore(s => s.setHideCategoryNames);
  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={() => setHideNames(!hideNames)}
      style={styles.button}
      accessibilityLabel={hideNames ? 'Show category names' : 'Hide category names'}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name="text-outline"
          size={18}
          color={Colors.text.muted}
        />
        {hideNames && (
          <View style={styles.strikethrough}>
            <View style={styles.strikethroughInner} />
          </View>
        )}
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 4,
  },
  iconWrap: {
    width: 18,
    height: 18,
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
  strikethroughInner: {
    height: 1.5,
    backgroundColor: Colors.text.muted,
    position: 'absolute',
    top: 1.5,
    left: 0,
    right: 0,
    borderRadius: 2,
  },
});
