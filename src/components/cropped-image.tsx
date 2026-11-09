import React from 'react';
import { Image, View } from 'react-native';
import { useImageSize } from '../hooks/use-image-size';
import { getCropFrame, type ImageCrop } from '../utils/icon-utils';

interface Props {
  uri: string;
  box: number;
  radius: number;
  crop?: ImageCrop;
}

/** An image filling a square box, showing the part picked in the crop editor (the centre when uncropped). */
export function CroppedImage({ uri, box, radius, crop }: Props) {
  const size = useImageSize(crop ? uri : null);

  if (!crop || !size) {
    return (
      <Image
        source={{ uri }}
        resizeMode="cover"
        style={{ width: box, height: box, borderRadius: radius }}
      />
    );
  }

  const frame = getCropFrame(size.width, size.height, box, crop);
  return (
    <View style={{ width: box, height: box, borderRadius: radius, overflow: 'hidden' }}>
      <Image
        source={{ uri }}
        style={{ position: 'absolute', ...frame }}
      />
    </View>
  );
}
