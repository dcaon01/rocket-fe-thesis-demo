import { BrnCalendarI18n } from '@spartan-ng/brain/calendar';

/** Indici assoluti 0=domenica .. 6=sabato (come li passa il calendario brain). */
const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const WEEKDAYS_LONG = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

/** Configurazione del calendario spartan in italiano (settimana da lunedì). */
export const IT_CALENDAR_I18N: BrnCalendarI18n = {
  formatWeekdayName: (index) => WEEKDAYS_SHORT[index],
  labelWeekday: (index) => WEEKDAYS_LONG[index],
  months: () => ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
  years: (startYear = 1925, endYear = new Date().getFullYear() + 1) =>
    Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i),
  formatHeader: (month, year) => new Date(year, month).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
  formatMonth: (month) => new Date(2000, month).toLocaleDateString('it-IT', { month: 'short' }),
  formatYear: (year) => `${year}`,
  labelPrevious: () => 'Vai al mese precedente',
  labelNext: () => 'Vai al mese successivo',
  firstDayOfWeek: () => 1,
};

/** Formatta un intervallo di date in italiano per il date-range picker. */
export function formatItDateRange(dates: [Date | undefined, Date | undefined]): string {
  return dates
    .filter((d): d is Date => !!d)
    .map(d => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }))
    .join(' – ');
}
