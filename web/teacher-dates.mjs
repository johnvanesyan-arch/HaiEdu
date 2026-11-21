// Fixed numeric presentation, using the browser's local timezone. Comparing
// evidence timestamps remains the caller's separate responsibility.
function localDate(value) {
  if (!(value instanceof Date) && typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
const pad = value => String(value).padStart(2, '0');
const dateText = date => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(date.getFullYear()).padStart(4, '0')}`;

export function teacherDate(value) {
  const date = localDate(value);
  return date ? dateText(date) : null;
}

export function teacherDateTime(value) {
  const date = localDate(value);
  return date ? `${dateText(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}` : null;
}
