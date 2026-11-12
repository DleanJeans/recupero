import React from 'react';
import { Image, View } from 'react-native';
import { useImageSize } from '../hooks/use-image-size';
import { hexToColor } from '../utils/hex-color-utils';
import { getCropFrame, type ImageCrop } from '../utils/icon-utils';

interface Props {
  uri: string;
  box: number;
  radius: number;
  crop?: ImageCrop;
  /** "rrggbb" filling the rounded square wherever the picture doesn't cover it (zoomed out or turned). */
  background?: string;
}

/** An image filling a square box, showing the part picked in the crop editor (the centre when uncropped),
 *  turned. */
export function CroppedImage({ uri, box, radius, crop, background }: Props) {
  const backgroundColor = background ? hexToColor(background) : undefined;
  const size = useImageSize(crop ? uri : null);

  if (!crop || !size) {
    return (
      <Image
        source={{ uri }}
        resizeMode="cover"
        style={{ width: box, height: box, borderRadius: radius, backgroundColor }}
      />
    );
  }

  const { rotation, originX, originY, ...frame } = getCropFrame(size.width, size.height, box, crop);
  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor,
      }}
    >
      <Image
        source={{ uri }}
        style={{
          position: 'absolute',
          ...frame,
          transformOrigin: [originX, originY, 0],
          transform: [{ rotate: `${rotation}deg` }],
        }}
      />
    </View>
  );
}
