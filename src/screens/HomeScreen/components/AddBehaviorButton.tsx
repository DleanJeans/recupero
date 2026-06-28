import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Button } from '../../../components/Button';

interface Props {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AddBehaviorButton({ onPress, style }: Props) {
  return (
    <Button
      variant="primary"
      fab
      onPress={onPress}
      style={style}
    >
      + Add behavior
    </Button>
  );
}
