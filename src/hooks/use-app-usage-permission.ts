import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { hasAppUsagePermission } from '../utils/app-usage-sync';

/** Whether usage access is granted, re-checked when the user returns from system settings. */
export function useAppUsagePermission(): boolean {
  const [granted, setGranted] = useState(hasAppUsagePermission);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setGranted(hasAppUsagePermission());
    });
    return () => subscription.remove();
  }, []);
  return granted;
}
