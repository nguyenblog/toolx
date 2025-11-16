// Google Sheets service
// Demo mode reads local JSON; production reads via Google Sheets API or public CSV.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { google } from 'googleapis'
import { sendReminderEmail } from './emailService.js'

let sampleData = null
function cfg() {
  return {
    SHEETS_ID: process.env.GOOGLE_SHEETS_ID || '',
    SHEETS_GID: process.env.GOOGLE_SHEETS_GID || '0',
    PUBLIC_MODE: String(process.env.GOOGLE_SHEETS_PUBLIC || '').toLowerCase() === 'true',
    SA_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    SA_PK_RAW: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
    DEMO_MODE: process.env.DEMO_MODE !== 'false',
    ALERT_ENABLED: String(process.env.ALERT_ENABLED || '').toLowerCase() === 'true',
  }
}
function getSampleData() {
  if (sampleData) return sampleData
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const p = path.resolve(__dirname, '../../data/demo-subscriptions.json')
  try {
    const raw = fs.readFileSync(p, 'utf-8')
    sampleData = JSON.parse(raw)
  } catch (e) {
    console.warn('[Demo] Failed to load demo-subscriptions.json', e)
    sampleData = []
  }
  return sampleData
}

export async function getUserSubscriptions(email) {
  const { DEMO_MODE } = cfg()
  if (DEMO_MODE) return getSampleData().filter((row) => row.email === email)
  const { header, rows } = await readRowsFromSheets()
  const normalized = rows.map((r) => normalizeRow(r, header)).filter((r) => !!r)
  return normalized.filter((row) => String(row.email || '').trim().toLowerCase() === String(email || '').trim().toLowerCase())
}

export async function checkExpiringAndNotify(now = new Date()) {
  const { DEMO_MODE, ALERT_ENABLED } = cfg()
  const source = DEMO_MODE
    ? getSampleData()
    : (() => { const { header, rows } = /* read and normalize */ globalThis.__TOOLX_READ_SHEETS__ || {}; return (rows || []).map((r) => normalizeRow(r, header)).filter(Boolean) })()
  if (!DEMO_MODE) {
    try {
      const { header, rows } = await readRowsFromSheets()
      const list = rows.map((r) => normalizeRow(r, header)).filter(Boolean)
      for (const row of list) {
        if (!isRowEnabled(row)) continue
        const tag = calculateReminderTag(now, row.nextBillingDate)
        if (tag) {
          console.log(`[Reminder] ${tag} for ${row.name}`)
          if (ALERT_ENABLED) {
            try { await sendReminderEmail(row.email, row, tag) } catch (e) { console.warn('[Reminder] send email failed', e?.message || e) }
          }
        }
      }
      return
    } catch (_) {}
  }
  for (const row of source) {
    if (!isRowEnabled(row)) continue
    const tag = calculateReminderTag(now, row.nextBillingDate)
    if (tag) {
      console.log(`[Reminder] ${tag} for ${row.name}`)
      if (ALERT_ENABLED) {
        try { await sendReminderEmail(row.email, row, tag) } catch (e) { console.warn('[Reminder] send email failed', e?.message || e) }
      }
    }
  }
}

export function daysBetween(a, b) {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((b - a) / msPerDay)
}

export function calculateReminderTag(now, nextBillingDateStr) {
  const d = daysBetween(now, new Date(nextBillingDateStr))
  if (d === 7) return 'remind-7'
  if (d === 4) return 'remind-4'
  if (d === 2) return 'remind-2'
  if (d === 1) return 'remind-1'
  return null
}

// Only process services that are enabled (status ON or ACTIVE)
export function isRowEnabled(row) {
  const s = String(row?.status || '').trim().toLowerCase()
  return s === 'on'
}

// ---- Helpers ----

