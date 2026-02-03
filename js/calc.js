import { DateTime, Duration, Interval } from 'luxon'

const UNIT_MAP = { y: 'years', m: 'months', w: 'weeks', d: 'days' }

export function parseInput(input) {
  const trimmed = input.trim()
  if (!trimmed) return { type: 'unknown', displayText: '' }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const dt = DateTime.fromISO(trimmed)
    if (dt.isValid) return { type: 'date', displayText: trimmed, value: dt }
  }

  if (/^\d{4}-\d{0,2}-?\d{0,2}$/.test(trimmed) && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { type: 'partial-date', displayText: trimmed }
  }

  const dur = parseDuration(trimmed)
  if (dur) return { type: 'duration', displayText: trimmed, value: dur }

  if (/^-?\d+$/.test(trimmed)) {
    return { type: 'integer', displayText: trimmed, value: parseInt(trimmed) }
  }

  return { type: 'unknown', displayText: trimmed }
}

function parseDuration(str) {
  const match = str.match(/^(-)?(\d+[ymwd])+$/i)
  if (!match) return null

  const negative = match[1] === '-'
  const parts = str.replace(/^-/, '').match(/\d+[ymwd]/gi)
  if (!parts) return null

  const obj = { years: 0, months: 0, weeks: 0, days: 0 }
  for (const part of parts) {
    const num = parseInt(part)
    const unit = part.slice(-1).toLowerCase()
    obj[UNIT_MAP[unit]] += num
  }

  if (negative) {
    for (const key of Object.keys(obj)) obj[key] = -obj[key]
  }

  return Duration.fromObject(obj)
}

export function shouldDashContinueDate(display) {
  return /^\d{4}$/.test(display) || /^\d{4}-\d{1,2}$/.test(display)
}

export function getInputMode(display) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(display)) return 'complete'
  if (/^\d{4}-\d{2}-?$/.test(display)) return 'month-entered'
  if (/^\d{4}-?$/.test(display)) return 'year-entered'
  return 'default'
}

// const SHIFT_MODES = {
//   full: ['years', 'months', 'weeks', 'days'],
//   y: ['years', 'months', 'days'],
//   m: ['months', 'days'],
//   w: ['weeks', 'days'],
//   d: ['days']
// }

// export function formatDuration(dur, mode = 'human') {
//   const shiftUnits = SHIFT_MODES[mode] || ['years', 'months', 'days']
//   const shifted = dur.shiftTo(...shiftUnits)
//   const obj = shifted.toObject()
//   const sign = isNegative(obj) ? '-' : ''
//   const abs = {
//     years: Math.abs(obj.years || 0),
//     months: Math.abs(obj.months || 0),
//     weeks: Math.abs(obj.weeks || 0),
//     days: Math.abs(obj.days || 0)
//   }
//
//   if (mode === 'human') {
//     const totalDays = Math.abs(dur.as('days'))
//     if (totalDays <= 30) return sign + formatParts({ days: abs.days })
//     if (totalDays <= 365) return sign + formatParts({ months: abs.months, days: abs.days })
//     return sign + formatParts({ years: abs.years, months: abs.months })
//   }
//   return sign + formatParts(abs)
// }


function isNegative(obj) {
  return (obj.years || 0) < 0 || (obj.months || 0) < 0 || (obj.weeks || 0) < 0 || (obj.days || 0) < 0
}

export function calculate(left, operator, right) {
  if (left.type === 'date' && right.type === 'date' && operator === '-') {
    const interval = Interval.fromDateTimes(right.value, left.value)
    const duration = interval.toDuration(['years', 'days'])
    return { type: 'duration', displayText: formatDuration(duration), value: duration, interval, displayUnit: 'y' }
  }

  if (left.type === 'date' && right.type === 'duration') {
    const result = operator === '+' ? left.value.plus(right.value) : left.value.minus(right.value)
    return { type: 'date', displayText: result.toISODate(), value: result }
  }

  if (left.type === 'duration' && right.type === 'date' && operator === '+') {
    const result = right.value.plus(left.value)
    return { type: 'date', displayText: result.toISODate(), value: result }
  }

  // if (left.type === 'duration' && right.type === 'duration') {
  //   const result = operator === '+' ? left.value.plus(right.value) : left.value.minus(right.value)
  //   return { type: 'duration', displayText: formatDuration(result, 'y'), value: result }
  // }

  if (left.type === 'integer' && right.type === 'integer') {
    const result = operator === '+' ? left.value + right.value : left.value - right.value
    return { type: 'integer', displayText: String(result), value: result }
  }

  return null
}

export function formatDuration(duration) {
  const parts = []
  if (duration.years) parts.push(`${duration.years}y`)
  if (duration.months) parts.push(`${duration.months}m`)
  if (duration.weeks) parts.push(`${duration.weeks}w`)
  if (duration.days) parts.push(`${duration.days}d`)
  return parts.length ? parts.join('\u2009') : '0d'
}

export function formatInterval(interval, unitKey) {
  const units = { d: ['days'], w: ['weeks', 'days'], m: ['months', 'days'], y: ['years', 'months', 'days'] }
  return formatDuration(interval.toDuration(units[unitKey]))
}

export function reformatDuration(output, unit) {
  if (output?.type !== 'duration' || !output.interval) return null
  return { ...output, displayText: formatInterval(output.interval, unit), displayUnit: unit }
}

export function formatShortRelative(date) {
  const today = DateTime.now().startOf('day')
  const target = date.startOf('day')
  if (target.equals(today)) return 'today'

  const isNeg = target < today
  const [start, end] = isNeg ? [target, today] : [today, target]
  const totalDays = Math.round(end.diff(start, 'days').days)

  const units = totalDays <= 30 ? ['days'] : totalDays <= 365 ? ['months', 'days'] : ['years', 'months', 'days']
  const duration = Interval.fromDateTimes(start, end).toDuration(units)
  return (isNeg ? '-' : '+') + formatDuration(duration)
}

export function formatWeekInfo(dt){
  return { weekday: dt.toFormat('cccc'), week: `W${String(dt.weekNumber).padStart(2, '0')}` }
}

export function getMonthCalendar(yearMonth) {
  const dt = DateTime.fromISO(`${yearMonth}-01`)
  if (!dt.isValid) return []

  const today = DateTime.now().startOf('day')
  const firstOfMonth = dt.startOf('month')
  const startDay = firstOfMonth.minus({ days: firstOfMonth.weekday - 1 })

  const days = []
  for (let i = 0; i < 42; i++) {
    const current = startDay.plus({ days: i })
    days.push({
      day: current.day,
      date: current,
      isCurrentMonth: current.month === dt.month,
      isToday: current.hasSame(today, 'day')
    })
  }
  return days
}
