import { getUserSubscriptions, daysBetween, calculateReminderTag } from '../src/services/googleSheetsService.js'

test('getUserSubscriptions filters by email in demo mode', async () => {
  const list = await getUserSubscriptions('user@example.com')
  expect(Array.isArray(list)).toBe(true)
  expect(list.length).toBeGreaterThan(0)
  expect(list.every((x) => x.email === 'user@example.com')).toBe(true)
})

test('daysBetween computes correct delta', () => {
  const a = new Date('2025-11-10')
  const b = new Date('2025-11-15')
  expect(daysBetween(a, b)).toBe(5)
})

test('calculateReminderTag gives remind-4 and remind-1', () => {
  const now = new Date('2025-11-10')
  expect(calculateReminderTag(now, '2025-11-14')).toBe('remind-4')
  expect(calculateReminderTag(now, '2025-11-11')).toBe('remind-1')
  expect(calculateReminderTag(now, '2025-11-20')).toBeNull()
})