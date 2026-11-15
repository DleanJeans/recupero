import React from 'react';
import { useSettingsStore } from '../../../store/settings-store';
import type { SavedPlace } from '../../../types/cue';
import { geofenceRadius } from '../../../utils/reminder-utils';
import { GeofenceMap } from '../../location-edit-screen/components/geofence-map';

const PREVIEW_HEIGHT = 200;

/** Read-only map of a place, with the area a reminder actually watches (the place radius, or the Settings minimum). */
export function PlaceMapPreview({ place }: { place: SavedPlace }) {
  const minRadiusM = useSettingsStore(state => state.reminderRadiusM);
  return (
    <GeofenceMap
      key={place.id}
      point={{ lat: place.lat, lng: place.lng }}
      radiusM={geofenceRadius(place.radiusM, minRadiusM)}
      label={`📍 ${place.name}`}
      height={PREVIEW_HEIGHT}
    />
  );
}
