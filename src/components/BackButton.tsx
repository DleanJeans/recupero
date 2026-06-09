import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Colors } from '../utils/colors';
import { Button } from './Button';

export function BackButton() {
  const navigation = useNavigation();

  return (
    <Button variant="icon" onPress={navigation.goBack}>
      <Ionicons name="chevron-back" size={28} color={Colors.text.primary} />
    </Button>
  );
}
