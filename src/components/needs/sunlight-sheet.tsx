import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SunlightNotification } from '../../../modules/sunlight-notification';
import { resyncReminders } from '../../hooks/use-reminder-engine';
import { useSunlight } from '../../hooks/use-sunlight';
import { useCuesStore } from '../../store/cues-store';
import { useSunlightStore } from '../../store/sunlight-store';
import type { SunlightStretch } from '../../types/sunlight';
import { Colors } from '../../utils/colors';
import { requestBackgroundLocationPermission } from '../../utils/reminder-geofencing';
import { syncSunlight } from '../../utils/sunlight-sync';
import {
  formatLux,
  formatSunlightMinutes,
  getLightDoseRate,
  getSunlightBrightness,
  SUNLIGHT_GOAL_STEP_MINUTES,
  type SunlightBrightness,
} from '../../utils/sunlight-utils';
import { formatTime } from '../../utils/time-utils';
import { AppIcon } from '../app-icon';
import { CueSectionLabel } from '../cues/cue-section-label';
import { RadiusSlider } from '../radius-slider';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';
import { SunlightCalibration } from './sunlight-calibration';
import { SunlightLightDose } from './sunlight-light-dose';
import { SunlightPlacesMap } from './sunlight-places-map';
import { SUNLIGHT_STATUS_COLORS, SunlightStatusDot } from './sunlight-status-dot';
import { SunlightWeekChart } from './sunlight-week-chart';

const BRIGHTNESS_LABELS: Record<SunlightBrightness, string> = {
  bright: 'bright',
  overcast: 'overcast',
  dim: 'dim',
};

