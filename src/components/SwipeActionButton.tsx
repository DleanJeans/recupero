import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { Colors } from '../utils/colors';
import { Button } from './Button';
import { Text } from './Text';

type Side = 'left' | 'right';

interface SwipeActionButtonProps {
  onPress: () => void;
  /** Which edge the action is anchored to. Controls mirrored margin/radius. */
  side?: Side;
}

export function SwipeDeleteButton({ onPress, side = 'left' }: SwipeActionButtonProps) {
  return (
    <Button
      variant="danger"
      onPress={onPress}
      style={[styles.action, styles.delete, sideStyles[side]]}
    >
      <Ionicons
        name="trash"
        size={24}
        color={Colors.text.primary}
      />
      <Text style={styles.label}>Delete</Text>
    </Button>
  );
}

export function SwipeEditButton({ onPress, side = 'right' }: SwipeActionButtonProps) {
  return (
    <Button
      variant="danger"
      onPress={onPress}
      style={[styles.action, styles.edit, sideStyles[side]]}
    >
      <Ionicons
        name="create-outline"
        size={24}
        color={Colors.text.primary}
      />
      <Text style={styles.label}>Edit</Text>
    </Button>
  );
}

const styles = StyleSheet.create({
  action: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginVertical: 6,
  },
  label: {
    color: Colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  delete: {
    backgroundColor: Colors.status.danger,
  },
  edit: {
    backgroundColor: Colors.status.info,
  },
});

const sideStyles: Record<Side, ViewStyle> = {
  left: {
    marginLeft: 16,
    marginRight: -40,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingRight: 28,
  },
  right: {
    marginRight: 16,
    marginLeft: -40,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingLeft: 28,
  },
};
