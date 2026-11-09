import React, { useMemo, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../../../utils/colors';
import { Text } from '../../text';

export interface ChartPoint {
  /** X value: a timestamp, or any number when the axis isn't time. */
  x: number;
  y: number;
}

export interface ChartSeries {
  key: string;
  color: string;
  points: readonly ChartPoint[];
  /** Line thickness. */
  width?: number;
}

export interface ChartDot {
  key: string;
  x: number;
  y: number;
  color: string;
  selected?: boolean;
}

interface NeedLineChartProps {
  xMin: number;
  xMax: number;
  yMin?: number;
  yMax?: number;
  height: number;
  series: readonly ChartSeries[];
  /** Dashed horizontal line, e.g. the low line. */
  guideY?: number;
  guideColor?: string;
  dots?: readonly ChartDot[];
  onDotPress?: (key: string) => void;
  /** Shaded x ranges, e.g. quiet hours. */
  shade?: ReadonlyArray<{ from: number; to: number }>;
  xLabels?: ReadonlyArray<{ x: number; label: string }>;
}

const MAX_POINTS = 360;
const DASH = 5;
const DOT = 9;

/** Keeps every jump (two points at the same x) and thins the rest so long ranges stay fast. */
function thin(points: readonly ChartPoint[]): readonly ChartPoint[] {
  if (points.length <= MAX_POINTS) return points;
  const every = Math.ceil(points.length / MAX_POINTS);
  return points.filter(
    (point, i) =>
      i % every === 0 || i === points.length - 1 || points[i - 1]?.x === point.x || points[i + 1]?.x === point.x,
  );
}

/**
 * Line chart drawn with plain Views (no SVG dependency): each segment is a thin rotated bar.
 * Used for need levels over time and for the learned rate.
 */
export function NeedLineChart({
  xMin,
  xMax,
  yMin = 0,
  yMax = 100,
  height,
  series,
  guideY,
  guideColor = Colors.type.neutral,
  dots,
  onDotPress,
  shade,
  xLabels,
}: NeedLineChartProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const pad = 4;
  const sx = (x: number) => ((x - xMin) / Math.max(1, xMax - xMin)) * width;
  const sy = (y: number) => pad + (1 - (y - yMin) / Math.max(1e-6, yMax - yMin)) * (height - 2 * pad);

  const segments = useMemo(() => {
    if (width === 0) return [];
    const result: Array<{
      key: string;
      left: number;
      top: number;
      length: number;
      angle: number;
      color: string;
      w: number;
    }> = [];
    for (const line of series) {
      const points = thin(line.points);
      for (let i = 0; i + 1 < points.length; i++) {
        const x1 = sx(points[i].x);
        const y1 = sy(points[i].y);
        const x2 = sx(points[i + 1].x);
        const y2 = sy(points[i + 1].y);
        const length = Math.hypot(x2 - x1, y2 - y1);
        if (length < 0.5) continue;
        const w = line.width ?? 2;
        result.push({
          key: `${line.key}-${i}`,
          left: (x1 + x2) / 2 - length / 2,
          top: (y1 + y2) / 2 - w / 2,
          length,
          angle: Math.atan2(y2 - y1, x2 - x1),
          color: line.color,
          w,
        });
      }
    }
    return result;
    // sx/sy only depend on the values below.
  }, [series, width, height, xMin, xMax, yMin, yMax]);

  return (
    <View>
      <View
        style={[styles.plot, { height }]}
        onLayout={onLayout}
      >
        {width > 0 && (
          <>
            {shade?.map(range => (
              <View
                key={`shade-${range.from}`}
                style={[styles.shade, { left: sx(range.from), width: Math.max(0, sx(range.to) - sx(range.from)) }]}
              />
            ))}
            {guideY != null &&
              Array.from({ length: Math.ceil(width / (DASH * 2)) }, (_, i) => (
                <View
                  key={`dash-${i}`}
                  style={[styles.dash, { left: i * DASH * 2, top: sy(guideY), backgroundColor: guideColor }]}
                />
              ))}
            {segments.map(segment => (
              <View
                key={segment.key}
                style={{
                  position: 'absolute',
                  left: segment.left,
                  top: segment.top,
                  width: segment.length,
                  height: segment.w,
                  borderRadius: segment.w / 2,
                  backgroundColor: segment.color,
                  transform: [{ rotate: `${segment.angle}rad` }],
                }}
              />
            ))}
            {dots?.map(dot => (
              <Pressable
                key={dot.key}
                onPress={onDotPress ? () => onDotPress(dot.key) : undefined}
                hitSlop={10}
                style={[
                  styles.dot,
                  {
                    left: sx(dot.x) - DOT / 2,
                    top: sy(dot.y) - DOT / 2,
                    backgroundColor: dot.color,
                  },
                  dot.selected && styles.dotSelected,
                ]}
              />
            ))}
          </>
        )}
      </View>
      {xLabels && width > 0 ? (
        <View style={styles.labels}>
          {xLabels.map(label => (
            <Text
              key={`${label.x}`}
              style={[styles.label, { left: Math.min(width - 28, Math.max(0, sx(label.x) - 14)) }]}
            >
              {label.label}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: Colors.bg.darker,
  },
  shade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dash: {
    position: 'absolute',
    width: DASH,
    height: 1,
    opacity: 0.5,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
    borderColor: Colors.bg.primary,
  },
  dotSelected: {
    transform: [{ scale: 1.5 }],
    borderColor: Colors.text.primary,
  },
  labels: {
    height: 14,
    marginTop: 2,
  },
  label: {
    position: 'absolute',
    width: 28,
    textAlign: 'center',
    color: Colors.text.faint,
    fontSize: 9,
  },
});
