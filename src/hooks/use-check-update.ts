import * as Updates from 'expo-updates';
import { useState } from 'react';
import { reloadIntoUpdate } from '../utils/update-utils';

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'restarting' | 'upToDate' | 'error';

const BUSY: UpdateStatus[] = ['checking', 'downloading', 'restarting'];

/**
 * Checks the update server, downloads a new OTA update if there is one, then restarts straight into it.
 * Shared by the Settings button and the header "..." menu.
 */
export function useCheckUpdate() {
  const { isUpdatePending } = Updates.useUpdates();
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dev-client sessions served by Metro have nothing to fetch.
  const unavailable = !Updates.isEnabled || __DEV__;
  const busy = BUSY.includes(status);

  const run = async () => {
    setErrorMessage(null);
    try {
      if (!isUpdatePending) {
        setStatus('checking');
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) {
          setStatus('upToDate');
          return;
        }
        setStatus('downloading');
        const fetched = await Updates.fetchUpdateAsync();
        // The server can roll back or the update can be identical to what's running.
        if (!fetched.isNew && !fetched.isRollBackToEmbedded) {
          setStatus('upToDate');
          return;
        }
      }
      setStatus('restarting');
      await reloadIntoUpdate();
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return { status, errorMessage, isUpdatePending, unavailable, busy, run };
}
