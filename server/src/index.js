import cron from 'node-cron'
import dotenv from 'dotenv'
import app from './app.js'
import { checkExpiringAndNotify } from './services/googleSheetsService.js'

dotenv.config()

// Cron: run daily at 21:00 (skip in test)
if (process.env.NODE_ENV !== 'test') {
  const tz = process.env.ALERT_CRON_TZ || process.env.TZ || 'Asia/Ho_Chi_Minh'
  cron.schedule('0 21 * * *', async () => {
    try {
      await checkExpiringAndNotify()
      console.log('[Cron] Reminder check completed')
    } catch (e) {
      console.error('[Cron] Reminder check failed', e)
    }
  }, { timezone: tz })
}

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`ToolX server running on http://localhost:${port}`)
})