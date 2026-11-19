import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { SunlightSnapshot } from '../../hooks/use-sunlight';
import { useSunlightStore } from '../../store/sunlight-store';
import { Colors } from '../../utils/colors';
import { hasBackgroundLocationPermission, requestBackgroundLocationPermission } from '../../utils/reminder-geofencing';
import { formatLux, formatPauseUntil, formatSunlightMinutes } from '../../utils/sunlight-utils';
import { formatTime } from '../../utils/time-utils';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';
import { SunlightManualSession } from './sunlight-manual-session';
import { SunlightPauseCard } from './sunlight-pause';

type Panel = 'pause' | 'manual' | null;

interface ActionButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  detail: string;
  on: boolean;
  open?: boolean;
  onPress: () => void;
}

function ActionButton({ icon, label, detail, on, open, onPress }: ActionButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        on && styles.buttonOn,
        open && styles.buttonOpen,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on, expanded: open }}
    >
      <Ionicons
        name={icon}
        size={18}
        color={on ? ON_TEXT : Colors.text.secondary}
      />
      <Text
        style={[styles.label, on && styles.textOn]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[styles.detail, on && styles.textOn]}
        numberOfLines={1}
      >
        {detail}
      </Text>
    </Pressable>
  );
}

interface SunlightActionsProps {
  sunlight: SunlightSnapshot;
}

/**
 * The three things you do on the Sunlight sheet: Outside Mode (follow you closely while you move between places),
 * Pause (somewhere that isn't a saved place) and a manual session (a balcony). A running one stops with one tap;
 * Pause and manual open their choices under the row.
 */
export function SunlightActions({ sunlight }: SunlightActionsProps) {
  const outsideMode = useSunlightStore(state => state.preciseTracking);
  const outsideSince = useSunlightStore(state => state.preciseSince);
  const setOutsideMode = useSunlightStore(state => state.setPreciseTracking);
  const resume = useSunlightStore(state => state.resumeSunlight);
  const stopManual = useSunlightStore(state => state.stopManualSession);
  const [panel, setPanel] = useState<Panel>(null);
  const { pause, manualSession, now } = sunlight;

  const toggleOutsideMode = async () => {
    if (outsideMode) {
      setOutsideMode(false);
      return;
    }
    if (!(await hasBackgroundLocationPermission()) && !(await requestBackgroundLocationPermission())) {
      Alert.alert('Location needed', 'Allow location "all the time" in system settings to follow you while you move.');
      return;
    }
    setOutsideMode(true);
  };
  const pressPause = () => {
    if (pause) {
      resume();
      setPanel(null);
    } else setPanel(value => (value === 'pause' ? null : 'pause'));
  };
  const pressManual = () => {
    if (manualSession) {
      stopManual();
      setPanel(null);
    } else setPanel(value => (value === 'manual' ? null : 'manual'));
  };

  const outsideMinutes = outsideSince != null ? Math.max(0, Math.floor((now - outsideSince) / 60_000)) : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ActionButton
          icon="walk"
          label="Outside Mode"
          detail={
            outsideMode ? `On${outsideMinutes != null ? ` · ${formatSunlightMinutes(outsideMinutes)}` : ''}` : 'Off'
          }
          on={outsideMode}
          onPress={toggleOutsideMode}
        />
        <ActionButton
          icon={pause ? 'play' : 'pause'}
          label={pause ? 'Paused' : 'Pause'}
          detail={pause ? formatPauseUntil(pause.until, now, formatTime, pause.pin != null) : 'Not a saved place'}
          on={pause != null}
          open={panel === 'pause' && !pause}
          onPress={pressPause}
        />
        <ActionButton
          icon={manualSession ? 'stop' : 'hand-right'}
          label={manualSession ? 'Stop' : "I'm outside"}
          detail={manualSession ? `Manual · ${formatLux(manualSession.lux ?? 0)}` : 'Balcony, etc.'}
          on={manualSession != null}
          open={panel === 'manual' && !manualSession}
          onPress={pressManual}
        />
      </View>
      {outsideMode && (
        <Text style={styles.hint}>
          Following you about every second, even with the screen off. Uses more battery, so stop it once you're back.
        </Text>
      )}
      {panel === 'pause' && !pause && <SunlightPauseCard />}
      {panel === 'manual' && !manualSession && <SunlightManualSession />}
    </View>
  );
}

const ON_TEXT = '#1a1300';

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.bg.input,
    paddingHorizontal: 4,
    paddingVertical: 9,
  },
  buttonOn: {
    backgroundColor: SUNLIGHT_COLOR,
    borderColor: SUNLIGHT_COLOR,
  },
  buttonOpen: {
    borderColor: SUNLIGHT_COLOR,
  },
  label: {
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  detail: {
    color: Colors.text.muted,
    fontSize: 11,
  },
  textOn: {
    color: ON_TEXT,
  },
  hint: {
    color: Colors.text.faint,
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
