import { Alert, StyleSheet, Switch, View } from 'react-native';
import { useSunlightStore } from '../../store/sunlight-store';
import { Colors } from '../../utils/colors';
import { hasBackgroundLocationPermission, requestBackgroundLocationPermission } from '../../utils/reminder-geofencing';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';

/** Toggle for following your position every second in the background (more accurate leave/arrive, more battery). */
export function SunlightPreciseRow() {
  const preciseTracking = useSunlightStore(state => state.preciseTracking);
  const setPreciseTracking = useSunlightStore(state => state.setPreciseTracking);

  const toggle = async (on: boolean) => {
    if (on && !(await hasBackgroundLocationPermission()) && !(await requestBackgroundLocationPermission())) {
      Alert.alert('Location needed', 'Allow location "all the time" in system settings to track in the background.');
      return;
    }
    setPreciseTracking(on);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Precise tracking</Text>
        <Switch
          value={preciseTracking}
          onValueChange={toggle}
          trackColor={{ true: SUNLIGHT_COLOR }}
          thumbColor={Colors.text.primary}
        />
      </View>
      <Text style={styles.hint}>
        Follows your location about every second, even in the background or with the screen off, so stepping out is
        caught right away. Uses a lot more battery, so leave it off unless you need it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 2, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: Colors.text.secondary, fontSize: 13 },
  hint: { color: Colors.text.faint, fontSize: 12, lineHeight: 17 },
});
