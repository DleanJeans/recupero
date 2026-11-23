import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useCuesStore } from '../../store/cues-store';
import type { SunlightStretch } from '../../types/sunlight';
import { Colors } from '../../utils/colors';
import type { SunlightTimelineItem } from '../../utils/sunlight-timeline-utils';
import {
  formatLux,
  formatLuxMinutes,
  formatSunlightMinutes,
  getSunlightBrightness,
  type SunlightBrightness,
} from '../../utils/sunlight-utils';
import { formatTime } from '../../utils/time-utils';
import { AppIcon } from '../app-icon';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';

const BRIGHTNESS_LABELS: Record<SunlightBrightness, string> = {
  bright: 'bright',
  overcast: 'overcast',
  dim: 'dim',
};

const PLACE_COLOR = Colors.cue.location;

interface SunlightTimelineProps {
  items: SunlightTimelineItem[];
  /** A stretch out that started but is too short to count yet. */
  pendingSince?: number;
  onEdit: (stretch: SunlightStretch) => void;
}

const minutesBetween = (start: number, end: number) => formatSunlightMinutes(Math.floor((end - start) / 60_000));

/** Today newest first: stays at your places, the sessions outside that counted (with their light dose) and pauses. */
export function SunlightTimeline({ items, pendingSince, onEdit }: SunlightTimelineProps) {
  const places = useCuesStore(state => state.places);

  if (items.length === 0 && pendingSince == null) {
    return <Text style={styles.empty}>Nothing tracked on this day yet.</Text>;
  }

  return (
    <View style={styles.rail}>
      {pendingSince != null && (
        <View style={styles.item}>
          <View style={[styles.dot, { backgroundColor: SUNLIGHT_COLOR }]} />
          <View style={[styles.session, styles.live]}>
            <View style={styles.sessionText}>
              <Text style={styles.time}>{`${formatTime(pendingSince)} – now`}</Text>
              <Text style={styles.detail}>Just started</Text>
            </View>
            <Text style={styles.minutes}>0 min</Text>
          </View>
        </View>
      )}
      {items.map(item => {
        if (item.kind === 'place') {
          const place = places.find(candidate => candidate.id === item.placeId);
          return (
            <View
              key={`p${item.placeId}${item.start}`}
              style={styles.item}
            >
              <View style={[styles.dot, { backgroundColor: PLACE_COLOR }]} />
              <View style={styles.line}>
                <AppIcon
                  value={place?.emoji}
                  fallback={place?.isHome ? '🏠' : '📍'}
                  size={14}
                />
                <Text
                  style={styles.lineText}
                  numberOfLines={1}
                >
                  <Text style={styles.placeName}>{place?.name ?? 'A removed place'}</Text>
                  {` · ${formatTime(item.start)} – ${item.ongoing ? 'now' : formatTime(item.end)}`}
                </Text>
              </View>
            </View>
          );
        }
        if (item.kind === 'pause') {
          return (
            <View
              key={`z${item.start}`}
              style={styles.item}
            >
              <View style={[styles.dot, { backgroundColor: Colors.status.info }]} />
              <View style={styles.line}>
                <Text style={styles.lineText}>
                  <Text style={styles.placeName}>⏸ Paused</Text>
                  {` · ${formatTime(item.start)} – ${item.ongoing ? 'now' : formatTime(item.end)} · not counted`}
                </Text>
              </View>
            </View>
          );
        }
        const { stretch, luxMinutes } = item;
        return (
          <View
            key={`${stretch.manual || stretch.edited ? 'm' : 'a'}${stretch.start}`}
            style={styles.item}
          >
            <View style={[styles.dot, { backgroundColor: SUNLIGHT_COLOR }]} />
            <Pressable
              style={({ pressed }) => [styles.session, stretch.ongoing && styles.live, pressed && styles.pressed]}
              onPress={() => onEdit(stretch)}
              disabled={stretch.ongoing}
              accessibilityRole="button"
              accessibilityHint="Edit or delete this session"
            >
              <View style={styles.sessionText}>
                <Text style={styles.time}>
                  {`${formatTime(stretch.start)} – ${stretch.ongoing ? 'now' : formatTime(stretch.end)}`}
                  {stretch.manual ? ' ✋' : stretch.edited ? ' ✎' : ''}
                </Text>
                {stretch.eyeLux != null && (
                  <Text style={styles.detail}>
                    {`${formatLux(stretch.eyeLux)} at eyes · ${BRIGHTNESS_LABELS[getSunlightBrightness(stretch.eyeLux)]}`}
                  </Text>
                )}
              </View>
              <View style={styles.numbers}>
                <Text style={styles.minutes}>{minutesBetween(stretch.start, stretch.end)}</Text>
                {luxMinutes != null && <Text style={styles.dose}>{`${formatLuxMinutes(luxMinutes)} lux·min`}</Text>}
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 10;
const RAIL_PADDING = 14;

const styles = StyleSheet.create({
  rail: {
    gap: 6,
    marginLeft: 6,
    paddingLeft: RAIL_PADDING,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border.default,
  },
  item: {
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    left: -RAIL_PADDING - 1 - DOT / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  lineText: {
    flex: 1,
    color: Colors.text.faint,
    fontSize: 12,
  },
  placeName: {
    color: Colors.text.muted,
    fontWeight: '600',
  },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.bg.input,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  live: {
    borderColor: SUNLIGHT_COLOR,
  },
  sessionText: {
    flex: 1,
    gap: 2,
  },
  time: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  detail: {
    color: Colors.text.faint,
    fontSize: 11,
  },
  numbers: {
    alignItems: 'flex-end',
    gap: 2,
  },
  minutes: {
    color: SUNLIGHT_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },
  dose: {
    color: SUNLIGHT_COLOR,
    fontSize: 11,
    opacity: 0.8,
  },
  pressed: {
    opacity: 0.7,
  },
  empty: {
    color: Colors.text.faint,
    fontSize: 12,
    paddingHorizontal: 4,
  },
});
