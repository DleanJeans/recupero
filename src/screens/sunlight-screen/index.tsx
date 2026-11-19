import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CueSectionLabel } from '../../components/cues/cue-section-label';
import { ExpandableMap } from '../../components/expandable-map';
import { SunlightActions } from '../../components/needs/sunlight-actions';
import { SUNLIGHT_COLOR } from '../../components/needs/sunlight-bar-row';
import { SunlightLuxChart } from '../../components/needs/sunlight-lux-chart';
import { SunlightNowCard } from '../../components/needs/sunlight-now-card';
import { SunlightPlacesMapView } from '../../components/needs/sunlight-places-map-view';
import { SunlightSessionEditor } from '../../components/needs/sunlight-session-editor';
import { SunlightSettings } from '../../components/needs/sunlight-settings';
import { SunlightTimeline } from '../../components/needs/sunlight-timeline';
import { SunlightWeekChart } from '../../components/needs/sunlight-week-chart';
import { ScreenFrame } from '../../components/screen-frame';
import { Text } from '../../components/text';
import { resyncReminders } from '../../hooks/use-reminder-engine';
import { useSunlight } from '../../hooks/use-sunlight';
import { useSunlightTimeline } from '../../hooks/use-sunlight-timeline';
import { useSunlightStore } from '../../store/sunlight-store';
import type { SunlightStretch } from '../../types/sunlight';
import { Colors } from '../../utils/colors';
import { requestBackgroundLocationPermission } from '../../utils/reminder-geofencing';
import { syncSunlight } from '../../utils/sunlight-sync';
import { formatLux, formatSunlightMinutes } from '../../utils/sunlight-utils';
import { formatTime } from '../../utils/time-utils';

