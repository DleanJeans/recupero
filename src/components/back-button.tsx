import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Colors } from '../utils/colors';
import { Button } from './button';

interface Props {
  /** Override default goBack(). When omitted, calls navigation.goBack(). */
  onPress?: () => void;
}

export function BackButton({ onPress }: Props) {
  const navigation = useNavigation();

  return (
    <Button
      variant="icon"
      onPress={onPress ?? navigation.goBack}
    >
      <Ionicons
        name="chevron-back"
        size={28}
        color={Colors.text.primary}
      />
    </Button>
  );
}
