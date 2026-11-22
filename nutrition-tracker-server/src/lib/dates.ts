// Calendar-date helpers. Meals are stored with a UTC timestamp (eatenAt); "the meals of
// 15 January" depends on the user's timezone, so we turn a date + timezone into a UTC range.

// True for real calendar dates written as YYYY-MM-DD ("2026-02-30" is not one).
export function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const date = new Date(`${value}T00:00:00Z`)
  // Month 13 can't be parsed at all; Feb 30 rolls over to Mar 2, so it doesn't survive a round trip.
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

// True for IANA timezone names the runtime knows, e.g. "Asia/Singapore".
export function isValidTimeZone(value: string): boolean {
  if (!value) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

// How far ahead of UTC (in ms) the wall clock in `timeZone` is at a given moment.
function offsetFromUtc(moment: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(moment)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value)
  const wallClockAsUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'))
  return wallClockAsUtc - Math.floor(moment.getTime() / 1000) * 1000
}

// The moment a calendar date starts (00:00) in `timeZone`.
function startOfDay(date: string, timeZone: string): Date {
  const midnightUtc = new Date(`${date}T00:00:00Z`).getTime()
  const guess = midnightUtc - offsetFromUtc(new Date(midnightUtc), timeZone)
  // If the offset is different at the guessed moment (daylight saving), use that offset instead.
  return new Date(midnightUtc - offsetFromUtc(new Date(guess), timeZone))
}

function nextDate(date: string): string {
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

// The UTC range [start, end) covering a calendar date in `timeZone`.
export function dayRangeInTimeZone(date: string, timeZone: string): { start: Date; end: Date } {
  return { start: startOfDay(date, timeZone), end: startOfDay(nextDate(date), timeZone) }
}
