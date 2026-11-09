import React from 'react';
import { Image } from 'react-native';
import { findKitchenMix, getKitchenUrl } from '../../utils/emoji-kitchen-utils';
import { DEFAULT_LAYER, presetLayer } from '../../utils/icon-utils';
import { StackLayers } from '../stack-layers';

interface Props {
  left: string;
  right: string;
  size: number;
}

/** A mix shown straight from Google's server while browsing, so browsing doesn't fill the on-device icon folder. */
export function KitchenPreview({ left, right, size }: Props) {
  const mix = findKitchenMix(left, right);
  if (!mix) {
    return (
      <StackLayers
        layers={[{ ...DEFAULT_LAYER, emoji: left }, presetLayer('badge', right)]}
        box={size}
      />
    );
  }
  return (
    <Image
      source={{ uri: getKitchenUrl(mix) }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
