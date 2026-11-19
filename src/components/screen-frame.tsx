import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
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
  const navigation = useNavigation();
  const slide = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const leaving = useRef(false);

  // The route uses animation 'none': the native slide is fixed at ~400 ms on Android, so slide here instead.
  useEffect(() => {
    Animated.timing(slide, {
      toValue: 0,
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', event => {
        if (leaving.current) return;
        event.preventDefault();
        leaving.current = true;
        Animated.timing(slide, {
          toValue: Dimensions.get('window').height,
          duration: SLIDE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(() => navigation.dispatch(event.data.action));
      }),
    [navigation, slide],
  );

  return (
    <Animated.View style={[styles.screen, { paddingTop: insets.top, transform: [{ translateY: slide }] }]}>
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
    </Animated.View>
  );
}

/** Half of the old ~400 ms native slide. */
const SLIDE_MS = 200;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.card },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 48 },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  spacer: { flex: 1 },
  title: { flex: 1, color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
});
