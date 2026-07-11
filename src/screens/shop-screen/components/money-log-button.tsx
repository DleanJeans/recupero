import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

interface Props {
  onPress: () => void;
}

export function MoneyLogButton({ onPress }: Props) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onPress={onPress}
      accessibilityLabel="Open money log"
      style={styles.button}
    >
      <View style={styles.content}>
        <Text style={styles.label}>Money log</Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.text.light}
        />
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  label: {
    color: Colors.text.light,
    fontSize: 14,
    fontWeight: '600',
  },
});
