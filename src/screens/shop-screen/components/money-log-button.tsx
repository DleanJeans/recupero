import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from '../../../components/button';
import { Colors } from '../../../utils/colors';

interface Props {
  onPress: () => void;
}

export function MoneyLogButton({ onPress }: Props) {
  return (
    <Button
      variant="icon"
      onPress={onPress}
      accessibilityLabel="Open money log"
      style={styles.button}
    >
      <Ionicons
        name="receipt-outline"
        size={18}
        color={Colors.text.light}
      />
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bg.input,
  },
});
