import React from 'react';
import { useSettingsStore } from '../../../store/settings-store';
import type { SavedPlace } from '../../../types/cue';
import { getPlaceEmoji } from '../../../utils/cue-utils';
import { GeofenceMap } from '../../location-edit-screen/components/geofence-map';

const PREVIEW_HEIGHT = 200;

/** Read-only map of a place, with the area place reminders watch (the global reminder radius). */
export function PlaceMapPreview({ place }: { place: SavedPlace }) {
  const minRadiusM = useSettingsStore(state => state.reminderRadiusM);
  return (
    <GeofenceMap
      key={place.id}
      point={{ lat: place.lat, lng: place.lng }}
      radiusM={minRadiusM}
      label={`📍 ${place.name}`}
      icon={getPlaceEmoji(place)}
      height={PREVIEW_HEIGHT}
    />
  );
}
