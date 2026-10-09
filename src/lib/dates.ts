import dayjs from 'dayjs';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

export const DATE_FORMAT = 'YYYY-MM-DD';

export function today() {
  return dayjs().format(DATE_FORMAT);
}

export function shiftDate(date: string, days: number) {
  return dayjs(date).add(days, 'day').format(DATE_FORMAT);
}

/** Opens the native Android date dialog; calls onPick with 'YYYY-MM-DD' if the user confirms. */
export function pickDate(current: string, onPick: (date: string) => void) {
  DateTimePickerAndroid.open({
    value: dayjs(current).toDate(),
    mode: 'date',
    onValueChange: (_event, date) => {
      if (date) {
        onPick(dayjs(date).format(DATE_FORMAT));
      }
    },
  });
}
