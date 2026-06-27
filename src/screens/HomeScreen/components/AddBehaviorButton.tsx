import React from 'react';
import { Button } from '../../../components/Button';

interface Props {
  onPress: () => void;
}

export function AddBehaviorButton({ onPress }: Props) {
  return (
    <Button
      variant="primary"
      fab
      onPress={onPress}
    >
      + Add behavior
    </Button>
  );
}
