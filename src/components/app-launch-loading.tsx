import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../utils/colors';

export function AppLaunchLoading() {
  return (
    <View style={styles.container}>
      <ActivityIndicator
        color={Colors.text.faint}
        size="small"
      />
      <Text style={styles.label}>Loading</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.bg.primary,
  },
  label: {
    color: Colors.text.faint,
    fontSize: 13,
    fontWeight: '600',
  },
});
