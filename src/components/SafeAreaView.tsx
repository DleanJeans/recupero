import React, { useMemo } from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Edge = 'top' | 'bottom' | 'left' | 'right';

interface SafeAreaViewProps extends ViewProps {
  edges?: Edge[];
}

const DEFAULT_EDGES: Edge[] = ['top', 'bottom', 'left', 'right'];

function numericPadding(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function basePadding(flatStyle: ViewStyle, side: Edge): number {
  if (side === 'top') {
    return numericPadding(flatStyle.paddingTop ?? flatStyle.paddingVertical ?? flatStyle.padding);
  }
  if (side === 'bottom') {
    return numericPadding(flatStyle.paddingBottom ?? flatStyle.paddingVertical ?? flatStyle.padding);
  }
  if (side === 'left') {
    return numericPadding(flatStyle.paddingLeft ?? flatStyle.paddingHorizontal ?? flatStyle.padding);
  }
  return numericPadding(flatStyle.paddingRight ?? flatStyle.paddingHorizontal ?? flatStyle.padding);
}

export function SafeAreaView({ edges = DEFAULT_EDGES, style, children, ...props }: SafeAreaViewProps) {
  const insets = useSafeAreaInsets();

  const insetStyle = useMemo(() => {
    const flatStyle = StyleSheet.flatten(style) ?? {};
    const next: ViewStyle = {};

    if (edges.includes('top')) next.paddingTop = insets.top + basePadding(flatStyle, 'top');
    if (edges.includes('bottom')) next.paddingBottom = insets.bottom + basePadding(flatStyle, 'bottom');
    if (edges.includes('left')) next.paddingLeft = insets.left + basePadding(flatStyle, 'left');
    if (edges.includes('right')) next.paddingRight = insets.right + basePadding(flatStyle, 'right');

    return next;
  }, [edges, insets.bottom, insets.left, insets.right, insets.top, style]);

  return (
    <View
      {...props}
      style={[style, insetStyle]}
    >
      {children}
    </View>
  );
}
