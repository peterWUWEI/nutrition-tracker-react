// Date helpers for the meal pages. All of them work in the browser's own timezone,
// so "today" and "07:30" mean what the user sees on their clock.

const pad = (value: number) => String(value).padStart(2, '0')

// "YYYY-MM-DD" for a Date.
export function toLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// "HH:MM" (24-hour) for a Date.
export function toLocalTimeString(date: Date = new Date()): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Reads "YYYY-MM-DD" as midnight local time.
function parseDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// True for real calendar dates in "YYYY-MM-DD" form ("2026-02-30" is not one).
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  // Invalid dates roll over (Feb 30 becomes Mar 2), so they don't survive a round trip.
  return toLocalDateString(parseDateString(value)) === value
}

export function addDays(dateString: string, days: number): string {
  const date = parseDateString(dateString)
  date.setDate(date.getDate() + days)
  return toLocalDateString(date)
}

// "2026-11-22" + "12:15" → a Date at 12:15 local time on that day.
export function combineDateAndTime(dateString: string, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number)
  const date = parseDateString(dateString)
  date.setHours(hours, minutes, 0, 0)
  return date
}

// Local "HH:MM" of an ISO timestamp from the API.
export function formatTime(isoTimestamp: string): string {
  return toLocalTimeString(new Date(isoTimestamp))
}

// The browser's IANA timezone, e.g. "Asia/Singapore".
export function getTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
