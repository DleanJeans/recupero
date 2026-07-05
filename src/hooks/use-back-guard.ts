import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, ToastAndroid } from 'react-native';

const HINT_MESSAGE = 'Press back again to exit';

/**
 * Intercepts the Android hardware back button with a double-press guard.
 *
 * Uses `navigation.canGoBack()` to decide whether to guard:
 * - **Root screen** (can't go back): first press shows a toast hint, second
 *   press within the timeout window exits the app.
 * - **Stacked screen** (can go back): passes through to the default
 *   behavior (navigates back in the stack).
 *
 * Call once on the root screen. No need to call it on stacked screens.
 *
 * iOS does not have a hardware back button, so this is a no-op on iOS.
 */
export function useBackGuard(): void {
  const navigation = useNavigation();

  const lastBackPress = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      // If there's a screen to go back to, let the stack handle it
      if (navigation.canGoBack()) {
        return false;
      }

      const now = Date.now();

      if (now - lastBackPress.current < 2000) {
        // Second press within the window — let the app exit
        clearTimeoutRef();
        return false;
      }

      // First press — show toast and prevent exit
      lastBackPress.current = now;
      ToastAndroid.show(HINT_MESSAGE, ToastAndroid.SHORT);

      clearTimeoutRef();
      timeoutRef.current = setTimeout(() => {
        lastBackPress.current = 0;
      }, 2000);

      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
      clearTimeoutRef();
    };
  }, [navigation, clearTimeoutRef]);
}
