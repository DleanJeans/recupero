import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useClearedImage } from '../hooks/use-cleared-image';
import { useIconImage } from '../hooks/use-icon-image';
import { DEFAULT_LAYER, getIconImageUrl, type ParsedIcon, presetLayer } from '../utils/icon-utils';
import { CroppedImage } from './cropped-image';
import { StackLayers } from './stack-layers';
import { Text } from './text';

interface Props {
  parsed: Extract<ParsedIcon, { kind: 'mix' | 'image' }>;
  box: number;
  /** Corner radius for image links. Defaults to 22% of the box. */
  imageRadius?: number;
}

/** An Emoji Kitchen mix or image link, shown from the on-device copy once downloaded. */
export function RemoteIcon({ parsed, box, imageRadius }: Props) {
  const radius = imageRadius ?? Math.round(box * 0.22);
  const url = getIconImageUrl(parsed);
  const image = useIconImage(url);
  const shown = useClearedImage(
    url,
    image.status === 'ready' ? image.uri : null,
    parsed.kind === 'image' ? parsed.clear : undefined,
  );

  if (image.status === 'ready' && parsed.kind === 'image') {
    return (
      <CroppedImage
        uri={shown ?? image.uri}
        box={box}
        radius={radius}
        crop={parsed.crop}
        background={parsed.clear?.fill}
      />
    );
  }

  if (image.status === 'ready') {
    return (
      <Image
        source={{ uri: image.uri }}
        resizeMode="contain"
        style={{ width: box, height: box }}
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
    <View style={[styles.placeholder, { width: box, height: box, borderRadius: radius }]}>
      {image.status === 'failed' && <Text style={{ fontSize: box * 0.5, opacity: 0.6 }}>🖼️</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
});
