// Spec: date helpers for "meals eaten on a calendar date in a timezone".
import { describe, expect, it } from 'vitest'

import { dayRangeInTimeZone, isValidCalendarDate, isValidTimeZone } from './dates.js'

describe('isValidCalendarDate', () => {
  it.each([
    ['2026-11-22', true],
    ['2028-02-29', true],
    ['2026-02-29', false],
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['15/01/2026', false],
    ['', false],
  ])('%j → %s', (value, valid) => {
    expect(isValidCalendarDate(value)).toBe(valid)
  })
})

describe('isValidTimeZone', () => {
  it.each([
    ['UTC', true],
    ['Asia/Singapore', true],
    ['America/New_York', true],
    ['Mars/Olympus_Mons', false],
    ['', false],
  ])('%j → %s', (value, valid) => {
    expect(isValidTimeZone(value)).toBe(valid)
  })
})

describe('dayRangeInTimeZone', () => {
  it('gives the start and end of a day in UTC', () => {
    expect(dayRangeInTimeZone('2026-01-15', 'UTC')).toEqual({
      start: new Date('2026-01-15T00:00:00.000Z'),
      end: new Date('2026-01-16T00:00:00.000Z'),
    })
  })

  it('shifts the day for a timezone ahead of UTC (Singapore, UTC+8)', () => {
    expect(dayRangeInTimeZone('2026-01-15', 'Asia/Singapore')).toEqual({
      start: new Date('2026-01-14T16:00:00.000Z'),
      end: new Date('2026-01-15T16:00:00.000Z'),
    })
  })

  it('handles a daylight-saving change (a 23-hour day in New York)', () => {
    // Clocks go from UTC-5 to UTC-4 on 8 March 2026.
    expect(dayRangeInTimeZone('2026-03-08', 'America/New_York')).toEqual({
      start: new Date('2026-03-08T05:00:00.000Z'),
      end: new Date('2026-03-09T04:00:00.000Z'),
    })
  })
})