/** Sunlight in four sections: Now (status, minutes, light dose, actions), Today (route + timeline), week, Settings. */
export function SunlightScreen() {
  const navigation = useNavigation();
  const sunlight = useSunlight();
  const [pickedDay, setPickedDay] = useState<number | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);
  const todaySectionY = useRef(0);
  const shownDay = sunlight.days.find(day => day.dayStart === pickedDay) ?? sunlight.today;
  const isToday = shownDay.dayStart === sunlight.today.dayStart;
  const timeline = useSunlightTimeline(sunlight, shownDay.dayStart);
  const insets = useSafeAreaInsets();
  const deleteRange = useSunlightStore(state => state.deleteRange);
  const deleteManualSession = useSunlightStore(state => state.deleteManualSession);
  const [justAllowed, setJustAllowed] = useState(false);
  const [editing, setEditing] = useState<SunlightStretch | null>(null);
  const locationAllowed = sunlight.locationAllowed || justAllowed;

  useEffect(() => {
    void syncSunlight(true);
  }, []);

  const pickDay = (dayStart: number) => {
    setPickedDay(dayStart === sunlight.today.dayStart ? undefined : dayStart);
    scrollRef.current?.scrollTo({ y: Math.max(0, todaySectionY.current - 8), animated: true });
  };

  const { today, goalMinutes, days } = sunlight;
  // A stretch out that's too short to count yet still shows, so it never looks like nothing is running.
  const pendingSince =
    isToday &&
    sunlight.status.kind === 'counting' &&
    !sunlight.manualSession &&
    sunlight.outSince != null &&
    !today.stretches.some(stretch => stretch.ongoing)
      ? sunlight.outSince
      : undefined;
  const done = today.minutes >= goalMinutes;
  const sunWindow =
    today.sunrise != null && today.sunset != null
      ? `Sun up ${formatTime(today.sunrise)} – ${formatTime(today.sunset)}`
      : 'Sunrise and sunset need a saved place or a location check';

  const allowLocation = async () => {
    const granted = await requestBackgroundLocationPermission();
    setJustAllowed(granted);
    if (granted) await resyncReminders();
    else await Linking.openSettings();
  };

  const confirmDelete = (stretch: SunlightStretch) => {
    const minutes = formatSunlightMinutes(Math.floor((stretch.end - stretch.start) / 60_000));
    Alert.alert(
      'Delete session',
      `Remove ${formatTime(stretch.start)} – ${formatTime(stretch.end)} (${minutes}) from your sunlight time?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            stretch.manual || stretch.edited
              ? deleteManualSession(stretch.start)
              : deleteRange({ start: stretch.start, end: stretch.end }),
        },
      ],
    );
  };

  return (
    <ScreenFrame onClose={() => navigation.goBack()}>
      <View style={styles.sheet}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        >
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>☀️</Text>
            <View style={styles.headerText}>
              <Text style={styles.title}>
                Sunlight
                <Text style={{ color: done ? Colors.type.desirable : SUNLIGHT_COLOR }}>
                  {` · ${formatSunlightMinutes(today.minutes)} / ${formatSunlightMinutes(goalMinutes)}`}
                </Text>
              </Text>
              <Text style={styles.subtitle}>
                {sunWindow}
                {sunlight.luxNow != null ? ` · ${formatLux(sunlight.luxNow)} now` : ''}
                {today.lux != null ? ` · ${formatLux(today.lux)} avg while out` : ''}
              </Text>
            </View>
          </View>

          <CueSectionLabel>Now</CueSectionLabel>
          <SunlightNowCard sunlight={sunlight} />
          {!locationAllowed && (
            <View style={styles.warning}>
              <Text style={styles.warningText}>
                Location isn't set to "Allow all the time", so leaving and arriving at places isn't tracked.
              </Text>
              <Pressable
                onPress={allowLocation}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.warningAction}>Allow</Text>
              </Pressable>
            </View>
          )}
          {!sunlight.hasPlaces && (
            <Text style={styles.hint}>
              Save the places where you spend time indoors (Home, work) under Places, so time away from them counts.
            </Text>
          )}
          <SunlightActions sunlight={sunlight} />

          <View
            style={styles.dayHeader}
            onLayout={event => {
              todaySectionY.current = event.nativeEvent.layout.y;
            }}
          >
            <CueSectionLabel>
              {isToday
                ? 'Today'
                : `${new Date(shownDay.dayStart).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${formatSunlightMinutes(shownDay.minutes)}`}
            </CueSectionLabel>
            {!isToday && (
              <Pressable
                onPress={() => setPickedDay(undefined)}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.backToToday}>Back to today</Text>
              </Pressable>
            )}
          </View>
          <SunlightLuxChart
            day={shownDay}
            weather={sunlight.weather}
            now={sunlight.now}
            isToday={isToday}
          />
          <ExpandableMap>
            {map => (
              <SunlightPlacesMapView
                path={timeline.path}
                dayStart={shownDay.dayStart}
                isToday={isToday}
                {...map}
              />
            )}
          </ExpandableMap>
          <SunlightTimeline
            items={timeline.items}
            pendingSince={pendingSince}
            onEdit={setEditing}
          />

          <CueSectionLabel>Past week</CueSectionLabel>
          <SunlightWeekChart
            days={days}
            goalMinutes={goalMinutes}
            selectedDayStart={shownDay.dayStart}
            onSelect={pickDay}
          />

          <CueSectionLabel>Settings</CueSectionLabel>
          <SunlightSettings sunlight={sunlight} />
        </ScrollView>
      </View>
      {editing && (
        <SunlightSessionEditor
          stretch={editing}
          onClose={() => setEditing(null)}
          onDelete={() => {
            const stretch = editing;
            setEditing(null);
            confirmDelete(stretch);
          }}
        />
      )}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  content: {
    gap: 8,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerEmoji: {
    fontSize: 26,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.status.error,
    borderRadius: 10,
    padding: 10,
  },
  warningText: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  warningAction: {
    color: Colors.status.dangerLight,
    fontSize: 13,
    fontWeight: '700',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  backToToday: {
    color: SUNLIGHT_COLOR,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  hint: {
    color: Colors.text.faint,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 4,
  },
});
