import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../utils/colors';
import { Button } from './button';
import { Text } from './text';

interface ScreenFrameProps {
  title?: string;
  /** Replaces `title` with custom content (e.g. an icon and a title) beside the back button. */
  headerContent?: React.ReactNode;
  /** Shown at the right end of the top bar, e.g. a settings cog. */
  rightContent?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Top bar (back button, title, optional right content) above full-screen content, for stack screens.
 * Content below it should pad its bottom by the safe-area inset (AGENTS.md rule 8).
 */
export function ScreenFrame({ title, headerContent, rightContent, onClose, children }: ScreenFrameProps) {
  const insets = useSafeAreaInsets();
  return (
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
        {headerContent ? (
          <View style={styles.headerContent}>{headerContent}</View>
        ) : title ? (
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : (
          <View style={styles.spacer} />
        )}
        {rightContent}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.card },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 48 },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  spacer: { flex: 1 },
  title: { flex: 1, color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
});
