import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetOption } from '../../../components/behavior-action-sheet';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

interface TaskDriveMenuProps {
  placeName: string;
  onClose: () => void;
  onEditEstimate: () => void;
  onOpenMaps: () => void;
}

/** Menu of a planned drive card: edit the estimate, or open Google Maps for the route. */
export function TaskDriveMenu({ placeName, onClose, onEditEstimate, onOpenMaps }: TaskDriveMenuProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close menu"
        />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grabber} />
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {`Drive to ${placeName}`}
          </Text>
          <SheetOption
            icon="hourglass-outline"
            label="Edit estimate"
            hint="How long the drive takes."
            onPress={onEditEstimate}
          />
          <SheetOption
            icon="map-outline"
            label="Open in Google Maps"
            hint="Route from the previous place, or from where you are."
            onPress={onOpenMaps}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.bg.input },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700', marginBottom: 6 },
});
