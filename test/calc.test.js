import { test, expect } from 'bun:test'
import { emptyState, handleKey, getViewModel, run } from './helpers.js'

test('date difference with reformat to days', () => {
  const state = run('2026-01-12 - 1991-01-13 = d')

  expect(getViewModel(state).mode).toBe('result')
  expect(state.output.type).toBe('duration')
  expect(state.output.displayUnit).toBe('d')
  expect(state.output.displayText).toBe('12783d')
})

test('date + duration → date', () => {
  const state = run('2020-05-31 + 1917d =')
  expect(state.output.displayText).toBe('2025-08-30')
})

test('date - duration → date', () => {
  const state = run('2024-03-01 - 45d =')
  expect(state.output.displayText).toBe('2024-01-16')
})

test('duration reformat', () => {
  const state = run('2026-03-15 - 2019-11-22 = m')
  expect(state.output.displayText).toBe('75m\u200921d')
})

test('chain operations', () => {
  const state = run('2024-02-29 + 1y = - 30d =')
  expect(state.output.displayText).toBe('2025-01-29')
})

test('chain with second operator evaluates first', () => {
  const state = run('100 + 50 + 25 =')
  expect(state.output.displayText).toBe('175')
})

test('digit after result clears', () => {
  const state = run('100 + 50 = 7')
  expect(state.display).toBe('7')
  expect(state.output).toBe(null)
})

test('backspace uncommits operator', () => {
  const s1 = run('2024-03-15 +')
  expect(s1.expression.operator).toBe('+')
  const s2 = handleKey(s1, 'Backspace')
  expect(s2.expression).toBe(null)
  expect(s2.display).toBe('2024-03-15')
})

test('clear resets', () => {
  const state = run('2024-03-15 + 10d = C')
  expect(state).toEqual(emptyState)
})

test('composite duration', () => {
  const state = run('2020-01-01 + 2y6m15d =')
  expect(state.output.displayText).toBe('2022-07-16')
})

test('shortcut entry', () => {
  const state = handleKey(emptyState, 'set:2024-07-04')
  expect(state.display).toBe('2024-07-04')
})
