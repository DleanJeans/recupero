import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const TEST_NOTIFICATION_CHANNEL_ID = 'recupero-test';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function sendTestNotification() {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Notification permission denied.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(TEST_NOTIFICATION_CHANNEL_ID, {
      name: 'Test notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Recupero test',
      body: 'Notifications are working.',
      sound: 'default',
    },
    trigger: Platform.OS === 'android' ? { channelId: TEST_NOTIFICATION_CHANNEL_ID } : null,
  });
}
