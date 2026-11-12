import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { IconPickerSheet } from './icon-picker/icon-picker-sheet';
import { IconTile } from './icon-tile';

type Props = React.ComponentProps<typeof IconTile> & {
  /** Saves the picked icon. */
  onChange: (value: string) => void;
  /** The item's name, used as the starting image search. */
  nameHint?: string;
};

/** An icon tile on a details screen: tap it to open the icon editor and save the new icon straight away. */
export function EditableIconTile({ onChange, nameHint, ...tile }: Props) {
  const [open, setOpen] = useState(false);
  const current = typeof tile.value === 'string' ? tile.value : '';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
        accessibilityRole="button"
        accessibilityLabel="Change icon"
      >
        <IconTile {...tile} />
      </Pressable>
      {open && (
        <IconPickerSheet
          value={current || tile.fallback || ''}
          nameHint={nameHint}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
