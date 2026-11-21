import React from 'react';
import { StyleSheet, View } from 'react-native';
import { startTsFromSeconds } from '../../../utils/start-time-utils';
import { TimePicker } from '../../behavior-screen/components/time-picker';

interface BodyStartTimeProps {
  /** When the sensation started (ms). */
  ts: number;
  onChange: (ts: number) => void;
}

/** "Started" time of a body sensation: tap the time to pick when it began (today, not in the future). */
export function BodyStartTime({ ts, onChange }: BodyStartTimeProps) {
  const d = new Date(ts);
  const now = new Date();
  return (
    <View style={styles.box}>
      <TimePicker
        label="Started"
        hour={d.getHours()}
        minute={d.getMinutes()}
        second={0}
        maxHour={now.getHours()}
        maxMinute={now.getMinutes()}
        maxSecond={0}
        showSeconds={false}
        onTimeChange={seconds => onChange(startTsFromSeconds(seconds))}
      />
    </View>
  );
}

const styles = StyleSheet.create({ box: { alignItems: 'center', paddingTop: 4 } });
