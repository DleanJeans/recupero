import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { minutesFromPercentPerMinute, percentPerMinuteFromMinutes } from '../../utils/fill-rate-utils';
import { parseDecimalInput } from '../../utils/metadata-calculation-utils';
import { Text, TextInput } from '../text';

interface FillRateFieldsProps {
  minutesText: string;
  onMinutesTextChange: (text: string) => void;
  /** Autofocus the minutes field. */
  autoFocus?: boolean;
}

/** Two linked fields for one fill rate: minutes to fill 0-100%, and percent filled per minute. Editing one updates the other. */
export function FillRateFields({ minutesText, onMinutesTextChange, autoFocus }: FillRateFieldsProps) {
  const [percentText, setPercentText] = useState(() => percentPerMinuteFromMinutes(parseDecimalInput(minutesText)));

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={minutesText}
          onChangeText={text => {
            onMinutesTextChange(text);
            setPercentText(percentPerMinuteFromMinutes(parseDecimalInput(text)));
          }}
          keyboardType="decimal-pad"
          placeholderTextColor={Colors.text.faint}
          selectTextOnFocus
          autoFocus={autoFocus}
        />
        <Text
          style={styles.suffix}
          numberOfLines={1}
        >
          min
        </Text>
      </View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={percentText}
          onChangeText={text => {
            setPercentText(text);
            const minutes = minutesFromPercentPerMinute(parseDecimalInput(text));
            if (minutes || text.trim() === '') onMinutesTextChange(minutes);
          }}
          keyboardType="decimal-pad"
          placeholderTextColor={Colors.text.faint}
          selectTextOnFocus
        />
        <Text
          style={styles.suffix}
          numberOfLines={1}
        >
          % per min
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 17,
    fontWeight: '600',
  },
  suffix: { width: 84, color: Colors.text.muted, fontSize: 17, fontWeight: '600' },
});
