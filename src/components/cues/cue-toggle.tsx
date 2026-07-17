import React from 'react';
import { Switch } from 'react-native';
import { Colors } from '../../utils/colors';

interface CueToggleProps {
  value: boolean;
  accent?: string;
  onValueChange: (value: boolean) => void;
}

export function CueToggle({ value, accent = Colors.type.desirable, onValueChange }: CueToggleProps) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: Colors.border.default, true: accent }}
      thumbColor={Colors.text.primary}
    />
  );
}