interface SunlightSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** Today's stretches outside while the sun was up, the past week, the daily goal and which places count as outdoors. */
export function SunlightSheet({ visible, onClose }: SunlightSheetProps) {
  const sunlight = useSunlight();
  const places = useCuesStore(state => state.places);
  const outdoorPlaceIds = useSunlightStore(state => state.outdoorPlaceIds);
  const toggleOutdoorPlace = useSunlightStore(state => state.toggleOutdoorPlace);
  const setGoalMinutes = useSunlightStore(state => state.setGoalMinutes);
  const insets = useSafeAreaInsets();
  const radiusM = useSunlightStore(state => state.radiusM);
  const weather = useSunlightStore(state => state.weather);
  const liveNotification = useSunlightStore(state => state.liveNotification);
  const setLiveNotification = useSunlightStore(state => state.setLiveNotification);
  const deleteRange = useSunlightStore(state => state.deleteRange);
  const setRadiusM = useSunlightStore(state => state.setRadiusM);
  const [justAllowed, setJustAllowed] = useState(false);
  const locationAllowed = sunlight.locationAllowed || justAllowed;

  useEffect(() => {
    if (visible) void syncSunlight(true);
  }, [visible]);

  if (!visible) return null;

  const { today, goalMinutes, days } = sunlight;
  const hasWeather = weather != null;
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
          onPress: () => deleteRange({ start: stretch.start, end: stretch.end }),
        },
      ],
    );
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}>
            <View style={styles.header}>
              <Text style={styles.headerEmoji}>☀️</Text>
              <View style={styles.headerText}>
                <Text style={styles.title}>
                  Sunlight
                  <Text style={{ color: done ? Colors.type.desirable : SUNLIGHT_COLOR }}>
                    {` · ${formatSunlightMinutes(today.minutes)}`}
                  </Text>
                </Text>
                <Text style={styles.subtitle}>
                  {`Goal ${goalMinutes} min · ${sunWindow}`}
                  {sunlight.luxNow != null ? ` · ${formatLux(sunlight.luxNow)} now` : ''}
                  {today.lux != null ? ` · ${formatLux(today.lux)} avg while out` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.status}>
              <SunlightStatusDot
                kind={sunlight.status.kind}
                size={10}
              />
              <Text style={[styles.statusText, { color: SUNLIGHT_STATUS_COLORS[sunlight.status.kind] }]}>
                {sunlight.status.label}
              </Text>
            </View>
            {SunlightNotification && (
              <View style={styles.liveRow}>
                <Text style={styles.liveLabel}>Live notification while outside</Text>
                <Switch
                  value={liveNotification}
                  onValueChange={setLiveNotification}
                  trackColor={{ true: SUNLIGHT_COLOR }}
                />
              </View>
            )}

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

            <SunlightLightDose
              luxMinutes={today.luxMinutes}
              ratePerMinute={getLightDoseRate(sunlight.status.kind === 'counting', sunlight.luxNow)}
              snapshotAt={sunlight.now}
              goalMinutes={goalMinutes}
              hasWeather={hasWeather}
            />
            <SunlightCalibration
              factor={sunlight.luxCalibration}
              luxNow={sunlight.luxNow}
              rawLuxNow={sunlight.rawLuxNow}
            />

            <CueSectionLabel>Today</CueSectionLabel>
            {today.stretches.length === 0 ? (
              <Text style={styles.hint}>No time outside in daylight yet.</Text>
            ) : (
              today.stretches.map(stretch => (
                <View
                  key={stretch.start}
                  style={styles.stretch}
                >
                  <Text style={styles.stretchTime}>
                    {formatTime(stretch.start)} – {stretch.ongoing ? 'now' : formatTime(stretch.end)}
                  </Text>
                  <Text style={styles.stretchLux}>
                    {stretch.lux != null
                      ? `${formatLux(stretch.lux)} · ${BRIGHTNESS_LABELS[getSunlightBrightness(stretch.lux)]}`
                      : ''}
                  </Text>
                  <Text style={styles.stretchMinutes}>
                    {formatSunlightMinutes(Math.floor((stretch.end - stretch.start) / 60_000))}
                  </Text>
                  {!stretch.ongoing && (
                    <Pressable
                      onPress={() => confirmDelete(stretch)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Delete session"
                    >
                      <Text style={styles.stretchDelete}>✕</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}

            <CueSectionLabel>Past week</CueSectionLabel>
            <SunlightWeekChart
              days={days}
              goalMinutes={goalMinutes}
            />

            <CueSectionLabel>Daily goal</CueSectionLabel>
            <View style={styles.stepper}>
              <Pressable
                style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
                onPress={() => setGoalMinutes(goalMinutes - SUNLIGHT_GOAL_STEP_MINUTES)}
                accessibilityRole="button"
                accessibilityLabel="Lower goal"
              >
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.goal}>{formatSunlightMinutes(goalMinutes)}</Text>
              <Pressable
                style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
                onPress={() => setGoalMinutes(goalMinutes + SUNLIGHT_GOAL_STEP_MINUTES)}
                accessibilityRole="button"
                accessibilityLabel="Raise goal"
              >
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>

            <CueSectionLabel>Where it pauses</CueSectionLabel>
            <RadiusSlider
              label="Pause within"
              value={radiusM}
              onChange={setRadiusM}
              color={SUNLIGHT_COLOR}
              revealOnTap
            />
            <SunlightPlacesMap />

            {places.length > 0 && (
              <>
                <CueSectionLabel>Places that count as outside</CueSectionLabel>
                <View style={styles.chips}>
                  {places.map(place => {
                    const outdoor = outdoorPlaceIds.includes(place.id);
                    return (
                      <Pressable
                        key={place.id}
                        style={({ pressed }) => [styles.chip, outdoor && styles.chipOn, pressed && styles.pressed]}
                        onPress={() => toggleOutdoorPlace(place.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: outdoor }}
                      >
                        <AppIcon
                          value={place.emoji}
                          fallback={place.isHome ? '🏠' : '📍'}
                          size={15}
                        />
                        <Text style={[styles.chipText, outdoor && styles.chipTextOn]}>{place.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={styles.hint}>
              Counts time more than {radiusM} m from your saved places, only between sunrise and sunset where you are.
              Below about 50 m, phone GPS can wobble across the line, so very short trips (under 2 min) are ignored.
              Light levels are estimated from hourly weather (Open-Meteo).
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
  },
  grab: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border.light,
    marginBottom: 8,
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
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  liveLabel: {
    color: Colors.text.secondary,
    fontSize: 13,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  hint: {
    color: Colors.text.faint,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 4,
  },
  stretch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stretchTime: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  stretchLux: {
    flex: 1,
    color: Colors.text.faint,
    fontSize: 12,
  },
  stretchMinutes: {
    color: SUNLIGHT_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },
  stretchDelete: {
    color: Colors.text.faint,
    fontSize: 15,
    paddingLeft: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepButton: {
    width: 40,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.bg.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  goal: {
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg.input,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.bg.input,
  },
  chipOn: {
    borderColor: SUNLIGHT_COLOR,
  },
  chipText: {
    color: Colors.text.muted,
    fontSize: 13,
  },
  chipTextOn: {
    color: Colors.text.primary,
  },
});
