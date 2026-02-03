import React, { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { DateTime } from 'luxon'
import { emptyState, handleKey as processKey, getViewModel } from './input.js'

const h = React.createElement

const TYPE_LABELS = {
  date: 'date',
  duration: 'duration',
  integer: 'number',
  'partial-date': '…',
  unknown: ''
}

function App() {
  const [state, setState] = useState(emptyState)
  const vm = getViewModel(state)
  const { display, expression, output, displayValue, inputMode, infoArea, calendarYearMonth, calendarDays } = vm

  const today = DateTime.now()
  const currentYear = today.year

  const handleKey = useCallback((key) => {
    setState(s => processKey(s, key))
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (/^[0-9]$/.test(e.key)) handleKey(e.key)
      else if (e.key === '-') handleKey('-')
      else if (e.key === '+') handleKey('+')
      else if (e.key === '=' || e.key === 'Enter') { e.preventDefault(); handleKey('=') }
      else if (e.key === 'Backspace') handleKey('Backspace')
      else if (e.key === 'Escape' || (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey)) handleKey('C')
      else if (['d', 'w', 'm', 'y'].includes(e.key.toLowerCase())) handleKey(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey])

  const keypadRows = [
    ['7', '8', '9', '+', 'd'],
    ['4', '5', '6', '-', 'w'],
    ['1', '2', '3',      'm'],
    ['0', '⌫', 'C', '=', 'y']
  ]

  const getButtonClass = (key) => {
    if (key === '-') return 'op double'
    if (['+', '='].includes(key)) return 'op'
    if (['d', 'w', 'm', 'y'].includes(key)) return 'unit'
    if (key === 'C') return 'clear'
    return ''
  }

  const shortcuts = {
    'month-entered': () => {
      const weeks = []
      for (let i = 0; i < calendarDays.length; i += 7) weeks.push(calendarDays.slice(i, i + 7))
      const filteredDays = weeks.filter(week => week.some(d => d.isCurrentMonth)).flat()

      return h('div', { className: 'calendar-section' },
        h('div', { className: 'calendar-grid' },
          filteredDays.map((cd, i) => h('button', {
            key: i,
            className: 'calendar-day' + (cd.isCurrentMonth ? '' : ' dim') + (cd.isToday && cd.isCurrentMonth ? ' today' : ''),
            onClick: cd.isCurrentMonth ? () => handleKey(`day:${cd.day}`) : undefined,
            disabled: !cd.isCurrentMonth
          }, String(cd.day).padStart(2, '0')))
        ),
        h('div', { className: 'calendar-weekdays' },
          ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => h('span', { key: i }, d))
        ),
        h('div', { className: 'calendar-month' }, DateTime.fromISO(`${calendarYearMonth}-01`).toFormat('MMMM yyyy'))
      )
    },

    'year-entered': () => {
      const yr = parseInt(display.replace(/-$/, ''))
      return h('div', { className: 'month-grid' },
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
          const mm = String(m).padStart(2, '0')
          const yearMonth = display.replace(/-?$/, '-') + mm
          const isCurrent = yr === currentYear && m === today.month
          return h('button', { key: m, className: isCurrent ? 'current' : '', onClick: () => handleKey(`set:${yearMonth}-`) },
            h('span', { className: 'month-num' }, `${mm}-`),
            h('span', { className: 'shortcut-hint' }, DateTime.fromObject({ month: m }).toFormat('MMM'))
          )
        })
      )
    },

    'default': () => [
      h('div', { className: 'shortcut-row' }, [-1, 0, 1].map(n => {
        const yr = currentYear + n
        return h('button', { key: n, className: n === 0 ? 'current' : '', onClick: () => handleKey(`set:${yr}-`) }, `${yr}-`)
      })),
      h('div', { className: 'shortcut-row' }, [-1, 0, 1].map(n => {
        const dt = today.plus({ months: n }).startOf('month')
        return h('button', { key: n, className: n === 0 ? 'current' : '', onClick: () => handleKey(`set:${dt.toFormat('yyyy-MM')}-`) },
          h('span', null, `${dt.toFormat('yyyy-MM')}-`),
          h('span', { className: 'shortcut-hint' }, dt.toFormat('MMM'))
        )
      })),
      h('div', { className: 'shortcut-row' }, [-1, 0, 1].map(n => {
        const dt = today.plus({ days: n })
        const label = n === -1 ? 'yesterday' : n === 0 ? 'today' : 'tomorrow'
        return h('button', { key: n, className: n === 0 ? 'current' : '', onClick: () => handleKey(`set:${dt.toISODate()}`) },
          h('span', null, label),
          h('span', { className: 'shortcut-hint' }, dt.toISODate())
        )
      }))
    ]
  }

  return h('div', { className: 'calculator' },
    h('div', { className: 'display' },
      h('div', { className: 'formula' },
        expression ? [
          h('span', { key: 'l', className: `value ${expression.left.type}` }, expression.left.displayText),
          expression.operator && h('span', { key: 'op' }, ` ${expression.operator} `),
          expression.right && h('span', { key: 'r', className: `value ${expression.right.type}` }, expression.right.displayText)
        ] : null
      ),
      h('div', { className: 'value-row' },
        h('span', { className: `value ${displayValue?.type || 'unknown'}` }, displayValue?.displayText || '0'),
        displayValue?.type && TYPE_LABELS[displayValue.type] && h('span', { className: 'type-badge' }, TYPE_LABELS[displayValue.type]),
        h('span', { className: 'info-area' },
          infoArea && [
            h('span', { key: 'val', className: `value ${infoArea.type}` }, infoArea.value),
            infoArea.weekday && [h('br', { key: 'br' }), infoArea.weekday, ' ', h('span', { key: 'wk', className: 'week' }, infoArea.week)]
          ]
        )
      )
    ),

    h('div', { className: 'keypad' },
      keypadRows.flat().map((key, i) => {
        if (!key) return h('div', { key: i, className: 'empty' })
        return h('button', {
          key: i,
          className: getButtonClass(key),
          onClick: () => handleKey(key === '⌫' ? 'Backspace' : key)
        }, key)
      })
    ),

    h('div', { className: 'shortcuts' }, (shortcuts[inputMode] || shortcuts['default'])()),

    h('div', { className: 'help' }, 'Press d/w/m/y on duration result to convert units')
  )
}

createRoot(document.getElementById('root')).render(h(App))
