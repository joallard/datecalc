import { test, expect } from 'bun:test'
import { run } from './helpers.js'

// Leap year tests
test('Feb 29 + 1 year → Feb 28 (non-leap)', () => {
  const state = run('2024-02-29 + 1y =')
  expect(state.output.displayText).toBe('2025-02-28')
})

test('Feb 29 - 1 year → Feb 28 (non-leap)', () => {
  const state = run('2024-02-29 - 1y =')
  expect(state.output.displayText).toBe('2023-02-28')
})

test('Feb 29 to Feb 29 (4 years)', () => {
  const state = run('2024-02-29 - 2020-02-29 =')
  expect(state.output.displayText).toBe('4y')
})

test('leap year day count: Mar 1 - Feb 28 in leap year', () => {
  const state = run('2024-03-01 - 2024-02-28 = d')
  expect(state.output.displayText).toBe('2d')
})

test('leap year day count: Mar 1 - Feb 28 in non-leap year', () => {
  const state = run('2025-03-01 - 2025-02-28 = d')
  expect(state.output.displayText).toBe('1d')
})

// Month-end rollover
test('Jan 31 + 1 month → Feb 28 (clamped)', () => {
  const state = run('2025-01-31 + 1m =')
  expect(state.output.displayText).toBe('2025-02-28')
})

test('Jan 31 + 1 month in leap year → Feb 29', () => {
  const state = run('2024-01-31 + 1m =')
  expect(state.output.displayText).toBe('2024-02-29')
})

test('Aug 31 + 1 month → Sep 30 (clamped)', () => {
  const state = run('2024-08-31 + 1m =')
  expect(state.output.displayText).toBe('2024-09-30')
})

test('Mar 31 - 1 month → Feb 29 in leap year', () => {
  const state = run('2024-03-31 - 1m =')
  expect(state.output.displayText).toBe('2024-02-29')
})

// Zero and negative durations
test('same date minus itself → 0d', () => {
  const state = run('2024-06-15 - 2024-06-15 =')
  expect(state.output.displayText).toBe('0d')
})

test('earlier minus later → negative duration', () => {
  const state = run('2024-01-01 - 2024-01-10 =')
  expect(state.output.displayText).toMatch(/^-/)
})

// Large spans
test('multi-decade span', () => {
  const state = run('2024-01-01 - 1990-01-01 =')
  expect(state.output.displayText).toBe('34y')
})

// Year boundary
test('Dec 31 + 1 day crosses year', () => {
  const state = run('2024-12-31 + 1d =')
  expect(state.output.displayText).toBe('2025-01-01')
})

// Duration unit conversion edge cases
test('exactly 1 year in days', () => {
  const state = run('2025-01-01 - 2024-01-01 = d')
  expect(state.output.displayText).toBe('366d') // 2024 is leap year
})

test('exactly 1 year in days (non-leap)', () => {
  const state = run('2026-01-01 - 2025-01-01 = d')
  expect(state.output.displayText).toBe('365d')
})
