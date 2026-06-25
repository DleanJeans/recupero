import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../utils/colors';
import { Text } from './Text';

interface UnitDropdownProps<V extends string> {
  value: V;
  options: readonly V[];
  onChange: (value: V) => void;
}

/** Compact "unit" selector: a small button with a chevron that opens a
 *  popover listing `options`. Closes on backdrop tap or selection. */
export function UnitDropdown<V extends string>({ value, options, onChange }: UnitDropdownProps<V>) {
  const [open, setOpen] = useState(false);

  const handleSelect = (next: V) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <View style={styles.unitWrapper}>
      <Pressable
        style={styles.unitButton}
        onPress={() => setOpen(o => !o)}
      >
        <Text style={styles.unitText}>{value}</Text>
        <Text style={styles.chevron}>▼</Text>
      </Pressable>
      {open && (
        <>
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
          />
          <View style={styles.dropdown}>
            {options.map(opt => (
              <Pressable
                key={opt}
                style={({ pressed }) => [
                  styles.pickerOption,
                  opt === value && styles.pickerOptionActive,
                  pressed && { opacity: 0.6 },
                ]}
                onPress={() => handleSelect(opt)}
              >
                <Text style={[styles.pickerOptionText, opt === value && styles.pickerOptionTextActive]}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  unitWrapper: {
    position: 'relative',
    zIndex: 1,
  },
  unitButton: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unitText: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  chevron: {
    color: Colors.text.muted,
    fontSize: 10,
  },
  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  dropdown: {
    position: 'absolute',
    bottom: 44,
    right: 0,
    minWidth: 140,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    padding: 4,
    zIndex: 11,
    shadowColor: Colors.bg.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  pickerOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pickerOptionText: {
    color: Colors.text.primary,
    fontSize: 15,
  },
  pickerOptionTextActive: {
    fontWeight: '700',
  },
});
