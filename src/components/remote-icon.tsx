import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useIconImage } from '../hooks/use-icon-image';
import { DEFAULT_LAYER, getIconImageUrl, type ParsedIcon, presetLayer } from '../utils/icon-utils';
import { StackLayers } from './stack-layers';
import { Text } from './text';

interface Props {
  parsed: Extract<ParsedIcon, { kind: 'mix' | 'image' }>;
  box: number;
}

/** An Emoji Kitchen mix or image link, shown from the on-device copy once downloaded. */
export function RemoteIcon({ parsed, box }: Props) {
  const url = getIconImageUrl(parsed);
  const image = useIconImage(url);

  if (image.status === 'ready') {
    return (
      <Image
        source={{ uri: image.uri }}
        resizeMode={parsed.kind === 'image' ? 'cover' : 'contain'}
        style={{ width: box, height: box, borderRadius: parsed.kind === 'image' ? Math.round(box * 0.22) : 0 }}
      />
    );
  }

  if (parsed.kind === 'mix') {
    // While loading show the base emoji faded; if the mix can't be fetched, fall back to the pair as a badge stack.
    if (image.status === 'loading') {
      return (
        <View style={{ opacity: 0.35 }}>
          <StackLayers
            layers={[{ ...DEFAULT_LAYER, emoji: parsed.left }]}
            box={box}
          />
        </View>
      );
    }
    return (
      <StackLayers
        layers={[{ ...DEFAULT_LAYER, emoji: parsed.left }, presetLayer('badge', parsed.right)]}
        box={box}
      />
    );
  }

  return (
    <View style={[styles.placeholder, { width: box, height: box, borderRadius: Math.round(box * 0.22) }]}>
      {image.status === 'failed' && <Text style={{ fontSize: box * 0.5, opacity: 0.6 }}>🖼️</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
});
