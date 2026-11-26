import React from 'react';
import { ExpandableMap } from '../../../components/expandable-map';
import type { GeoPoint } from '../../../utils/geofence-utils';
import { GeofenceMapView } from './geofence-map-view';

interface GeofenceMapProps {
  point: GeoPoint | null;
  radiusM: number;
  isLocating?: boolean;
  onChangePoint?: (point: GeoPoint) => void;
  onLocateMe?: () => void;
  label?: string;
  icon?: string;
  height?: number;
}

/** A place map with an Open in full screen button (the full-screen copy keeps the pin, radius and controls). */
export function GeofenceMap(props: GeofenceMapProps) {
  return (
    <ExpandableMap>
      {map => (
        <GeofenceMapView
          {...props}
          {...map}
        />
      )}
    </ExpandableMap>
  );
}
