import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { Text } from './Text';

export function PrivateBehaviorSection() {
  const { hidePrivate, setHidePrivate } = useSettingsStore();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>PRIVACY</Text>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => setHidePrivate(!hidePrivate)}
      >
        <Text style={styles.label}>Hide private behaviors</Text>
        <View style={[styles.toggle, hidePrivate && styles.toggleOn]}>
          <View style={[styles.thumb, hidePrivate && styles.thumbOn]} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionTitle: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  label: {
    color: '#ccc',
    fontSize: 15,
    flex: 1,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#333',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: {
    backgroundColor: '#2E7D32',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#888',
  },
  thumbOn: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
});
