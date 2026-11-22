// Spec: small date helpers used by the meal pages. Tests run in UTC (see vitest.config.ts).
import { describe, expect, it } from 'vitest'

import { addDays, combineDateAndTime, formatTime, isValidDateString, toLocalDateString, toLocalTimeString } from './date.ts'

describe('date helpers', () => {
  it('formats a Date as a local YYYY-MM-DD string', () => {
    expect(toLocalDateString(new Date('2026-11-02T10:00:00Z'))).toBe('2026-11-02')
  })

  it('formats a Date as a local HH:MM string', () => {
    expect(toLocalTimeString(new Date('2026-11-02T07:05:00Z'))).toBe('07:05')
  })

  it.each([
    ['2026-11-22', 1, '2026-11-23'],
    ['2026-11-30', 1, '2026-12-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2026-12-31', 1, '2027-01-01'],
  ])('adds days: %s + %i = %s', (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected)
  })

  it('combines a date and a time into a local Date', () => {
    expect(combineDateAndTime('2026-11-22', '12:15').toISOString()).toBe('2026-11-22T12:15:00.000Z')
  })

  it('shows the local time of an ISO timestamp', () => {
    expect(formatTime('2026-11-22T07:05:00.000Z')).toBe('07:05')
  })

  it.each([
    ['2026-11-22', true],
    ['2026-02-28', true],
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['22/11/2026', false],
    ['', false],
  ])('checks whether %j is a valid date: %s', (value, valid) => {
    expect(isValidDateString(value)).toBe(valid)
  })
})
