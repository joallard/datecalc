import { parseInput, calculate, reformatDuration, shouldDashContinueDate, getInputMode, formatShortRelative, formatWeekInfo, getMonthCalendar } from './calc.js'

function getMode(state) {
  if (state.output) return 'result'
  if (state.expression) return 'expression'
  return 'input'
}

export const emptyState = { display: '', expression: null, output: null }

export function getViewModel(state) {
  const { display, expression, output } = state
  const mode = getMode(state)
  const parsed = parseInput(display)
  const inputMode = getInputMode(display)
  const displayValue = output || (display ? parsed : null)

  let infoArea = null
  if (displayValue?.type === 'date') {
    infoArea = { type: 'duration', value: formatShortRelative(displayValue.value), ...formatWeekInfo(displayValue.value) }
  } else if (expression?.left?.type === 'date' && parsed.type === 'duration') {
    const preview = calculate(expression.left, expression.operator, parsed)
    if (preview?.type === 'date') {
      infoArea = { type: 'date', value: preview.displayText, ...formatWeekInfo(preview.value) }
    }
  }

  const calendarYearMonth = inputMode === 'month-entered' ? display.match(/^(\d{4}-\d{2})/)?.[1] : null
  const calendarDays = calendarYearMonth ? getMonthCalendar(calendarYearMonth) : []

  return { mode, display, expression, output, displayValue, inputMode, infoArea, calendarYearMonth, calendarDays }
}

export function keyToIntent(state, key) {
  const { display } = state
  const mode = getMode(state)

  if (key === 'C') return { type: 'clear' }
  if (key === 'Backspace') return { type: 'delete' }
  if (key === '=') return { type: 'evaluate' }

  if (key === '+' || key === '-') {
    if (key === '-' && mode !== 'result' && shouldDashContinueDate(display)) {
      return { type: 'digit', value: '-' }
    }
    return { type: 'operator', value: key }
  }

  if ('dwmy'.includes(key)) {
    if (mode === 'result' && state.output?.type === 'duration' && state.output.interval) {
      return { type: 'reformatDuration', unit: key }
    }
    if (/^-?(\d+[ymw])*\d+$/.test(display)) {
      return { type: 'unitSuffix', value: key }
    }
    return null
  }

  if (/^[0-9]$/.test(key)) return { type: 'digit', value: key }

  if (key.startsWith('set:')) return { type: 'setDisplay', value: key.slice(4) }
  if (key.startsWith('month:')) return { type: 'appendMonth', value: key.slice(6) }
  if (key.startsWith('day:')) return { type: 'appendDay', value: key.slice(4) }

  return null
}

export function handleIntent(state, intent) {
  if (!intent) return state

  const { display, expression, output } = state
  const mode = getMode(state)

  switch (intent.type) {
    case 'clear':
      return emptyState

    case 'reformatDuration': {
      const reformatted = reformatDuration(output, intent.unit)
      return reformatted ? { ...state, output: reformatted } : state
    }

    case 'operator': {
      if (mode === 'result') {
        return { display: '', expression: { left: output, operator: intent.value }, output: null }
      }
      if (expression?.operator && !display) {
        return { ...state, expression: { ...expression, operator: intent.value } }
      }
      const parsed = parseInput(display)
      const isUsableOperand = ['date', 'duration', 'integer'].includes(parsed.type)
      if (isUsableOperand) {
        if (expression?.operator) {
          const res = calculate(expression.left, expression.operator, parsed)
          if (res) return { display: '', expression: { left: res, operator: intent.value }, output: null }
        }
        return { display: '', expression: { left: parsed, operator: intent.value }, output: null }
      }
      return state
    }

    case 'digit': {
      if (mode === 'result') return handleIntent(emptyState, intent)
      return { ...state, display: display + intent.value }
    }

    case 'delete': {
      if (mode === 'result') return state
      if (!display && expression?.operator && !expression.right) {
        return { display: expression.left.displayText, expression: null, output: null }
      }
      return { ...state, display: display.slice(0, -1) }
    }

    case 'evaluate': {
      if (!expression?.operator || !display) return state
      const right = parseInput(display)
      if (right.type !== 'unknown' && right.type !== 'partial-date') {
        const res = calculate(expression.left, expression.operator, right)
        if (res) return { display: '', expression: { ...expression, right }, output: res }
      }
      return state
    }

    case 'unitSuffix': {
      if (mode === 'result') return handleIntent(emptyState, intent)
      return { ...state, display: display + intent.value }
    }

    case 'setDisplay': {
      if (mode === 'result') return { ...emptyState, display: intent.value }
      return { ...state, display: intent.value }
    }

    case 'appendMonth':
      return { ...state, display: display.replace(/-?$/, '-') + intent.value }

    case 'appendDay': {
      const day = intent.value.padStart(2, '0')
      return { ...state, display: (display.endsWith('-') ? display : display + '-') + day }
    }

    default:
      throw new Error(`Unknown intent type: ${intent.type}`)
  }
}

export function handleKey(state, key) {
  return handleIntent(state, keyToIntent(state, key))
}
