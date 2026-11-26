import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { toDateString } from './date-utils';
import { startTimeToDate, toStartTime } from './task-schedule-utils';

/** Opens the Android date picker on a yyyy-MM-dd value and returns the picked yyyy-MM-dd through onPick. */
export function pickTaskDate(current: string | undefined, onPick: (date: string) => void) {
  DateTimePickerAndroid.open({
    value: current ? new Date(`${current}T12:00:00`) : new Date(),
    mode: 'date',
    onChange: (event, date) => {
      if (event.type === 'set' && date) onPick(toDateString(date));
    },
  });
}

/** Opens the Android time picker on an "HH:mm" value and returns the picked "HH:mm" through onPick. */
export function pickTaskTime(current: string | undefined, onPick: (time: string) => void) {
  DateTimePickerAndroid.open({
    value: startTimeToDate(current),
    mode: 'time',
    is24Hour: false,
    onChange: (event, date) => {
      if (event.type === 'set' && date) onPick(toStartTime(date));
    },
  });
}
