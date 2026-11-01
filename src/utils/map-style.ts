import type { MapStyleElement } from 'react-native-maps';

/** Google Maps night style tuned to the app's dark palette (Android). */
export const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#17202a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a96a3' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#17202a' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2b3a49' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1c2833' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#18302a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#263442' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1c2833' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#33475b' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1f2b37' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1620' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e5d6c' }] },
];
