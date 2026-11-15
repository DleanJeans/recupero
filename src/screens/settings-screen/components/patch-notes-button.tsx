import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';

export function PatchNotesButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.section}>
      <Button
        variant="ghost"
        onPress={() => navigation.navigate('PatchNotes')}
        style={styles.row}
      >
        <Ionicons
          name="newspaper-outline"
          size={20}
          color={Colors.text.white}
        />
        <Text style={styles.label}>Patch notes</Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.text.faint}
        />
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  label: { flex: 1, color: Colors.text.white, fontSize: 15, fontWeight: '600' },
});
