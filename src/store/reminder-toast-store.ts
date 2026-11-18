import { create } from 'zustand';
import { enqueueToast, type ReminderToast, removeToast } from '../utils/reminder-toast-utils';

interface ReminderToastStore {
  toasts: ReminderToast[];
  push: (toast: ReminderToast) => void;
  dismiss: (id: string) => void;
}

/** In-app reminder toasts waiting to be shown; the first one is on screen. Not persisted. */
export const useReminderToastStore = create<ReminderToastStore>(set => ({
  toasts: [],
  push: toast => set(state => ({ toasts: enqueueToast(state.toasts, toast) })),
  dismiss: id => set(state => ({ toasts: removeToast(state.toasts, id) })),
}));
