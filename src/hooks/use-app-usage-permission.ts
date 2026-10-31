import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { hasAppUsagePermission, isSiteTrackingEnabled } from '../utils/app-usage-sync';

interface AppUsagePermissions {
  usageAccess: boolean;
  siteTracking: boolean;
}

function readPermissions(): AppUsagePermissions {
  return { usageAccess: hasAppUsagePermission(), siteTracking: isSiteTrackingEnabled() };
}

/** Usage access and website tracking (accessibility) state, re-checked when the user returns from settings. */
export function useAppUsagePermission(): AppUsagePermissions {
  const [permissions, setPermissions] = useState(readPermissions);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setPermissions(readPermissions());
    });
    return () => subscription.remove();
  }, []);
  return permissions;
}
