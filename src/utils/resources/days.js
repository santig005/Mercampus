export const daysOfWeekES = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' },
  { id: 6, name: 'Sábado' },
  { id: 7, name: 'Domingo' },
];
export const daysES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado","Domingo"];
export const Days = async () => {
  return daysOfWeekES;
};

// T-81 (seller profile zone): a locale-agnostic key per weekday, same order
// (index 0 = Monday ... 6 = Sunday, matching `daysES` and Schedule.day
// 1-7). AvailabilityBadge and TableSchema use this to look up a translated
// day name/abbreviation in messages/{es,en}.json instead of hardcoding one
// language - see `days.*` under the `AvailabilityBadge` and `TableSchema`
// namespaces there.
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
