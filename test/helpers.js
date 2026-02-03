import { emptyState, handleKey, getViewModel } from '../js/input.js'

export { emptyState, handleKey, getViewModel }

export function run(input) {
  return [...input].filter(c => c !== ' ').reduce((state, key) => handleKey(state, key), emptyState)
}
