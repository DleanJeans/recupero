import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { NativeSyntheticEvent, StyleProp, TextLayoutEventData, TextStyle } from 'react-native';
import {
  getCachedHeaderTitleFontSize,
  loadCachedHeaderTitleFontSize,
  saveCachedHeaderTitleFontSize,
} from '../utils/headerTitleFontCache';
import { ScreenTitle } from './ScreenTitle';

const HEADER_FONT_MAX = 28;
const HEADER_FONT_MIN = 14;
const HEADER_FONT_STEP = 2;

interface Props {
  name: string;
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

/** ScreenTitle whose font size shrinks from HEADER_FONT_MAX → HEADER_FONT_MIN
 *  until the rendered line fits on one line. */
export function AutoFitHeaderTitle({ name, children, style }: Props) {
  const [fontSize, setFontSize] = useState(() => getCachedHeaderTitleFontSize(name) ?? HEADER_FONT_MAX);
  const [isCacheReady, setIsCacheReady] = useState(() => getCachedHeaderTitleFontSize(name) != null);
  const isUsingCachedFontSize = useRef(getCachedHeaderTitleFontSize(name) != null);

  useEffect(() => {
    let isCurrent = true;
    const memoryCachedFontSize = getCachedHeaderTitleFontSize(name);

    if (memoryCachedFontSize != null) {
      isUsingCachedFontSize.current = true;
      setFontSize(memoryCachedFontSize);
      setIsCacheReady(true);
      return () => {
        isCurrent = false;
      };
    }

    isUsingCachedFontSize.current = false;
    setFontSize(HEADER_FONT_MAX);
    setIsCacheReady(false);

    loadCachedHeaderTitleFontSize(name).then(cachedFontSize => {
      if (!isCurrent) {
        return;
      }

      isUsingCachedFontSize.current = cachedFontSize != null;
      setFontSize(cachedFontSize ?? HEADER_FONT_MAX);
      setIsCacheReady(true);
    });

    return () => {
      isCurrent = false;
    };
  }, [name]);

  const onTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (isUsingCachedFontSize.current) {
        return;
      }

      const lineCount = e.nativeEvent.lines.length;
      setFontSize(size => {
        if (lineCount <= 1) {
          saveCachedHeaderTitleFontSize(name, size);
          isUsingCachedFontSize.current = true;
          return size;
        }

        const nextSize = Math.max(HEADER_FONT_MIN, size - HEADER_FONT_STEP);
        if (nextSize === size) {
          saveCachedHeaderTitleFontSize(name, size);
          isUsingCachedFontSize.current = true;
        }
        return nextSize;
      });
    },
    [name],
  );

  if (!isCacheReady) {
    return null;
  }

  return (
    <ScreenTitle
      style={[style, { fontSize }]}
      onTextLayout={onTextLayout}
    >
      {name}
      {children}
    </ScreenTitle>
  );
}
