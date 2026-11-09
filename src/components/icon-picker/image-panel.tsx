import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { isImageUrl, parseIcon } from '../../utils/icon-utils';
import { AppIcon } from '../app-icon';
import { Button } from '../button';
import { Text, TextInput } from '../text';

interface Props {
  value: string;
  onUse: (value: string) => void;
}

/** Wait for typing to pause before previewing, so half-typed links aren't fetched. */
const PREVIEW_DELAY_MS = 600;

/** An image link as the icon. It is downloaded once and kept on the phone. */
export function ImagePanel({ value, onUse }: Props) {
  const [url, setUrl] = useState(() => {
    const parsed = parseIcon(value);
    return parsed.kind === 'image' ? parsed.uri : '';
  });
  const [preview, setPreview] = useState(url);

  useEffect(() => {
    const timer = setTimeout(() => setPreview(url.trim()), PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [url]);

  const valid = isImageUrl(url);

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>Image link</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder="https://…/picture.png"
        placeholderTextColor={Colors.text.faint}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="done"
        onSubmitEditing={() => setPreview(url.trim())}
      />
      {url.trim() !== '' && !valid && <Text style={styles.error}>Links start with https://</Text>}
      <View style={styles.previewRow}>
        <View style={styles.previewBox}>
          {isImageUrl(preview) ? (
            <AppIcon
              value={preview}
              size={54}
            />
          ) : (
            <Text style={styles.previewEmpty}>🖼️</Text>
          )}
        </View>
        <Text style={styles.note}>
          Square images look best. The picture is saved on this phone after it loads once, so it shows offline too.
        </Text>
      </View>
      <View style={styles.spacer} />
      <Button
        variant="primary"
        disabled={!valid}
        onPress={() => onUse(url.trim())}
      >
        Use image
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, gap: 8 },
  label: { color: Colors.text.muted, fontSize: 12 },
  input: {
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  error: { color: Colors.type.undesirable, fontSize: 12 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  previewBox: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: Colors.bg.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmpty: { fontSize: 28, opacity: 0.4 },
  note: { flex: 1, color: Colors.text.muted, fontSize: 12, lineHeight: 17 },
  spacer: { flex: 1 },
});
