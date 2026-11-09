import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../../utils/colors';
import type { NeedDayBand } from '../../../utils/need-history-utils';
import { Text } from '../../text';

interface NeedDayBandsProps {
  bands: readonly NeedDayBand[];
  color: string;
  lowLine: number;
  height: number;
  /** Label under each day, same order as bands. Omit for no labels. */
  labels?: readonly string[];
}

/** One column per day from its lowest to highest level, with a dot at the average. */
export function NeedDayBands({ bands, color, lowLine, height, labels }: NeedDayBandsProps) {
  const pad = 4;
  const y = (level: number) => pad + (1 - level / 100) * (height - 2 * pad);
  return (
    <View>
      <View style={[styles.plot, { height }]}>
        <View style={[styles.guide, { top: y(lowLine) }]} />
        <View style={styles.row}>
          {bands.map(band => (
            <View
              key={band.start}
              style={styles.column}
            >
              {band.min != null && band.max != null ? (
                <View
                  style={[
                    styles.band,
                    {
                      top: y(band.max),
                      height: Math.max(4, y(band.min) - y(band.max)),
                      backgroundColor: `${color}40`,
                    },
                  ]}
                />
              ) : null}
              {band.avg != null ? (
                <View style={[styles.avg, { top: y(band.avg) - 4, backgroundColor: color }]} />
              ) : null}
            </View>
          ))}
        </View>
      </View>
      {labels ? <DayLabels labels={labels} /> : null}
    </View>
  );
}

interface NeedLowBarsProps {
  bands: readonly NeedDayBand[];
  height: number;
  labels?: readonly string[];
}

/** Hours spent below the low line each day; red when it was more than three hours. */
export function NeedLowBars({ bands, height, labels }: NeedLowBarsProps) {
  const maxMs = Math.max(3_600_000, ...bands.map(band => band.lowMs));
  return (
    <View>
      <View style={[styles.lowRow, { height }]}>
        {bands.map(band => (
          <View
            key={band.start}
            style={styles.column}
          >
            <View
              style={[
                styles.lowBar,
                {
                  height: Math.max(band.lowMs > 0 ? 3 : 0, (band.lowMs / maxMs) * (height - 4)),
                  backgroundColor: band.lowMs > 3 * 3_600_000 ? Colors.type.undesirable : Colors.type.neutral,
                },
              ]}
            />
          </View>
        ))}
      </View>
      {labels ? <DayLabels labels={labels} /> : null}
    </View>
  );
}

function DayLabels({ labels }: { labels: readonly string[] }) {
  return (
    <View style={styles.labels}>
      {labels.map((label, i) => (
        <Text
          key={`${i}-${label}`}
          style={styles.label}
          numberOfLines={1}
        >
          {label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    borderRadius: 8,
    backgroundColor: Colors.bg.darker,
    overflow: 'hidden',
  },
  guide: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.type.neutral,
    opacity: 0.35,
  },
  row: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  band: {
    position: 'absolute',
    width: '55%',
    maxWidth: 24,
    borderRadius: 6,
  },
  avg: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lowRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  lowBar: {
    width: '55%',
    maxWidth: 24,
    borderRadius: 4,
  },
  labels: {
    flexDirection: 'row',
    marginTop: 2,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    color: Colors.text.faint,
    fontSize: 9,
  },
});
