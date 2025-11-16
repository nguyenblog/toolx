function pad(n) { return String(n).padStart(2, '0') }

function formatDateToICS(dateStr) {
  const d = new Date(dateStr)
  // all-day event for next billing date
  const y = d.getUTCFullYear()
  const m = pad(d.getUTCMonth() + 1)
  const day = pad(d.getUTCDate())
  return `${y}${m}${day}`
}

export function createICS({ title, date, description }) {
  const dtstamp = new Date()
  const stamp = `${dtstamp.getUTCFullYear()}${pad(dtstamp.getUTCMonth() + 1)}${pad(dtstamp.getUTCDate())}T${pad(dtstamp.getUTCHours())}${pad(dtstamp.getUTCMinutes())}${pad(dtstamp.getUTCSeconds())}Z`
  const start = formatDateToICS(date)
  const uid = `${start}-${Math.random().toString(36).slice(2)}@toolx`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ToolX//Subscription Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadICS(opts) {
  const ics = createICS(opts)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(opts.title || 'event').replace(/\s+/g, '-')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}