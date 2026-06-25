import React, { useCallback, useEffect, useState } from 'react';
import type { NativeSyntheticEvent, StyleProp, TextLayoutEventData, TextStyle } from 'react-native';
import { ScreenTitle } from './ScreenTitle';

const HEADER_FONT_MAX = 28;
const HEADER_FONT_MIN = 14;

interface Props {
  name: string;
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

/** ScreenTitle whose font size shrinks from HEADER_FONT_MAX → HEADER_FONT_MIN
 *  (step 1) until the rendered line fits on one line.
 *  Resets to HEADER_FONT_MAX whenever `name` changes. */
export function AutoFitHeaderTitle({ name, children, style }: Props) {
  const [fontSize, setFontSize] = useState(HEADER_FONT_MAX);

  useEffect(() => {
    setFontSize(HEADER_FONT_MAX);
  }, [name]);

  const onTextLayout = useCallback((e: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (e.nativeEvent.lines.length > 1) {
      setFontSize(size => (size > HEADER_FONT_MIN ? size - 1 : size));
    }
  }, []);

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
