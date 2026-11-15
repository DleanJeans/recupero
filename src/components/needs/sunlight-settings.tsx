import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { SunlightNotification } from '../../../modules/sunlight-notification';
import type { SunlightSnapshot } from '../../hooks/use-sunlight';
import { useCuesStore } from '../../store/cues-store';
import { useSunlightStore } from '../../store/sunlight-store';
import { Colors } from '../../utils/colors';
import { formatSunlightMinutes, SUNLIGHT_GOAL_STEP_MINUTES } from '../../utils/sunlight-utils';
import { AppIcon } from '../app-icon';
import { RadiusSlider } from '../radius-slider';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';
import { SunlightCalibration } from './sunlight-calibration';
import { SunlightEyeLevel } from './sunlight-eye-level';
import { SunlightSettingRow } from './sunlight-setting-row';
import { SunlightTrackingLog } from './sunlight-tracking-log';

interface SunlightSettingsProps {
  sunlight: SunlightSnapshot;
}

/** The Sunlight sheet's Settings card: one line per setting, each opening in place. */
export function SunlightSettings({ sunlight }: SunlightSettingsProps) {
  const places = useCuesStore(state => state.places);
  const outdoorPlaceIds = useSunlightStore(state => state.outdoorPlaceIds);
  const toggleOutdoorPlace = useSunlightStore(state => state.toggleOutdoorPlace);
  const setGoalMinutes = useSunlightStore(state => state.setGoalMinutes);
  const radiusM = useSunlightStore(state => state.radiusM);
  const setRadiusM = useSunlightStore(state => state.setRadiusM);
  const liveNotification = useSunlightStore(state => state.liveNotification);
  const setLiveNotification = useSunlightStore(state => state.setLiveNotification);
  const { goalMinutes, luxCalibration, eyeLevelFactor } = sunlight;
  const outdoorNames = places.filter(place => outdoorPlaceIds.includes(place.id)).map(place => place.name);

  return (
    <View style={styles.card}>
      <SunlightSettingRow
        label="Daily goal"
        control={
          <View style={styles.stepper}>
            <Pressable
              style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
              onPress={() => setGoalMinutes(goalMinutes - SUNLIGHT_GOAL_STEP_MINUTES)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Lower goal"
            >
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.goal}>{formatSunlightMinutes(goalMinutes)}</Text>
            <Pressable
              style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
              onPress={() => setGoalMinutes(goalMinutes + SUNLIGHT_GOAL_STEP_MINUTES)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Raise goal"
            >
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
        }
      />
      {SunlightNotification && (
        <SunlightSettingRow
          label="Live notification while outside"
          control={
            <Switch
              value={liveNotification}
              onValueChange={setLiveNotification}
              trackColor={{ true: SUNLIGHT_COLOR }}
              thumbColor={Colors.text.primary}
            />
          }
        />
      )}
      <SunlightSettingRow
        label="Light reaching your eyes"
        value={`${Math.round(eyeLevelFactor * 100)}%`}
      >
        <SunlightEyeLevel factor={eyeLevelFactor} />
      </SunlightSettingRow>
      <SunlightSettingRow
        label="Lux estimate"
        value={luxCalibration !== 1 ? `×${luxCalibration.toFixed(2)}` : 'Not calibrated'}
      >
        <SunlightCalibration
          factor={luxCalibration}
          luxNow={sunlight.luxNow}
          rawLuxNow={sunlight.rawLuxNow}
        />
        <Text style={styles.hint}>Light levels are estimated from hourly weather (Open-Meteo).</Text>
      </SunlightSettingRow>
      <SunlightSettingRow
        label="Pause within"
        value={`${radiusM} m of a place's centre`}
      >
        <RadiusSlider
          label="From each place's centre"
          value={radiusM}
          onChange={setRadiusM}
          color={SUNLIGHT_COLOR}
          revealOnTap
        />
        <Text style={styles.hint}>
          {`Counts time more than ${radiusM} m from the centre of every saved place (the place's own radius is only for reminders), only between sunrise and sunset. Below about 50 m, phone GPS can wobble across the line, so very short trips (under 2 min) are ignored.`}
        </Text>
      </SunlightSettingRow>
      {places.length > 0 && (
        <SunlightSettingRow
          label="Places that count as outside"
          value={outdoorNames.length > 0 ? outdoorNames.join(', ') : 'None'}
        >
          <Text style={styles.hint}>Time at these (a park, a running track) counts as outside.</Text>
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
        </SunlightSettingRow>
      )}
      <SunlightSettingRow
        label="Tracking log"
        last
      >
        <SunlightTrackingLog />
      </SunlightSettingRow>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepButton: {
    width: 32,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  goal: {
    color: SUNLIGHT_COLOR,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 52,
    textAlign: 'center',
  },
  hint: {
    color: Colors.text.faint,
    fontSize: 11,
    lineHeight: 15,
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
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.bg.card,
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
  pressed: {
    opacity: 0.7,
  },
});
