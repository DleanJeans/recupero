import { Alert, Linking } from 'react-native';

/** Opens a spot in the Google Maps app (or the browser when it is not installed) with a pin and label. */
export function openInMaps(lat: number, lng: number, label?: string) {
  const query = `${lat},${lng}`;
  // The https link opens the Maps app when present and the web map otherwise; the label shows as the pin name via geo:.
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const geo = `geo:${query}?q=${encodeURIComponent(`${query}${label ? `(${label})` : ''}`)}`;
  Linking.openURL(geo).catch(() =>
    Linking.openURL(url).catch(() =>
      Alert.alert('Could not open Maps', 'No maps app or browser could open this place.'),
    ),
  );
}