export async function readRowsFromSheets() {
  const { SHEETS_ID, SHEETS_GID, PUBLIC_MODE, SA_EMAIL, SA_PK_RAW } = cfg()
  if (!SHEETS_ID) throw new Error('GOOGLE_SHEETS_ID is required')
  // Public CSV mode
  if (PUBLIC_MODE) {
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(SHEETS_ID)}/export?format=csv&gid=${encodeURIComponent(SHEETS_GID)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`)
    const csv = await res.text()
    const { header, rows } = parseCsv(csv)
    globalThis.__TOOLX_READ_SHEETS__ = { header, rows }
    return { header, rows }
  }
  // Service Account mode
  const privateKey = SA_PK_RAW.replace(/\\n/g, '\n')
  if (!SA_EMAIL || !privateKey) throw new Error('Service account email/private key missing')
  const auth = new google.auth.JWT({
    email: SA_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  // Resolve sheet title from gid (tab id), fallback to first sheet
  let title = 'Sheet1'
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEETS_ID, fields: 'sheets(properties(sheetId,title))' })
    const list = (meta.data.sheets || []).map((s) => s.properties)
    const wanted = Number(SHEETS_GID)
    const found = list.find((p) => p.sheetId === wanted)
    title = (found && found.title) ? found.title : ((list[0] && list[0].title) ? list[0].title : 'Sheet1')
  } catch {}
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_ID,
    range: `${title}!A:Z`,
  })
  const values = resp.data.values || []
  const header = (values[0] || []).map((s) => String(s || '').trim())
  const rows = values.length > 1 ? values.slice(1) : []
  globalThis.__TOOLX_READ_SHEETS__ = { header, rows }
  return { header, rows }
}

function parseCsv(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l && l.trim().length)
  if (!lines.length) return []
  const header = splitCsvLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    rows.push(splitCsvLine(lines[i]))
  }
  // Return as array-of-arrays similar to Sheets API values
  return { header, rows }
}

function splitCsvLine(line) {
  const res = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; continue }
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) { res.push(cur); cur = ''; continue }
    cur += ch
  }
  res.push(cur)
  return res.map((s) => s.trim())
}

export function normalizeRow(arr, header = null) {
  try {
    if (!arr || !arr.length) return null
    let idxEmail = 0, idxName = 1, idxStart = 2, idxCycle = 3, idxNext = 4, idxCost = 5, idxStatus = 6
    if (Array.isArray(header) && header.length) {
      const canon = header.map((h) => canonicalHeader(h))
      const findIdx = (cands) => {
        for (const c of cands) { const i = canon.indexOf(c); if (i >= 0) return i }
        return -1
      }
      idxEmail = findIdx(['email','mail']) >= 0 ? findIdx(['email','mail']) : idxEmail
      idxName = findIdx(['name','service','tendichvu','dichvu','ten']) >= 0 ? findIdx(['name','service','tendichvu','dichvu','ten']) : idxName
      idxStart = findIdx(['startdate','start','ngaybatdau','batdau','ngaybd']) >= 0 ? findIdx(['startdate','start','ngaybatdau','batdau','ngaybd']) : idxStart
      idxCycle = findIdx(['cycle','plan','chu_ky','chuky','chuky','kyhan','loaidichvu']) >= 0 ? findIdx(['cycle','plan','chu_ky','chuky','chuky','kyhan','loaidichvu']) : idxCycle
      idxNext = findIdx(['nextbillingdate','next','ngayhethan','ngayketthuc','hethan','han']) >= 0 ? findIdx(['nextbillingdate','next','ngayhethan','ngayketthuc','hethan','han']) : idxNext
      idxCost = findIdx(['cost','amount','gia','giatien','thanhtien','sotien']) >= 0 ? findIdx(['cost','amount','gia','giatien','thanhtien','sotien']) : idxCost
      idxStatus = findIdx(['status','trangthai','trangthai']) >= 0 ? findIdx(['status','trangthai','trangthai']) : idxStatus
    }
    const email = arr[idxEmail]
    const name = arr[idxName]
    const startDate = arr[idxStart]
    const cycle = arr[idxCycle]
    const nextBillingDate = arr[idxNext]
    const cost = arr[idxCost]
    const status = arr[idxStatus]
    const parsedCost = parseFloat(String(cost || '').replace(/[^0-9.\-]+/g, '')) || 0
    return {
      email: String(email || '').trim(),
      name: String(name || '').trim(),
      startDate: toIsoDate(startDate),
      cycle: normalizeCycle(cycle),
      nextBillingDate: toIsoDate(nextBillingDate),
      cost: parsedCost,
      status: String(status || '').trim().toLowerCase() || 'active',
    }
  } catch {
    return null
  }
}

function canonicalHeader(h) {
  let s = String(h || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  // Vietnamese special letter
  s = s.replace(/đ/g, 'd')
  return s.replace(/[^a-z0-9]+/g, '')
}

function toIsoDate(v) {
  if (!v) return ''
  const s = String(v).trim()
  // Already ISO yyyy-mm-dd
  const mIso = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s)
  if (mIso) {
    return `${mIso[1]}-${mIso[2]}-${mIso[3]}`
  }
  // dd/mm/yyyy or dd-mm-yyyy (day-first common in VN)
  const mDmy = /^([0-9]{2})[\/\-]([0-9]{2})[\/\-]([0-9]{4})$/.exec(s)
  if (mDmy) {
    const d = Number(mDmy[1])
    const m = Number(mDmy[2])
    const y = Number(mDmy[3])
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      const dt = new Date(y, m - 1, d)
      if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)
      return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    }
  }
  // mm/dd/yyyy
  const mMdy = /^([0-9]{2})[\/\-]([0-9]{2})[\/\-]([0-9]{4})$/.exec(s)
  if (mMdy) {
    const mm = Number(mMdy[1])
    const dd = Number(mMdy[2])
    const yy = Number(mMdy[3])
    const dt = new Date(yy, mm - 1, dd)
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)
  }
  // Fallback native parser
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return s
}

function normalizeCycle(c) {
  const s = String(c || '').toLowerCase()
  if (s.includes('year') || s.includes('năm')) return 'year'
  if (s.includes('day') || s.includes('ngày')) return 'day'
  return 'month'
}