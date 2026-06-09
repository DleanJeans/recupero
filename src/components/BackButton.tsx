import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

export function BackButton() {
  const navigation = useNavigation();

  return (
    <Pressable
      style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
      onPress={navigation.goBack}
    >
      <Ionicons name="chevron-back" size={28} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backBtn: { padding: 8 },
});
