import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { AppUsage, type ChatPic } from '../../modules/app-usage';

/** Profile pics saved from chat notifications, refreshed whenever the app comes back to the front. */
export function useChatPics() {
  const [pics, setPics] = useState<ChatPic[]>([]);
  const reload = useCallback(() => {
    AppUsage?.getChatPics?.()
      .then(setPics)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    reload();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') reload();
    });
    return () => subscription.remove();
  }, [reload]);
  const remove = useCallback(
    (id: string | null) => {
      AppUsage?.deleteChatPic?.(id);
      reload();
    },
    [reload],
  );
  return { pics, remove };
}
