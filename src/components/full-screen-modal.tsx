import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../utils/colors';
import { Button } from './button';
import { Text } from './text';

interface FullScreenModalProps {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Full-screen dialog with a back button at the top. The top bar stays above the keyboard, and content
 * below it should pad its bottom by the safe-area inset (AGENTS.md rule 8).
 */
export function FullScreenModal({ title, onClose, children }: FullScreenModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <Button
            variant="icon"
            onPress={onClose}
            accessibilityLabel="Close"
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={Colors.text.primary}
            />
          </Button>
          {title ? (
            <Text
              style={styles.title}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
        </View>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.card },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 48 },
  title: { flex: 1, color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
});
