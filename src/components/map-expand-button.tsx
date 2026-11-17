import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../utils/colors';

interface MapExpandButtonProps {
  fullScreen: boolean;
  onPress: () => void;
  color: string;
}

/** Top-right corner button that opens a map full screen, or closes the full-screen copy. */
export function MapExpandButton({ fullScreen, onPress, color }: MapExpandButtonProps) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      style={[styles.button, fullScreen && { top: 10 + insets.top }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={fullScreen ? 'Close full screen map' : 'Open map in full screen'}
    >
      <Ionicons
        name={fullScreen ? 'close' : 'expand'}
        size={20}
        color={color}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.card,
  },
});
