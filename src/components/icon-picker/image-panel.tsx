import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import {
  DEFAULT_CROP,
  type ImageClear,
  type ImageCrop,
  imageIcon,
  isImageUrl,
  parseIcon,
} from '../../utils/icon-utils';
import { Button } from '../button';
import { Text, TextInput } from '../text';
import { ImageCropEditor } from './image-crop-editor';
import { ImageSearchModal } from './image-search-modal';

interface Props {
  value: string;
  /** Starting search for Google Images, usually the item's name. */
  nameHint?: string;
  onUse: (value: string) => void;
}

/** Wait for typing to pause before previewing, so half-typed links aren't fetched. */
const PREVIEW_DELAY_MS = 600;

/** An image as the icon: search Google Images or paste a link, then crop. Downloaded once and kept on the phone. */
export function ImagePanel({ value, nameHint, onUse }: Props) {
  const [initial] = useState(() => {
    const parsed = parseIcon(value);
    return parsed.kind === 'image' ? { url: parsed.uri, crop: parsed.crop ?? DEFAULT_CROP, clear: parsed.clear } : null;
  });
  const [url, setUrl] = useState(initial?.url ?? '');
  const [crop, setCrop] = useState<ImageCrop>(initial?.crop ?? DEFAULT_CROP);
  const [clear, setClear] = useState<ImageClear | undefined>(initial?.clear);
  const [preview, setPreview] = useState(url);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPreview(url.trim()), PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [url]);

  const changeUrl = (next: string) => {
    setUrl(next);
    if (next.trim() !== initial?.url) {
      setCrop(DEFAULT_CROP);
      setClear(undefined);
    }
  };

  const valid = isImageUrl(url);

  return (
    <View style={styles.panel}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}
          onPress={() => setSearching(true)}
          accessibilityRole="button"
        >
          <Ionicons
            name="search"
            size={18}
            color={Colors.text.primary}
          />
          <Text style={styles.searchLabel}>Search Google Images</Text>
        </Pressable>

        <Text style={styles.label}>Or paste an image link</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={changeUrl}
          placeholder="https://…/picture.png"
          placeholderTextColor={Colors.text.faint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          onSubmitEditing={() => setPreview(url.trim())}
        />
        {url.trim() !== '' && !valid && <Text style={styles.error}>Links start with https://</Text>}

        {isImageUrl(preview) && preview === url.trim() ? (
          <ImageCropEditor
            url={preview}
            crop={crop}
            onChange={setCrop}
            clear={clear}
            onClearChange={setClear}
          />
        ) : (
          <Text style={styles.note}>
            The picture is saved on this phone after it loads once, so it shows offline too.
          </Text>
        )}
      </ScrollView>
      <Button
        variant="primary"
        disabled={!valid}
        onPress={() => onUse(imageIcon(url, crop, clear))}
      >
        Use image
      </Button>
      {searching && (
        <ImageSearchModal
          initialQuery={nameHint ?? ''}
          onClose={() => setSearching(false)}
          onPick={picked => {
            setSearching(false);
            changeUrl(picked);
            setPreview(picked);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, gap: 8 },
  flex: { flex: 1 },
  content: { gap: 8, paddingBottom: 8 },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingVertical: 12,
  },
  searchLabel: { color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
  label: { color: Colors.text.muted, fontSize: 12, marginTop: 4 },
  input: {
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  error: { color: Colors.type.undesirable, fontSize: 12 },
  note: { color: Colors.text.muted, fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.6 },
});
