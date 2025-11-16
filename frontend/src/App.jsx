import React, { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import Sidebar from './components/app/Sidebar.jsx'
import TotalCostHeader from './components/app/TotalCostHeader.jsx'
import SubscriptionCard from './components/app/SubscriptionCard.jsx'
import UsageList from './components/app/UsageList.jsx'
import AuthModal from './components/app/AuthModal.jsx'
import Button from './components/ui/Button.jsx'
import Input from './components/ui/Input.jsx'
import Switch from './components/ui/Switch.jsx'
import Header from './components/ui/Header.jsx'
import Footer from './components/ui/Footer.jsx'
import IpInfo from './components/ui/IpInfo.jsx'
import LinkPreview from './components/ui/LinkPreview.jsx'
import PieDonutChart from './components/ui/PieDonutChart.jsx'
import TotpGenerator from './components/ui/TotpGenerator.jsx'
import TypingText from './components/ui/TypingText.jsx'
import NotFound from './components/ui/NotFound.jsx'
import masterData from './masterData/cancellationLinks.json'
import { STRINGS, getSavedLanguage, saveLanguage } from './utils/i18n.js'

const mockSubscriptions = [
  { id: 'sub-1', name: 'Spotify Premium', nextBillingDate: '2025-12-20', cost: 59900, status: 'active', providerKey: 'spotify' },
  { id: 'sub-2', name: 'Netflix Standard', nextBillingDate: '2025-11-20', cost: 180000, status: 'warning', providerKey: 'netflix' },
  { id: 'sub-3', name: 'OpenAI Plus', nextBillingDate: '2025-11-16', cost: 550000, status: 'expired', providerKey: 'openai' },
]

export default function App() {
  const API_BASE = (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ? import.meta.env.VITE_API_BASE_URL : '/api'
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [otp, setOtp] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [jwtToken, setJwtToken] = useState('')
  const [sidebarWidth, setSidebarWidth] = useState(220)
  const [resizing, setResizing] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [themeDark, setThemeDark] = useState(() => {
    try {
      const saved = localStorage.getItem('toolx.theme')
      if (saved === 'dark') return true
      if (saved === 'light') return false
    } catch {}
    return true // mặc định: giao diện tối
  })
  const [lang, setLang] = useState(getSavedLanguage())
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true) // luôn thu gọn khi tải trang
  const [resendCountdown, setResendCountdown] = useState(0)
  const [showRenew, setShowRenew] = useState(false)
  const [renewItem, setRenewItem] = useState(null)
  const renewOpenTimerRef = useRef(null)
  const [renewOpening, setRenewOpening] = useState(false)
  const [renewOpeningId, setRenewOpeningId] = useState(null)
  // Trạng thái nút xác nhận: 'idle' | 'loading' | 'success'
  const [confirmState, setConfirmState] = useState('idle')
  // Chỉ cho phép nhấn 1 lần trong mỗi phiên mở modal
  const [confirmLocked, setConfirmLocked] = useState(false)
  // URL ảnh xác nhận và tên file để tải xuống sau khi thành công
  const [confirmUrl, setConfirmUrl] = useState('')
  const [confirmFileName, setConfirmFileName] = useState('')
  // State cho popup Gia hạn (checkout)
  const [renewCoupon, setRenewCoupon] = useState('')
  const [renewDiscount, setRenewDiscount] = useState(0)
  const [couponMsg, setCouponMsg] = useState('')
  const [payMethod, setPayMethod] = useState('qr')
  const [eventLogs, setEventLogs] = useState([])
  const [clientInfo, setClientInfo] = useState({ ip: '', city: '', region: '', country: '', org: '' })
  const [route, setRoute] = useState(typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/')
  // Lưu email trước đó để reset limit theo email
  const lastEmailRef = React.useRef('')
  // Lưu thời điểm OTP đã gửi theo từng email để cho phép nhập lại mã cũ trong 5 phút
  const otpIssuedMapRef = React.useRef(new Map())
  const [historyGroupPref, setHistoryGroupPref] = useState(false)
  const [exportOpenTop, setExportOpenTop] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const menuTopRef = React.useRef(null)
  const [sendingOtp, setSendingOtp] = useState(false)
  const otpPopupTimerRef = React.useRef(null)
  const otpRequestAbortRef = React.useRef(null)
  const blockOtpModalRef = React.useRef(false)
  const otpPopupTimersRef = React.useRef(new Set())
  const otpRequestAbortSetRef = React.useRef(new Set())
  const [otpSendError, setOtpSendError] = useState('')
  const [otpSentStatus, setOtpSentStatus] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [showClickGuard, setShowClickGuard] = useState(false)
  const [otpGuardCountdown, setOtpGuardCountdown] = useState(0)
  const otpClickRef = React.useRef({ lastTs: 0, count: 0 })
  // Ref để focus vào nút Xác nhận sau khi người dùng nhập đủ OTP
  const confirmBtnRef = React.useRef(null)

  // Khi OTP đủ 6 ký tự, tự động đưa focus tới nút Xác nhận để có thể nhấn Enter
  React.useEffect(() => {
    const code = String(otp || '').trim()
    if (code.length >= 6 && confirmBtnRef.current) {
      try { confirmBtnRef.current.focus() } catch {}
    }
  }, [otp])

  // Helpers to persist/read OTP issued time per email (Map + localStorage)
  const OTP_ISSUED_STORE_KEY = 'toolx.otpIssuedMap'
  const readIssuedStore = () => {
    try {
      const raw = localStorage.getItem(OTP_ISSUED_STORE_KEY)
      if (!raw) return {}
      const obj = JSON.parse(raw)
      return obj && typeof obj === 'object' ? obj : {}
    } catch { return {} }
  }
  const writeIssuedStore = (obj) => {
    try { localStorage.setItem(OTP_ISSUED_STORE_KEY, JSON.stringify(obj)) } catch {}
  }
  const getOtpIssuedAt = (emailKey) => {
    try {
      if (otpIssuedMapRef.current.has(emailKey)) return otpIssuedMapRef.current.get(emailKey)
      const store = readIssuedStore()
      const ts = store[emailKey]
      if (typeof ts === 'number' && ts > 0) {
        try { otpIssuedMapRef.current.set(emailKey, ts) } catch {}
        return ts
      }
      return 0
    } catch { return 0 }
  }
  const setOtpIssuedAt = (emailKey, ts) => {
    try {
      otpIssuedMapRef.current.set(emailKey, ts)
      const store = readIssuedStore()
      store[emailKey] = ts
      writeIssuedStore(store)
    } catch {}
  }

  // Định tuyến đơn giản dựa trên hash để tránh lỗi reload
  const navigate = (path) => {
    const hash = path.startsWith('#') ? path : `#${path}`
    try { window.location.hash = hash } catch {}
    setRoute(hash)
  }
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Block F12 and common DevTools shortcuts + context menu
  React.useEffect(() => {
    const onKeyDown = (e) => {
      const k = String(e.key || '').toUpperCase()
      const block = (
        k === 'F12' ||
        (e.ctrlKey && e.shiftKey && (k === 'I' || k === 'J' || k === 'C')) ||
        (e.ctrlKey && k === 'U')
      )
      if (block) {
        e.preventDefault()
        e.stopPropagation()
        try { e.returnValue = false } catch {}
        alert('Tính năng bị vô hiệu hoá.')
        return false
      }
    }
    const onContextMenu = (e) => { e.preventDefault(); e.stopPropagation(); return false }
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('contextmenu', onContextMenu, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('contextmenu', onContextMenu, true)
    }
  }, [])

  // Restore last viewed tab/route on load
  useEffect(() => {
    try {
      const saved = localStorage.getItem('toolx.route')
      if (saved && saved !== (window.location.hash || '#/')) {
        navigate(saved)
      }
    } catch {}
  }, [])

  // Persist route when changed
  useEffect(() => {
    try { localStorage.setItem('toolx.route', route) } catch {}
  }, [route])

  // Đóng dropdown Export ở header khi click ra ngoài
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuTopRef.current) return
      if (!menuTopRef.current.contains(e.target)) setExportOpenTop(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Demo payment config for VietQR (SePay)
  const PAYMENT = {
    account: '03268686868', // Số tài khoản yêu cầu
    bank: 'MBBank',         // Ngân hàng yêu cầu (chuẩn tham số SePay)
  }

  const t = (k) => STRINGS[lang][k]

  // Xuất Excel lịch sử (dùng ở Header/Topbar)
  const exportHistoryExcel = () => {
    try {
      const locale = lang === 'vi' ? 'vi-VN' : 'en-US'
      const formatTime = (iso) => { try { return new Date(iso).toLocaleString(locale) } catch { return iso } }
      let rows = eventLogs.map((log, idx) => ({
        STT: idx + 1,
        DichVu: log.item?.name || '',
        HanhDong: log.type === 'cancel' ? 'Hủy gói' : 'Gia hạn',
        ThoiGian: formatTime(log.time),
        ThanhTien: typeof log.amount === 'number' ? Number(log.amount) : 0,
        IP: log.client?.ip || '',
        ThanhPho: log.client?.city || '',
        Vung: log.client?.region || '',
        QuocGia: log.client?.country || '',
      }))
      if (!rows.length) {
        rows = [{ STT: '', DichVu: '', HanhDong: '', ThoiGian: '', ThanhTien: 0, IP: '', ThanhPho: '', Vung: '', QuocGia: '' }]
      }
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'History')
      const today = new Date(); const dd = String(today.getDate()).padStart(2, '0'); const mm = String(today.getMonth() + 1).padStart(2, '0'); const yyyy = today.getFullYear()
      const emailSafe = String(email || '').replace(/[^a-zA-Z0-9@._-]+/g, '_') || 'guest'
      const filename = `ToolX-${emailSafe}- ${dd}${mm}${yyyy}.xlsx`
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true })
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('Xuất Excel thất bại')
    }
  }

  // Xuất Excel danh mục dịch vụ (Dashboard)
  const exportDashboardExcel = () => {
    try {
      const locale = lang === 'vi' ? 'vi-VN' : 'en-US'
      const fmtDate = (d) => { try { return d ? new Date(d).toLocaleDateString(locale) : '' } catch { return d || '' } }
      const source = Array.isArray(viewItems) ? viewItems : items || []
      const rows = source.map((s, idx) => ({
        STT: idx + 1,
        DichVu: s.name || '',
        Loai: cycleLabel(s.cycle),
        NgayBatDau: fmtDate(s.startDate),
        NgayHetHan: fmtDate(s.nextBillingDate),
        TrangThai: s.canceled ? 'OFF' : 'ON',
        ThanhTien: typeof s.cost === 'number' ? Number(s.cost) : 0,
        NhaCungCap: s.providerKey || providerKeyFromName(s.name || ''),
      }))
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ STT: '', DichVu: '', Loai: '', NgayBatDau: '', NgayHetHan: '', TrangThai: '', ThanhTien: 0, NhaCungCap: '' }])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Subscriptions')
      const today = new Date(); const dd = String(today.getDate()).padStart(2, '0'); const mm = String(today.getMonth() + 1).padStart(2, '0'); const yyyy = today.getFullYear()
      const emailSafe = String(email || '').replace(/[^a-zA-Z0-9@._-]+/g, '_') || 'guest'
      const filename = `ToolX-${emailSafe}- ${dd}${mm}${yyyy}.xlsx`
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true })
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('Xuất Excel thất bại')
    }
  }

  // Map chu kỳ dịch vụ thành nhãn hiển thị (VI/EN)
  const cycleLabel = (c) => {
    const isVi = lang === 'vi'
    const mapVi = { month: 'Theo tháng', year: 'Theo năm', day: 'Theo ngày' }
    const mapEn = { month: 'Monthly', year: 'Yearly', day: 'Daily' }
    return (isVi ? mapVi : mapEn)[c] || (isVi ? 'Theo tháng' : 'Monthly')
  }

  // Email validation with detailed reasons (VI)
  const validateEmailDetail = (value) => {
    if (!value) return ''
    if (value.includes(' ')) return 'Email không được chứa khoảng trắng'
    const atCount = (value.match(/@/g) || []).length
    if (atCount !== 1) return 'Email phải chứa duy nhất một ký tự "@"'
    const [local, domain] = value.split('@')
    if (!local) return 'Thiếu phần tên trước @ (local-part)'
    if (!domain) return 'Thiếu phần tên miền sau @'
    if (local.length > 64) return 'Phần local vượt quá 64 ký tự'
    if (value.length > 254) return 'Email vượt quá 254 ký tự'
    if (local.startsWith('.') || local.endsWith('.')) return 'Local-part không được bắt đầu/kết thúc bằng dấu chấm (.)'
    if (local.includes('..')) return 'Local-part không được có hai dấu chấm liên tiếp'
    if (!/^[A-Za-z0-9._%+\-]+$/.test(local)) return 'Ký tự không hợp lệ trong local-part (chỉ cho phép chữ, số, ., _, %, +, -)'
    if (!domain.includes('.')) return 'Tên miền phải có dấu chấm (.)'
    const labels = domain.split('.')
    if (labels.some((l) => !l)) return 'Tên miền không hợp lệ (có nhãn rỗng)'
    if (labels.some((l) => l.startsWith('-') || l.endsWith('-'))) return 'Nhãn miền không được bắt đầu/kết thúc bằng dấu -'
    if (labels.some((l) => !/^[A-Za-z0-9-]+$/.test(l))) return 'Tên miền chỉ được chứa chữ, số và dấu -'
    const tld = labels[labels.length - 1]
    if (tld.length < 2) return 'Phần đuôi miền (TLD) phải có ít nhất 2 ký tự'
    return ''
  }

  // Compute visible character width for email input
  const minChars = 32
  const maxChars = 120
  const emailChars = Math.max(minChars, Math.min((email?.length || 0) + 2, maxChars))

  const onEmailChange = (e) => {
    const v = e.target.value
    setEmail(v)
    const err = validateEmailDetail(v)
    setEmailError(err)
    // Nếu người dùng thay đổi sang email khác, reset hạn mức/cooldown OTP
    try {
      const curr = String(v || '').trim().toLowerCase()
      const prev = String(lastEmailRef.current || '')
      if (curr !== prev) {
        lastEmailRef.current = curr
        // Reset guard/cooldown và trạng thái chặn popup
        setOtpGuardCountdown(0)
        setShowClickGuard(false)
        blockOtpModalRef.current = false
        // Hủy mọi timer/request liên quan đến email cũ để tránh popup trễ
        if (otpPopupTimerRef.current) { clearTimeout(otpPopupTimerRef.current); otpPopupTimerRef.current = null }
        try { otpPopupTimersRef.current.forEach((id) => clearTimeout(id)); otpPopupTimersRef.current.clear() } catch {}
        try { otpRequestAbortSetRef.current.forEach((ctrl) => { try { ctrl.abort() } catch {} }); otpRequestAbortSetRef.current.clear() } catch {}
        try { if (otpRequestAbortRef.current) { otpRequestAbortRef.current.abort(); otpRequestAbortRef.current = null } } catch {}
        // Reset bộ đếm click nhanh
        otpClickRef.current = { lastTs: 0, count: 0 }
      }
    } catch {}
  }

  // Load and execute reCAPTCHA v3 to obtain token
  const executeRecaptchaV3 = (siteKey) => new Promise((resolve, reject) => {
    try {
      const run = () => {
        try {
          window.grecaptcha.ready(() => {
            window.grecaptcha.execute(siteKey, { action: 'otp_request' })
              .then((token) => resolve(token))
              .catch(reject)
          })
        } catch (e) { reject(e) }
      }
      if (window.grecaptcha) return run()
      const scriptId = 'recaptcha-v3-script'
      if (!document.getElementById(scriptId)) {
        const s = document.createElement('script')
        s.id = scriptId
        s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
        s.async = true
        s.defer = true
        s.onload = run
        s.onerror = () => reject(new Error('Không thể tải reCAPTCHA'))
        document.head.appendChild(s)
      } else {
        // if script exists but grecaptcha not ready yet, wait a bit
        setTimeout(run, 200)
      }
    } catch (e) { reject(e) }
  })

  const requestOtp = async () => {
    if (!email) return alert('Vui lòng nhập email')
    const err = validateEmailDetail(email)
    if (err) {
      setEmailError(err)
      return
    }
    // Clear previous status/errors before sending
    setOtpSendError('')
    setOtpSentStatus('')
    const emailKey = String(email || '').trim().toLowerCase()

    // Bypass OTP cho tài khoản demo
    if (emailKey === 'demo@domain.com') {
      try {
        // Hủy timer hiện tại (nếu có)
        if (otpPopupTimerRef.current) { clearTimeout(otpPopupTimerRef.current); otpPopupTimerRef.current = null }
        try { otpPopupTimersRef.current.forEach((id) => clearTimeout(id)); otpPopupTimersRef.current.clear() } catch {}
        if (otpRequestAbortRef.current) { try { otpRequestAbortRef.current.abort() } catch {} }
        try { otpRequestAbortSetRef.current.forEach((ctrl) => { try { ctrl.abort() } catch {} }); otpRequestAbortSetRef.current.clear() } catch {}
      } catch {}
      setSendingOtp(false)
      blockOtpModalRef.current = false
      setShowAuth(false)
      const token = 'DEMO'
      setJwtToken(token)
      setIsAuthenticated(true)
      // Lưu cookie để duy trì phiên demo
      try {
        const maxAge = 60 * 60 * 24 * 30
        const baseAttr = `path=/; max-age=${maxAge}; SameSite=Lax`
        const secureAttr = (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:') ? '; Secure' : ''
        document.cookie = `auth_token=${encodeURIComponent(token)}; ${baseAttr}${secureAttr}`
        document.cookie = `auth_email=${encodeURIComponent(email)}; ${baseAttr}${secureAttr}`
      } catch {}
      // Seed vài log demo cơ bản
      try {
        setEventLogs([
          {
            id: 'log-1',
            type: 'renew',
            time: new Date().toISOString(),
            item: { id: 'sub-1', name: 'Spotify Premium', providerKey: 'spotify', cycle: 'month' },
            amount: 59900,
            client: clientInfo,
          },
          {
            id: 'log-2',
            type: 'cancel',
            time: new Date().toISOString(),
            item: { id: 'sub-2', name: 'Netflix Standard', providerKey: 'netflix', cycle: 'month' },
            amount: 0,
            client: clientInfo,
          },
        ])
      } catch {}
      navigate('#/dashboard')
      return
    }
    // Nếu đã có OTP còn hiệu lực (<5 phút) cho email này, mở ngay modal để nhập mã cũ
    try {
      const issuedAt = getOtpIssuedAt(emailKey)
      if (issuedAt && (Date.now() - issuedAt) < 5 * 60 * 1000) {
        // Hủy timer hiện tại (nếu có) để tránh mở modal trễ
        if (otpPopupTimerRef.current) { clearTimeout(otpPopupTimerRef.current); otpPopupTimerRef.current = null }
        try { otpPopupTimersRef.current.forEach((id) => clearTimeout(id)); otpPopupTimersRef.current.clear() } catch {}
        setSendingOtp(false)
        blockOtpModalRef.current = false
        setShowAuth(true)
        setOtpSentStatus(lang === 'vi' ? 'OTP trước đó vẫn còn hiệu lực trong 5 phút. Vui lòng nhập mã bạn đã nhận.' : 'Previous OTP is still valid for 5 minutes. Please enter the code you received.')
        return
      }
    } catch {}
    // Nếu đang gửi OTP hoặc có request đang chạy, coi như click nhanh
    if (sendingOtp || (otpRequestAbortSetRef.current && otpRequestAbortSetRef.current.size > 0)) {
      // Hủy timer và request, chặn mở OTP modal
      if (otpPopupTimerRef.current) { clearTimeout(otpPopupTimerRef.current); otpPopupTimerRef.current = null }
      try { otpPopupTimersRef.current.forEach((id) => clearTimeout(id)); otpPopupTimersRef.current.clear() } catch {}
      try { otpRequestAbortSetRef.current.forEach((ctrl) => { try { ctrl.abort() } catch {} }); otpRequestAbortSetRef.current.clear() } catch {}
      if (otpRequestAbortRef.current) { try { otpRequestAbortRef.current.abort() } catch {} }
      setSendingOtp(false)
      setShowAuth(false)
      blockOtpModalRef.current = true
      setOtpGuardCountdown((s) => s > 0 ? s + 5 : 15)
      setShowClickGuard(true)
      return
    }
    // Rapid-click guard: if cooldown active, show popup, extend cooldown, and block
    if (otpGuardCountdown > 0) {
      // Hủy lịch mở OTP modal nếu trước đó đã lên lịch
      if (otpPopupTimerRef.current) { clearTimeout(otpPopupTimerRef.current); otpPopupTimerRef.current = null }
      // Hủy tất cả timer đã đặt
      try {
        otpPopupTimersRef.current.forEach((id) => clearTimeout(id))
        otpPopupTimersRef.current.clear()
      } catch {}
      // Hủy tất cả request đang chạy
      try {
        otpRequestAbortSetRef.current.forEach((ctrl) => { try { ctrl.abort() } catch {} })
        otpRequestAbortSetRef.current.clear()
      } catch {}
      if (otpRequestAbortRef.current) { try { otpRequestAbortRef.current.abort() } catch {} }
      setSendingOtp(false)
      setShowAuth(false)
      blockOtpModalRef.current = true
      setOtpGuardCountdown((s) => s + 5)
      setShowClickGuard(true)
      return
    }
    const now = Date.now()
    const { lastTs, count } = otpClickRef.current
    if (now - lastTs < 700) {
      otpClickRef.current.count = (count || 0) + 1
    } else {
      otpClickRef.current.count = 1
    }
    otpClickRef.current.lastTs = now
    if (otpClickRef.current.count >= 3) {
      // Trigger 15s cooldown, cancel OTP modal schedule, and show warning popup
      if (otpPopupTimerRef.current) { clearTimeout(otpPopupTimerRef.current); otpPopupTimerRef.current = null }
      // Hủy tất cả timer đã đặt
      try {
        otpPopupTimersRef.current.forEach((id) => clearTimeout(id))
        otpPopupTimersRef.current.clear()
      } catch {}
      // Hủy tất cả request đang chạy
      try {
        otpRequestAbortSetRef.current.forEach((ctrl) => { try { ctrl.abort() } catch {} })
        otpRequestAbortSetRef.current.clear()
      } catch {}
      if (otpRequestAbortRef.current) { try { otpRequestAbortRef.current.abort() } catch {} }
      setSendingOtp(false)
      setShowAuth(false)
      blockOtpModalRef.current = true
      setOtpGuardCountdown(15)
      setShowClickGuard(true)
      return
    }
    // Hiển thị giao diện nhập OTP sau ~1s để mượt hơn
    setSendingOtp(true)
    // Tránh tạo nhiều timer: nếu đã có timer hiện tại, hủy trước khi đặt mới
    if (otpPopupTimerRef.current) { try { clearTimeout(otpPopupTimerRef.current) } catch {} ; otpPopupTimerRef.current = null }
    const timerId = setTimeout(() => {
      if (blockOtpModalRef.current || otpGuardCountdown > 0) {
        setSendingOtp(false); otpPopupTimerRef.current = null; try { otpPopupTimersRef.current.delete(timerId) } catch {} ; return
      }
      setShowAuth(true); setSendingOtp(false); otpPopupTimerRef.current = null; try { otpPopupTimersRef.current.delete(timerId) } catch {}
    }, 1000)
    otpPopupTimerRef.current = timerId
    try { otpPopupTimersRef.current.add(timerId) } catch {}
    // Gửi OTP ở nền, không chặn UI
    const sendRequest = (extra = {}) => {
      const ctrl = new AbortController()
      otpRequestAbortRef.current = ctrl
      try { otpRequestAbortSetRef.current.add(ctrl) } catch {}
      return fetch(`${API_BASE}/auth/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...extra }),
        signal: ctrl.signal,
      }).finally(() => { try { otpRequestAbortSetRef.current.delete(ctrl) } catch {} })
    }
    sendRequest()
      .then(async (res) => {
        if (res.status === 429) {
          const retry = parseInt(res.headers.get('Retry-After') || '0', 10)
          const msg = retry ? `Hãy thử lại sau ${retry}s` : 'Hãy thử lại sau'
          // Nếu có OTP cũ còn hiệu lực cho email này, cho nhập mã cũ; ngược lại chặn mở modal
          const issuedAt = getOtpIssuedAt(emailKey)
          const stillValid = issuedAt && (Date.now() - issuedAt) < 5 * 60 * 1000
          // Hủy timer mở modal nếu có
          if (otpPopupTimerRef.current) { try { clearTimeout(otpPopupTimerRef.current) } catch {} ; otpPopupTimerRef.current = null }
          try { otpPopupTimersRef.current.forEach((id) => clearTimeout(id)); otpPopupTimersRef.current.clear() } catch {}
          setSendingOtp(false)
          if (stillValid) {
            blockOtpModalRef.current = false
            setShowAuth(true)
            setOtpSentStatus(lang === 'vi' ? 'Bạn đã yêu cầu quá nhiều lần. Hãy dùng mã OTP đã gửi trước đó (vẫn còn hiệu lực).' : 'Too many requests. Use the previously sent OTP (still valid).')
          } else {
            blockOtpModalRef.current = true
            setShowAuth(false)
            setOtpSendError(`Quá nhiều yêu cầu OTP. ${msg}`)
          }
          throw new Error(`Quá nhiều yêu cầu OTP. ${msg}`)
        }
        if (res.status === 403) {
          const retry = parseInt(res.headers.get('Retry-After') || '0', 10)
          const data = await res.json().catch(() => ({}))
          const base = data?.error || 'Tạm khóa do dấu hiệu tấn công'
          const msg = retry ? `${base}. Hãy thử lại sau ${retry}s` : base
          throw new Error(msg)
        }
        if (res.status === 401) {
          const data = await res.json().catch(() => ({}))
          if (data?.requireCaptcha && data?.captchaProvider === 'recaptcha_v3' && data?.siteKey) {
            try {
              const token = await executeRecaptchaV3(data.siteKey)
              return sendRequest({ captchaToken: token })
            } catch (e) {
              throw new Error('Xác minh CAPTCHA thất bại')
            }
          }
          throw new Error('Yêu cầu CAPTCHA hoặc lỗi xác thực')
        }
        if (!res.ok) {
          let msg = 'Gửi OTP thất bại'
          const ct = (res.headers.get('Content-Type') || '').toLowerCase()
          if (ct.includes('application/json')) {
            try {
              const data = await res.json()
              if (data && data.error) msg = data.error
            } catch {}
          } else {
            try {
              const text = await res.text()
              if (text) msg = text
            } catch {}
          }
          throw new Error(msg)
        }
        setOtpSentStatus(lang === 'vi' ? 'Mã OTP đã được gửi. Vui lòng kiểm tra email.' : 'OTP code sent. Please check your email.')
        // Ghi nhận thời điểm OTP đã gửi cho email này
        try { setOtpIssuedAt(emailKey, Date.now()) } catch {}
        return res.json().catch(() => ({}))
      })
      .catch((e) => {
        // Không hiển thị alert lỗi trong mọi trường hợp; chỉ log nội bộ
        const isAbort = e && (e.name === 'AbortError' || String(e).includes('AbortError'))
        if (isAbort || blockOtpModalRef.current || otpGuardCountdown > 0) return
        console.warn('OTP request error:', e?.message || e)
        // Hiển thị lỗi nhẹ dưới ô nhập email cho các lỗi thực sự (không phải abort/cooldown)
        setOtpSendError(e?.message || (lang === 'vi' ? 'Gửi OTP thất bại' : 'Send OTP failed'))
      })
  }

  // Countdown effect for rapid-click guard
  useEffect(() => {
    if (otpGuardCountdown <= 0) return
    const t = setInterval(() => {
      setOtpGuardCountdown((s) => {
        if (s <= 1) { clearInterval(t); blockOtpModalRef.current = false; return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [otpGuardCountdown])

  const verifyOtp = async () => {
    if (!otp) return alert('Vui lòng nhập mã OTP')
    setVerifyError('')
    try {
      const res = await fetch(`${API_BASE}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: String(otp || '').trim() }),
      })

      if (!res.ok) {
        let msg = lang === 'vi' ? 'Xác minh OTP thất bại' : 'Verify OTP failed'
        const ct = (res.headers.get('Content-Type') || '').toLowerCase()
        if (ct.includes('application/json')) {
          try {
            const data = await res.json()
            if (data && data.error) msg = data.error
          } catch {}
        } else {
          try {
            const text = await res.text()
            if (text) msg = text
          } catch {}
        }
        setVerifyError(msg)
        return
      }

      const data = await res.json().catch(() => ({}))
      const token = data && data.token ? data.token : ''
      if (!token) {
        setVerifyError(lang === 'vi' ? 'Token xác thực không hợp lệ' : 'Invalid auth token')
        return
      }

      setJwtToken(token)
      setIsAuthenticated(true)
      setShowAuth(false)
      navigate('#/dashboard')

      // Persist to cookies (30 days) with SameSite/Lax and Secure on HTTPS
      try {
        const maxAge = 60 * 60 * 24 * 30
        const baseAttr = `path=/; max-age=${maxAge}; SameSite=Lax`
        const secureAttr = (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:') ? '; Secure' : ''
        document.cookie = `auth_token=${encodeURIComponent(token)}; ${baseAttr}${secureAttr}`
        document.cookie = `auth_email=${encodeURIComponent(email)}; ${baseAttr}${secureAttr}`
      } catch {}
    } catch (e) {
      console.warn('verifyOtp error:', e)
      setVerifyError(lang === 'vi' ? 'Xác minh OTP thất bại' : 'Verify OTP failed')
    }
  }

  // Resend OTP with 15s cooldown
  const resendOtp = async () => {
    if (resendCountdown > 0) return
    await requestOtp()
    setResendCountdown(15)
  }

  const handleRenew = (item) => {
    // Mở popup Gia hạn ngay khi nhấn
    setRenewItem(item)
    try { if (renewOpenTimerRef.current) clearTimeout(renewOpenTimerRef.current) } catch {}
    try { setRenewOpening(false); setRenewOpeningId(null) } catch {}
    setShowRenew(true)
    try {
      setEventLogs((prev) => ([
        ...prev,
        {
          id: `log-${prev.length + 1}`,
          type: 'renew',
          time: new Date().toISOString(),
          item: { id: item.id, name: item.name, providerKey: item.providerKey, cycle: item.cycle },
          amount: item.cost || 0,
          client: clientInfo,
        },
      ]))
    } catch {}
  }

  const handleCancel = (providerKey) => {
    const item = masterData.find((m) => m.key === providerKey)
    const url = item?.cancelUrl || item?.renewUrl
    if (url) window.open(url, '_blank')
  }

  // Back to login button
  const handleBack = () => {
    // Chỉ quay về trang chủ, giữ nguyên phiên đăng nhập và token
    setShowAuth(false)
    navigate('#/')
  }

  // Logout to change login email
  const handleLogout = () => {
    try {
      setIsAuthenticated(false)
      setJwtToken('')
      setEmail('')
      // Không mở OTP modal sau khi đăng xuất
      setShowAuth(false)
      setShowClickGuard(false)
      setOtp('')
      setVerifyError('')
      setOtpSendError('')
      setOtpSentStatus('')
      setSendingOtp(false)
      setResendCountdown(0)
      setOtpGuardCountdown(0)
      // Hủy mọi timer/request OTP còn treo và chặn mở modal
      try { if (otpPopupTimerRef.current) { clearTimeout(otpPopupTimerRef.current); otpPopupTimerRef.current = null } } catch {}
      try { otpPopupTimersRef.current.forEach((id) => clearTimeout(id)); otpPopupTimersRef.current.clear() } catch {}
      try { otpRequestAbortSetRef.current.forEach((ctrl) => { try { ctrl.abort() } catch {} }); otpRequestAbortSetRef.current.clear() } catch {}
      try { if (otpRequestAbortRef.current) { otpRequestAbortRef.current.abort(); otpRequestAbortRef.current = null } } catch {}
      // Cho phép modal OTP hiển thị bình thường sau khi người dùng gửi lại
      blockOtpModalRef.current = false
      // Xóa cookies xác thực
      try {
        const baseAttr = 'path=/; SameSite=Lax'
        document.cookie = `auth_token=; max-age=0; ${baseAttr}`
        document.cookie = `auth_email=; max-age=0; ${baseAttr}`
      } catch {}
      navigate('#/')
    } catch {}
  }

  // Initialize sidebar width from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sidebarWidth')
      if (raw) {
        const n = parseInt(raw, 10)
        if (!Number.isNaN(n)) {
          const clamped = Math.min(480, Math.max(180, n))
          setSidebarWidth(clamped)
        }
      }
    } catch {}
  }, [])

  // Persist sidebar width when changed (only desktop and not collapsed)
  useEffect(() => {
    if (!isMobile && !isSidebarCollapsed) {
      try { localStorage.setItem('sidebarWidth', String(sidebarWidth)) } catch {}
    }
  }, [sidebarWidth, isMobile, isSidebarCollapsed])

  // Track viewport to determine mobile
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Default collapsed on mobile
  useEffect(() => {
    if (isMobile) setIsSidebarCollapsed(true)
  }, [isMobile])

  // Bỏ restore từ localStorage để luôn mặc định thu gọn khi tải trang

  // Persist sidebar collapsed toggle
  useEffect(() => {
    try { localStorage.setItem('toolx.sidebar.collapsed', String(isSidebarCollapsed)) } catch {}
  }, [isSidebarCollapsed])

  // Sidebar resizing handlers
  useEffect(() => {
    const onMove = (e) => {
      if (!resizing) return
      const next = Math.min(480, Math.max(180, e.clientX))
      setSidebarWidth(next)
    }
    const onUp = () => setResizing(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing])

  // Scroll to top visibility
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 200)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  // Theme toggle
  useEffect(() => {
    const root = document.documentElement
    if (themeDark) root.classList.add('theme-dark')
    else root.classList.remove('theme-dark')
    try { localStorage.setItem('toolx.theme', themeDark ? 'dark' : 'light') } catch {}
  }, [themeDark])

  // Start countdown when auth modal opens; clear when closes
  useEffect(() => {
    let id
    if (showAuth) {
      setResendCountdown(15)
      id = setInterval(() => {
        setResendCountdown((s) => (s > 0 ? s - 1 : 0))
      }, 1000)
    }
    return () => { if (id) clearInterval(id) }
  }, [showAuth])

  // Restore auth from cookies on load
  useEffect(() => {
    try {
      const cookies = document.cookie.split(';').map((c) => c.trim())
      const get = (name) => {
        const found = cookies.find((c) => c.startsWith(name + '='))
        return found ? decodeURIComponent(found.split('=')[1]) : ''
      }
      const token = get('auth_token')
      const savedEmail = get('auth_email')
      if (token) {
        setJwtToken(token)
        setIsAuthenticated(true)
        if (savedEmail) setEmail(savedEmail)
      }
    } catch {}
  }, [])

  // Persist and restore History grouping preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('toolx.history.group')
      if (saved === 'true' || saved === 'false') setHistoryGroupPref(saved === 'true')
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('toolx.history.group', String(historyGroupPref)) } catch {}
  }, [historyGroupPref])

  // Validate URL and set for preview when user pastes or presses Enter
  const trySetPreviewUrl = (raw) => {
    const s = (raw || '').trim()
    if (!s) { setLinkUrl(''); return }
    try { const u = new URL(s); setLinkUrl(u.toString()) } catch { setLinkUrl('') }
  }

  // Fetch client IP info for logging (best-effort)
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/')
        if (!res.ok) throw new Error('ipapi failed')
        const data = await res.json()
        setClientInfo({
          ip: data.ip || '',
          city: data.city || '',
          region: data.region || '',
          country: data.country_name || data.country || '',
          org: data.org || '',
        })
      } catch (e) {
        // Fallback minimal info
        setClientInfo((ci) => ({ ...ci, ip: ci.ip || '', city: ci.city || '', region: ci.region || '', country: ci.country || '' }))
      }
    }
    run()
  }, [])

  // Global paste listener: when user pastes a link anywhere, set preview URL
  useEffect(() => {
    const onPaste = async (e) => {
      try {
        let text = ''
        // Prefer clipboard API
        try { text = await navigator.clipboard.readText() } catch {}
        // Fallback to event clipboardData
        if (!text && e && e.clipboardData) {
          text = e.clipboardData.getData('text') || ''
        }
        if (text) trySetPreviewUrl(text)
      } catch {}
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

  const gridCols = isMobile ? '1fr' : (isSidebarCollapsed ? '0px 1fr' : `${sidebarWidth}px 1fr`)
  const KNOWN_ROUTES = ['#/', '#/dashboard', '#/active', '#/history', '#/2fa']

  return (
    <div className={`app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={{ gridTemplateColumns: gridCols }}>
      <a href="#main" className="skip-link">Bỏ qua menu, tới nội dung</a>
      <Sidebar
        projectName="ToolX"
        onStartResize={() => { if (!isSidebarCollapsed && !isMobile) setResizing(true) }}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
        labels={{ dashboard: t('nav_dashboard'), history: t('nav_history'), active: t('nav_active'), twofa: t('nav_2fa') }}
        onNavigate={(path) => navigate(path)}
        activePath={route}
        userEmail={email}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
      />
      <main id="main" className="main">
        <Header
          labels={{
            home: t('nav_home'),
            blog: t('nav_blog'),
            pricing: t('nav_pricing'),
            dashboard: t('nav_dashboard'),
            history: t('nav_history'),
            active: t('nav_active'),
            twofa: t('nav_2fa'),
          }}
          title={t('brand_name')}
          onSidebarToggle={!isMobile ? (() => setIsSidebarCollapsed(v => !v)) : null}
          rightSlot={(
            <div className="top-right-controls">
              <Switch
                value={themeDark ? 'right' : 'left'}
                onChange={(pos) => setThemeDark(pos === 'right')}
                leftIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" fill="currentColor"/><g stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></g></svg>}
                rightIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/></svg>}
                ariaLabel="Switch theme"
              />
              <Switch
                value={lang === 'en' ? 'left' : 'right'}
                onChange={(pos) => { const next = pos === 'left' ? 'en' : 'vi'; setLang(next); saveLanguage(next); }}
                leftLabel="EN"
                rightLabel="VI"
                ariaLabel="Language toggle"
              />
              {(route === '#/dashboard' || route === '#/active') && isAuthenticated && (
                <div className="header-actions" style={{ display: 'flex', gap: 8 }}>
                  <button className="chip-button" onClick={() => { setHistoryGroupPref((g) => !g); navigate('#/history') }} aria-label="Group logs">
                    <span className="chip-icon" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      </svg>
                    </span>
                    <span>{historyGroupPref ? 'Ungroup' : 'Group'}</span>
                  </button>
                  <div className="chip-dropdown" ref={menuTopRef}>
                    <button className="chip-button" onClick={() => setExportOpenTop((o) => !o)} aria-haspopup="menu" aria-expanded={exportOpenTop} aria-label="Export options">
                      <span className="chip-icon" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M12 3v10" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M8 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M4 19h16" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </span>
                      <span>Export</span>
                    </button>
                    {exportOpenTop && (
                      <div className="chip-menu" role="menu">
                        <button className="chip-menu-item" role="menuitem" onClick={() => { exportHistoryExcel(); setExportOpenTop(false) }}>
                          <span className="chip-icon" aria-hidden="true">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                              <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                          </span>
                          <span>Excel (.xlsx)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {(route === '#/dashboard' || route === '#/active') && isAuthenticated && exportOpenTop && (
                <div className="app-overlay" onClick={() => setExportOpenTop(false)} aria-hidden="true" />
              )}
            </div>
          )}
        />
        {/* Link Preview widget temporarily hidden; on paste show only message */}
        {linkUrl && (
          <div className="link-preview-widget" style={{ maxWidth: 720, margin: '12px auto' }}>
            <div style={{ fontWeight: 700 }}>
              ToolX - Manage your subcriptions more easier
            </div>
          </div>
        )}
        {(route === '#/dashboard' || route === '#/active') && isAuthenticated ? (
          <section className="dashboard">
            <div className="topbar">
              <Button variant="ghost" onClick={handleBack}>← {t('back')}</Button>
            </div>
            <DashboardList
              email={email}
              jwtToken={jwtToken}
              handleRenew={handleRenew}
              t={t}
              lang={lang}
              filterActive={route === '#/active'}
              renewOpening={renewOpening}
              renewOpeningId={renewOpeningId}
              statusOverride={route === '#/active' ? 'ON' : null}
              onToggleHistoryGroup={() => setHistoryGroupPref((g) => !g)}
              onNavigate={navigate}
              historyGroupPref={historyGroupPref}
              onEventLog={(payload) => {
                try {
                  setEventLogs((prev) => ([
                    ...prev,
                    {
                      id: `log-${prev.length + 1}`,
                      time: new Date().toISOString(),
                      client: clientInfo,
                      ...payload,
                    },
                  ]))
                } catch {}
              }}
            />
          </section>
        ) : route === '#/history' && isAuthenticated ? (
          <section className="dashboard">
            <div className="topbar">
              <Button variant="ghost" onClick={handleBack}>← {t('back')}</Button>
            </div>
            <HistoryList
              logs={eventLogs}
              email={email}
              locale={lang === 'vi' ? 'vi-VN' : 'en-US'}
              initialGroup={historyGroupPref}
              t={t}
            />
         </section>
        ) : route === '#/2fa' ? (
          <section className="dashboard">
            <div className="topbar">
              <Button variant="ghost" onClick={handleBack}>← {t('back')}</Button>
            </div>
            <div style={{ maxWidth: 1000, margin: '12px auto' }}>
              <h2 style={{ margin: '8px 0' }}>{t('totp_title')}</h2>
              <TotpGenerator t={t} />
            </div>
          </section>
        ) : (!KNOWN_ROUTES.includes(route)) ? (
          <NotFound onGoHome={() => navigate('#/')} />
        ) : (
          <section className="auth-section">
            <div className="brand-hero">
              <div className="brand-name">{t('brand_name')}</div>
              {(() => {
                const base = (import.meta?.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/'
                const logoUrlTag = `${base}toolx-logo.svg`
                return <img src={logoUrlTag} alt="ToolX logo" className="brand-logo" />
              })()}
              <div className="brand-slogan">{t('brand_slogan')}</div>
            </div>
            <div className="auth-core">
              <h1 className="title">
                {route === '#/' && (
                  <TypingText
                    text={lang === 'vi' ? 'Đăng nhập nhanh chóng với Email OTP' : 'Fast sign-in with Email OTP'}
                    speed={100}
                    startDelay={250}
                    repeat={true}
                    loopDelay={5000}
                  />
                )}
              </h1>
              <div className="auth-row">
                <Input
                  placeholder="Your Email"
                  value={email}
                  onChange={onEmailChange}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  size={emailChars}
                  style={{ width: `${emailChars}ch` }}
                  aria-invalid={!!emailError}
                  onKeyDown={(e) => { if (e.key === ' ') e.preventDefault() }}
                />
                <Button onClick={requestOtp} variant="primary" disabled={!email || !!emailError || sendingOtp || otpGuardCountdown > 0} loading={sendingOtp}>{t('send_otp')}</Button>
              </div>
              {emailError && (
                <p className="error" role="alert">{emailError}</p>
              )}
              {otpSendError && (
                <p className="error" role="alert">{otpSendError}</p>
              )}
              {otpSentStatus && (
                <p className="info">{otpSentStatus}</p>
              )}
              {!email && (
                <p className="note">{t('signin_note')}</p>
              )}
            </div>
          </section>
        )}
        <IpInfo />
        {/* Marquee near footer: only show on homepage */}
        {route === '#/' && (
          <div className="email-marquee" role="marquee" aria-label="Dòng chữ chạy ngang">
            <div className="email-marquee-track">
              <span className="email-marquee-item">CHAT GPT</span>
              <span className="email-marquee-item">GEMINI</span>
              <span className="email-marquee-item">CANVA</span>
              <span className="email-marquee-item">FIGMA</span>
              <span className="email-marquee-item">SPOTIFY</span>
              <span className="email-marquee-item">GOOGLE</span>
              <span className="email-marquee-item">YOUTUBE</span>
              {/* Duplicate for seamless loop */}
              <span className="email-marquee-item" aria-hidden="true">CHAT GPT</span>
              <span className="email-marquee-item" aria-hidden="true">GEMINI</span>
              <span className="email-marquee-item" aria-hidden="true">CANVA</span>
              <span className="email-marquee-item" aria-hidden="true">FIGMA</span>
              <span className="email-marquee-item" aria-hidden="true">SPOTIFY</span>
              <span className="email-marquee-item" aria-hidden="true">GOOGLE</span>
              <span className="email-marquee-item" aria-hidden="true">YOUTUBE</span>
            </div>
          </div>
        )}
        <Footer />
      </main>
      {/* Nút mở sidebar được chuyển lên Header thông qua props */}

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)}>
          <div className="modal-content">
            <h3>{t('otp_title')}</h3>
            {otpSentStatus && (
              <p className="info" aria-live="polite">{otpSentStatus}</p>
            )}
            <Input
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  verifyOtp()
                }
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
            />
            {verifyError && (
              <p className="error" role="alert">{verifyError}</p>
            )}
            <div className="modal-actions">
            <Button ref={confirmBtnRef} onClick={verifyOtp} variant="primary">{t('confirm')}</Button>
              <Button onClick={resendOtp} variant="ghost" disabled={resendCountdown > 0}>
                {t('resend')}{resendCountdown > 0 ? ` (${resendCountdown}s)` : ''}
              </Button>
              <Button onClick={() => setShowAuth(false)} variant="ghost">{t('cancel')}</Button>
            </div>
          </div>
        </AuthModal>
      )}

      {showClickGuard && (
        <AuthModal onClose={() => setShowClickGuard(false)}>
          <div className="modal-content">
            <h3>Cảnh báo</h3>
            <p>Bạn thao tác quá nhanh. vui lòng thử lại</p>
            <div className="modal-actions">
              <Button variant="primary" onClick={() => setShowClickGuard(false)}>Đã hiểu</Button>
            </div>
          </div>
        </AuthModal>
      )}

      {showRenew && renewItem && (
            <AuthModal wide onClose={() => { setShowRenew(false); setRenewItem(null); setRenewCoupon(''); setRenewDiscount(0); setCouponMsg(''); try { if (renewOpenTimerRef.current) { clearTimeout(renewOpenTimerRef.current); renewOpenTimerRef.current = null } } catch {}; try { setRenewOpening(false); setRenewOpeningId(null) } catch {} }}>
          {(() => {
            const formatVnd = (v) => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0)
            const subtotal = Math.max(0, Number(renewItem.cost) || 0)
            const discount = Math.min(subtotal, Math.max(0, Number(renewDiscount) || 0))
            const total = Math.max(0, subtotal - discount)
            // Thêm email và ngày tháng vào mô tả chuyển khoản để dễ kiểm tra
            const dateStr = new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
            const emailStr = String(email || '').trim() || (lang === 'vi' ? 'khach' : 'guest')
            const desRaw = `Gia hạn ${renewItem.name} - ToolX | ${emailStr} | ${dateStr}`
            const des = encodeURIComponent(desRaw)
            const qrUrl = `https://qr.sepay.vn/img?acc=${encodeURIComponent(PAYMENT.account)}&bank=${encodeURIComponent(PAYMENT.bank)}&amount=${total}&des=${des}`

            const applyCoupon = () => {
              const code = String(renewCoupon || '').trim().toUpperCase()
              let d = 0
              let msg = ''
              if (!code) {
                setCouponMsg(lang === 'vi' ? 'Vui lòng nhập mã' : 'Please enter a code')
                setRenewDiscount(0)
                return
              }
              if (code === 'SAVE10') {
                d = Math.round(subtotal * 0.1)
                msg = lang === 'vi' ? 'Áp dụng giảm 10%' : '10% off applied'
              } else if (code === 'NEW50K') {
                if (subtotal >= 100000) {
                  d = 50000
                  msg = lang === 'vi' ? 'Giảm 50.000đ' : '50,000₫ off'
                } else {
                  d = 0
                  msg = lang === 'vi' ? 'Đơn tối thiểu 100.000đ' : 'Min order 100,000₫'
                }
              } else if (code === 'DEMO') {
                d = subtotal
                msg = lang === 'vi' ? 'Mã demo: miễn phí' : 'Demo code: free'
              } else {
                d = 0
                msg = lang === 'vi' ? 'Mã không hợp lệ' : 'Invalid code'
              }
              setRenewDiscount(Math.min(subtotal, Math.max(0, d)))
              setCouponMsg(msg)
            }

            return (
              <div className="modal-content checkout-modal">
                <div className="checkout-header">
                  <div className="brand-pill">{renewItem.providerKey ? String(renewItem.providerKey).toUpperCase() : 'SUBSCRIPTION'}</div>
                  <h3 style={{ marginTop: 6, marginBottom: 4 }}>{lang === 'vi' ? 'Thanh toán gia hạn' : 'Renewal Payment'}</h3>
                  <p className="muted" style={{ marginTop: 0 }}>{lang === 'vi' ? 'Thanh toán an toàn qua VietQR – không lưu thẻ.' : 'Secure VietQR payment – no card stored.'}</p>
                </div>
                <div className="checkout-grid">
                  <div className="summary-card">
                    <div className="row">
                      <div className="label">{lang === 'vi' ? 'Dịch vụ' : 'Service'}</div>
                      <div className="value">{renewItem.name}</div>
                    </div>
                    <div className="row">
                      <div className="label">{lang === 'vi' ? 'Chu kỳ' : 'Cycle'}</div>
                      <div className="value">{cycleLabel(renewItem.cycle)}</div>
                    </div>
                    <div className="row">
                      <div className="label">{lang === 'vi' ? 'Tạm tính' : 'Subtotal'}</div>
                      <div className="value">{formatVnd(subtotal)}</div>
                    </div>
                    <div className="coupon-row">
                      <input
                        className="input"
                        placeholder={lang === 'vi' ? 'Nhập mã giảm giá' : 'Enter coupon'}
                        value={renewCoupon}
                        onChange={(e) => setRenewCoupon(e.target.value)}
                        aria-label={lang === 'vi' ? 'Mã giảm giá' : 'Coupon code'}
                      />
                      <button className="chip-button" onClick={applyCoupon}>{lang === 'vi' ? 'Áp dụng' : 'Apply'}</button>
                    </div>
                    {couponMsg ? (
                      <p className="coupon-msg" aria-live="polite">{couponMsg}</p>
                    ) : null}
                    {discount > 0 ? (
                      <div className="row discount">
                        <div className="label">{lang === 'vi' ? 'Giảm giá' : 'Discount'}</div>
                        <div className="value">- {formatVnd(discount)}</div>
                      </div>
                    ) : null}
                    <div className="totals-row">
                      <div className="label">{lang === 'vi' ? 'Tổng thanh toán' : 'Total'}</div>
                      <div className="value total">{formatVnd(total)}</div>
                    </div>
                    <p className="muted" style={{ marginTop: 8 }}>
                      {lang === 'vi' ? 'Giá đã bao gồm phí chuyển khoản nếu có.' : 'Price includes transfer fees if any.'}
                    </p>
                  </div>
                  <div className="pay-card">
                    <div className="pay-methods">
                      <button className={`chip-button ${payMethod === 'qr' ? 'active' : ''}`} onClick={() => setPayMethod('qr')}>VietQR</button>
                      <button className="chip-button" disabled>Card (coming soon)</button>
                    </div>
                    <div className="qr-box">
                      <img src={qrUrl} alt="QR chuyển khoản VietQR" className="qr-img" />
                    </div>
                    <p className="muted" style={{ textAlign: 'center' }}>
                      {lang === 'vi' ? 'Quét mã bằng app ngân hàng để hoàn tất.' : 'Scan with banking app to finish.'}
                    </p>
                    {(() => {
                      const generateConfirmImage = async () => {
                        try { setConfirmLocked(true); setConfirmState('loading') } catch {}
                        try {
                          const w = 1240, h = 880
                          const canvas = document.createElement('canvas')
                          canvas.width = w; canvas.height = h
                          const ctx = canvas.getContext('2d')

                          // Helpers
                          const now = new Date()
                          const emailSafe = (emailStr || (lang === 'vi' ? 'khach' : 'guest')).replace(/[^a-zA-Z0-9._-]/g, '_')
                          const dateLong = now.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' })
                          const timeStr = now.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                          const invoiceNo = `INV${now.getTime().toString().slice(-8)}`
                          const clientName = (clientInfo && clientInfo.name) ? clientInfo.name : (emailStr ? emailStr.split('@')[0] : (lang === 'vi' ? 'Khách hàng' : 'Customer'))

                          // Background
                          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h)

                          // Top header
                          ctx.fillStyle = '#111827'
                          ctx.font = 'bold 36px Inter, Arial, sans-serif'
                          ctx.textAlign = 'right'
                          ctx.fillText(lang === 'vi' ? 'HÓA ĐƠN' : 'TAX INVOICE', w - 40, 140)
                          ctx.font = '16px Inter, Arial, sans-serif'
                          ctx.fillText((lang === 'vi' ? 'Thanh toán qua VietQR' : 'Payment via VietQR'), w - 40, 170)
                          ctx.fillText(`${lang === 'vi' ? 'MBBank' : 'MBBank'} • ${PAYMENT.account}`, w - 40, 196)

                          // Company block (top-right small)
                          ctx.font = '14px Inter, Arial, sans-serif'
                          ctx.textAlign = 'right'
                          ctx.fillText('TOOLX', w - 40, 40)
                          ctx.fillText(`${lang === 'vi' ? 'Website' : 'Website'}: toolx.local`, w - 40, 62)
                          ctx.fillText(`${lang === 'vi' ? 'Mã số thuế' : 'Tax Registration Number'} : —`, w - 40, 84)

                          // Logo (top-left)
                          const logo = new Image()
                          const base = (import.meta?.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/'
                          const logoUrl = `${base}toolx-logo.svg`
                          logo.src = logoUrl
                          logo.decoding = 'async'
                          logo.loading = 'eager'

                          // Bill To section (left)
                          ctx.textAlign = 'left'
                          ctx.font = 'bold 16px Inter, Arial, sans-serif'
                          ctx.fillText(lang === 'vi' ? 'Thông tin hóa đơn' : 'Bill To', 40, 220)
                          ctx.font = '14px Inter, Arial, sans-serif'
                          const leftStartY = 250
                          const leftLines = [
                            [lang === 'vi' ? 'Tên khách hàng' : 'Client Name', clientName],
                            [lang === 'vi' ? 'Email hóa đơn' : 'Billing Email', emailStr || (lang === 'vi' ? 'khách' : 'guest')],
                            [lang === 'vi' ? 'Nội dung' : 'Description', desRaw],
                          ]
                          let y = leftStartY
                          leftLines.forEach(([label, val]) => {
                            ctx.fillStyle = '#374151'; ctx.fillText(`${label}`, 40, y)
                            ctx.fillStyle = '#111827'; ctx.fillText(`: ${val}`, 180, y)
                            y += 26
                          })

                          // Invoice info (right)
                          ctx.font = 'bold 16px Inter, Arial, sans-serif'
                          ctx.fillStyle = '#111827';
                          ctx.fillText(lang === 'vi' ? 'Thông tin chứng từ' : 'Invoice Info', w - 500, 220)
                          ctx.font = '14px Inter, Arial, sans-serif'
                          const rightStartX = w - 500
                          let ry = 250
                          const infoLines = [
                            [lang === 'vi' ? 'Số chứng từ' : 'Invoice No.', invoiceNo],
                            [lang === 'vi' ? 'Ngày chứng từ' : 'Invoice Date', `${dateLong}`],
                            [lang === 'vi' ? 'Giờ' : 'Time', `${timeStr}`],
                            [lang === 'vi' ? 'Hình thức' : 'Method', `${lang === 'vi' ? 'VietQR' : 'VietQR'} • ${PAYMENT.bank}`],
                          ]
                          infoLines.forEach(([label, val]) => {
                            ctx.fillStyle = '#374151'; ctx.fillText(`${label}`, rightStartX, ry)
                            ctx.fillStyle = '#111827'; ctx.fillText(`: ${val}`, rightStartX + 140, ry)
                            ry += 26
                          })

                          // Table header
                          const tableX = 40, tableY = 340, tableW = w - 80, rowH = 42
                          ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1
                          ctx.strokeRect(tableX, tableY, tableW, rowH)
                          ctx.font = 'bold 14px Inter, Arial, sans-serif'
                          ctx.fillStyle = '#111827'
                          ctx.fillText(lang === 'vi' ? 'Diễn giải' : 'Description', tableX + 12, tableY + 28)
                          ctx.textAlign = 'right'
                          ctx.fillText(lang === 'vi' ? 'Số tiền (VND)' : 'Amount in VND', tableX + tableW - 12, tableY + 28)
                          ctx.textAlign = 'left'

                          // Table row — single item
                          const rowY = tableY + rowH
                          ctx.strokeRect(tableX, rowY, tableW, rowH)
                          ctx.font = '14px Inter, Arial, sans-serif'
                          ctx.fillStyle = '#111827'
                          const desc = `${renewItem.name} — ${cycleLabel(renewItem.cycle)}`
                          ctx.fillText(desc, tableX + 12, rowY + 26)
                          ctx.textAlign = 'right'
                          ctx.fillText(`${formatVnd(total)}`, tableX + tableW - 12, rowY + 26)
                          ctx.textAlign = 'left'

                          // Totals block
                          const totalsY = rowY + rowH + 20
                          ctx.font = '14px Inter, Arial, sans-serif'
                          ctx.fillStyle = '#111827'
                          ctx.fillText(`${lang === 'vi' ? 'Tạm tính' : 'Subtotal'}: ${formatVnd(subtotal)}`, w - 380, totalsY)
                          ctx.fillText(`${lang === 'vi' ? 'Giảm giá' : 'Discount'}: ${discount > 0 ? formatVnd(discount) : (lang === 'vi' ? 'Không' : 'None')}`, w - 380, totalsY + 26)
                          ctx.font = 'bold 16px Inter, Arial, sans-serif'
                          ctx.fillText(`${lang === 'vi' ? 'Tổng thanh toán' : 'Total Amount Due'}: ${formatVnd(total)}`, w - 380, totalsY + 56)

                          // Bank details / remarks
                          const remY = totalsY + 100
                          ctx.font = 'bold 14px Inter, Arial, sans-serif'
                          ctx.fillStyle = '#111827'
                          ctx.fillText(lang === 'vi' ? 'Ghi chú' : 'Remarks', 40, remY)
                          ctx.font = '13px Inter, Arial, sans-serif'
                          ctx.fillStyle = '#374151'
                          const remarkLines = [
                            `${lang === 'vi' ? 'Ngân hàng' : 'Bank'}: ${PAYMENT.bank}`,
                            `${lang === 'vi' ? 'Số tài khoản' : 'Account'}: ${PAYMENT.account}`,
                            `${lang === 'vi' ? 'Nội dung chuyển khoản' : 'Transfer description'}: ${desRaw}`,
                            `${lang === 'vi' ? 'Xác nhận do khách hàng tạo — dùng để đối chiếu tạm thời.' : 'Customer-generated confirmation — for temporary reconciliation.'}`,
                          ]
                          let ry2 = remY + 24
                          remarkLines.forEach((t) => { ctx.fillText(t, 40, ry2); ry2 += 22 })

                          const finalize = async () => {
                            const url = canvas.toDataURL('image/png')
                            const fnameBase = `toolx-confirm-${now.toISOString().slice(0,10)}-${emailSafe}`
                            try {
                              setConfirmUrl(url)
                              setConfirmFileName(`${fnameBase}.png`)
                            } catch {}

                            try {
                              const order = {
                                invoiceNo,
                                email: emailStr || (lang === 'vi' ? 'khach' : 'guest'),
                                time: now.toISOString(),
                                total,
                                prevExpiry: renewItem.nextBillingDate || '',
                                item: { id: renewItem.id, name: renewItem.name, providerKey: renewItem.providerKey, cycle: renewItem.cycle },
                              }
                              await fetch(`${API_BASE}/notify/confirm`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ order }),
                              })
                            } catch {}

                            try {
                              setTimeout(() => { setConfirmState('success') }, 3000)
                            } catch {}
                          }

                          logo.onload = () => { try { ctx.drawImage(logo, 40, 32, 120, 120) } catch {} finalize() }
                          logo.onerror = (err) => { try { console.warn('Logo load failed', err, 'url=', logoUrl) } catch {} finalize() }

                          try {
                            setEventLogs((prev) => ([
                              ...prev,
                              {
                                id: `log-${prev.length + 1}`,
                                type: 'confirm',
                                time: now.toISOString(),
                                item: { id: renewItem.id, name: renewItem.name, providerKey: renewItem.providerKey, cycle: renewItem.cycle },
                                amount: total,
                                client: clientInfo,
                              },
                            ]))
                          } catch {}
                        } catch (e) {
                          // Nếu có lỗi khi tạo ảnh, cho phép bấm lại
                          try { setConfirmState('idle'); setConfirmLocked(false); setConfirmUrl(''); setConfirmFileName('') } catch {}
                        }
                      }
                      const downloadConfirmImage = () => {
                        try {
                          if (!confirmUrl) return
                          const a = document.createElement('a')
                          a.href = confirmUrl
                          a.download = confirmFileName || 'toolx-confirm.png'
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                        } catch (e) {
                          try { window.open(confirmUrl, '_blank') } catch {}
                        }
                      }
                      return (
                        <div className="modal-actions" style={{ justifyContent: 'center' }}>
                          {confirmState !== 'success' && (
                            <Button
                              type="button"
                              variant="primary"
                              className={confirmState === 'success' ? 'btn-success success-glow' : ''}
                              onClick={generateConfirmImage}
                              disabled={confirmState === 'loading' || confirmLocked}
                            >
                              {confirmState === 'loading' ? (
                                <>
                                  <span className="chip-icon" aria-hidden="true">
                                    <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
                                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3"/>
                                    </svg>
                                  </span>
                                  <span>Đang xác nhận...</span>
                                </>
                              ) : (
                                <span>{lang === 'vi' ? 'Xác nhận đã chuyển khoản' : 'Confirm Transfer'}</span>
                              )}
                            </Button>
                          )}
                          {confirmState === 'success' && (
                            <Button type="button" variant="primary" onClick={downloadConfirmImage} disabled={!confirmUrl}>
                              <span className="chip-icon" aria-hidden="true">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 3v10" stroke="currentColor" strokeWidth="1.5"/>
                                  <path d="M8 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                                  <path d="M4 19h16" stroke="currentColor" strokeWidth="1.5"/>
                                </svg>
                              </span>
                              <span>Tải hóa đơn</span>
                            </Button>
                          )}
                          <Button onClick={() => { setShowRenew(false); setRenewItem(null); setRenewCoupon(''); setRenewDiscount(0); setCouponMsg(''); setConfirmState('idle'); setConfirmLocked(false); setConfirmUrl(''); setConfirmFileName('') }}>
                            {lang === 'vi' ? 'Đóng' : 'Close'}
                          </Button>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )
          })()}
        </AuthModal>
      )}

      {showScrollTop && (
        <button className="scroll-top" onClick={scrollToTop} aria-label="Cuộn lên đầu">↑</button>
      )}

      {/* Zalo contact button fixed bottom-left */}
      <a
        href="https://zalo.me/84868313936"
        className="zalo-fab"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Liên hệ Zalo"
        title="Liên hệ Zalo"
      >
        <span className="zalo-fab-text">Z</span>
      </a>
    </div>
  )
}

function DashboardList({ email, jwtToken, handleRenew, t, lang, filterActive = false, statusOverride = null, onEventLog, onToggleHistoryGroup, onNavigate, historyGroupPref, renewOpening, renewOpeningId }) {
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [chartMetric, setChartMetric] = React.useState('percent') // 'percent' | 'amount'
  const [showCancel, setShowCancel] = React.useState(false)
  const [cancelItem, setCancelItem] = React.useState(null)
  const [confirmCountdown, setConfirmCountdown] = React.useState(15)
  const confirmTimerRef = React.useRef(null)
  const [exportOpenDash, setExportOpenDash] = React.useState(false)
  const menuDashRef = React.useRef(null)
  const [groupDash, setGroupDash] = React.useState(false)
  // Hàm lấy dữ liệu subscriptions, tái sử dụng cho load lần đầu và nút "Làm mới"
  const fetchSubscriptions = React.useCallback(async () => {
    setLoading(true)
    try {
      const emailKey = String(email || '').trim().toLowerCase()
      // Chế độ demo: nạp dữ liệu mẫu, bỏ qua gọi API
      let list = []
      if (emailKey === 'demo@domain.com') {
        list = mockSubscriptions
      } else {
        const headers = {}
        if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`
        const res = await fetch(`${API_BASE}/subscriptions?email=${encodeURIComponent(email)}`, { headers })
        if (res && res.ok) {
          const data = await res.json()
          list = Array.isArray(data.subscriptions) ? data.subscriptions : []
        } else {
          list = []
        }
      }

      const today = new Date()
      const yyyy = String(today.getFullYear())
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const todayStr = `${yyyy}-${mm}-${dd}`

      const normalized = list.map((s, idx) => ({
        id: `sub-${idx + 1}`,
        name: s.name,
        startDate: todayStr,
        cycle: s.cycle || 'month',
        nextBillingDate: s.nextBillingDate,
        cost: s.cost,
        status: s.status,
        providerKey: providerKeyFromName(s.name),
      }))
      setItems(normalized)
      setLoading(false)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }, [email, jwtToken])
  React.useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  // Restore and persist chart display preference
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('toolx.chart.metric')
      if (saved === 'percent' || saved === 'amount') setChartMetric(saved)
    } catch {}
  }, [])
  React.useEffect(() => {
    try { localStorage.setItem('toolx.chart.metric', chartMetric) } catch {}
  }, [chartMetric])

  // Restore/persist dashboard grouping preference
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('toolx.dashboard.group')
      if (saved === '1') setGroupDash(true)
      else if (saved === '0') setGroupDash(false)
    } catch {}
  }, [])
  React.useEffect(() => {
    try { localStorage.setItem('toolx.dashboard.group', groupDash ? '1' : '0') } catch {}
  }, [groupDash])

  React.useEffect(() => {
    return () => {
      if (confirmTimerRef.current) { clearInterval(confirmTimerRef.current); confirmTimerRef.current = null }
    }
  }, [])

  // Đóng dropdown Export (trên Dashboard) khi click ra ngoài
  React.useEffect(() => {
    const onDocClick = (e) => {
      if (!menuDashRef.current) return
      if (!menuDashRef.current.contains(e.target)) setExportOpenDash(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const isCurrentlyUsed = (s) => {
    if (s.canceled) return false
    const statusOk = s.status === 'active' || s.status === 'warning' || !s.status
    let dateOk = false
    try {
      const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s.nextBillingDate || '')
      let d
      if (m) { d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) } else if (s.nextBillingDate) { d = new Date(s.nextBillingDate) }
      if (d && !isNaN(d.getTime())) {
        const today = new Date(); today.setHours(0,0,0,0)
        dateOk = d.getTime() >= today.getTime()
      }
    } catch {}
    // Bao quát hơn: coi là "đang dùng" nếu trạng thái tích cực HOẶC còn hạn
    return statusOk || dateOk
  }
  let viewItems = items
  if (filterActive) {
    viewItems = items.filter(isCurrentlyUsed)
  } else {
    const used = items.filter(isCurrentlyUsed)
    const others = items.filter((s) => !isCurrentlyUsed(s))
    viewItems = [...used, ...others]
  }
  // Helpers for grouping keys and labels
  const getGroupKey = React.useCallback((it) => it.providerKey || providerKeyFromName(it.name || ''), [])
  const getGroupLabel = React.useCallback((it) => {
    const key = getGroupKey(it)
    const label = key && key !== 'generic' ? key : (it.name || 'Khác')
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [getGroupKey])
  const total = viewItems.reduce((sum, s) => sum + (s.cost || 0), 0)
  return (
    <>
      <TotalCostHeader total={total} title={t('total_title')} subtitle={t('total_subtitle')} />
      {/* Biểu đồ tỉ trọng chi phí theo dịch vụ */}
      {loading ? (
        <div className="donut-card skeleton skeleton-shimmer" aria-hidden="true" style={{ height: 220 }} />
      ) : (
        <>
          <PieDonutChart
            items={viewItems}
            title={lang === 'vi' ? 'Tỉ trọng chi phí theo dịch vụ' : 'Cost share by service'}
            metric={chartMetric}
            controlsSlot={(
              <>
                <label htmlFor="chartMetricSelect" className="pagination-size-label" style={{ margin: 0 }}>Hiển thị</label>
                <select
                  id="chartMetricSelect"
                  className="chip-select"
                  value={chartMetric}
                  onChange={(e) => setChartMetric(e.target.value)}
                  aria-label="Tùy chọn hiển thị biểu đồ"
                >
                  <option value="percent">Phần trăm</option>
                  <option value="amount">VND</option>
                </select>
              </>
            )}
          />
        </>
      )}
      {loading ? (
        <div className="usage-list" aria-hidden="true" style={{ maxWidth: 960, margin: '12px auto' }}>
          {[...Array(5)].map((_, i) => (
            <div key={`sk-${i}`} style={{ display: 'grid', gridTemplateColumns: '60px 1.8fr 1fr 1.2fr 1fr 2fr', gap: 6, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--row-border, #eef0f3)', borderRadius: 8, marginBottom: 8 }}>
              <div className="skeleton-line" style={{ width: 28 }} />
              <div className="skeleton-line" style={{ width: '60%' }} />
              <div className="skeleton-line" style={{ width: '40%' }} />
              <div className="skeleton-line" style={{ width: '50%' }} />
              <div className="skeleton-line" style={{ width: '35%' }} />
              <div className="skeleton-line" style={{ width: '70%' }} />
            </div>
          ))}
        </div>
      ) : viewItems.length === 0 ? (
        <div className="usage-list" style={{ maxWidth: 960, margin: '12px auto' }}>
          <div className="usage-row">
            <div className="usage-col" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--muted-foreground)' }}>
              Chưa có dữ liệu cho email này.
              <br />
              Với bản demo, thử "user@example.com" hoặc "demo@domain.com" để xem danh sách mẫu.
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => { try { window.location.hash = '#/'; } catch {} }}>Quay lại Trang chủ</Button>
          </div>
        </div>
      ) : (
        <>
          {/* Thanh hành động phía trên bảng */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, margin: '0 0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="chip-button"
                onClick={fetchSubscriptions}
                disabled={loading}
                aria-label="Làm mới dữ liệu"
                title="Làm mới dữ liệu"
              >
                <span className="chip-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5a7 7 0 1 1-4.95 2.05" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M4 7h4V3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                </span>
                <span>{loading ? 'Đang tải…' : 'Làm mới'}</span>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="chip-button"
                onClick={() => setGroupDash((v) => !v)}
                aria-label="Group subscriptions"
              >
                <span className="chip-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                </span>
                <span>{groupDash ? 'Ungroup' : 'Group'}</span>
              </button>
              <div className="chip-dropdown" ref={menuDashRef}>
                <button
                  className="chip-button"
                  onClick={() => setExportOpenDash((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={exportOpenDash}
                  aria-label="Export options"
                >
                  <span className="chip-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3v10" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M8 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </span>
                  <span>Export</span>
                </button>
                {exportOpenDash && (
                  <div className="chip-menu" role="menu">
                    <button
                      className="chip-menu-item"
                      role="menuitem"
                      onClick={() => { exportDashboardExcel(); setExportOpenDash(false) }}
                    >
                      <span className="chip-icon" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </span>
                      <span>Excel (.xlsx)</span>
                    </button>
                  </div>
                )}
              </div>
              {exportOpenDash && (
                <div className="app-overlay" onClick={() => setExportOpenDash(false)} aria-hidden="true" />
              )}
            </div>
          </div>

          <UsageList
           items={viewItems}
           locale={lang === 'vi' ? 'vi-VN' : 'en-US'}
            onReorder={(next) => setItems(next)}
            onRenew={(item) => handleRenew(item)}
            renewOpening={renewOpening}
            renewOpeningId={renewOpeningId}
            statusOverride={statusOverride}
            groupMode={groupDash}
            getGroupKey={getGroupKey}
            getGroupLabel={getGroupLabel}
          onCancel={(item) => {
            setCancelItem(item)
            setShowCancel(true)
            setConfirmCountdown(15)
             if (confirmTimerRef.current) { clearInterval(confirmTimerRef.current) }
             confirmTimerRef.current = setInterval(() => {
               setConfirmCountdown((c) => {
                 const next = c > 0 ? c - 1 : 0
                 if (next === 0 && confirmTimerRef.current) {
                   clearInterval(confirmTimerRef.current)
                   confirmTimerRef.current = null
                 }
                 return next
               })
             }, 1000)
           }}
        />
        </>
      )}

      {/* Loại bỏ nhóm/ xuất ở cuối bảng vì đã chuyển lên đầu theo cột */}

      {showCancel && cancelItem && (
        <AuthModal onClose={() => {
          setShowCancel(false)
          setCancelItem(null)
          if (confirmTimerRef.current) { clearInterval(confirmTimerRef.current); confirmTimerRef.current = null }
        }}>
          <div className="modal-content">
            <h3 style={{ marginTop: 0, textAlign: 'center' }}>Hủy gói</h3>
            <p style={{ textAlign: 'center', margin: '8px 0 16px' }}>Bạn có chắc chắn muốn hủy gói?</p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <Button
                variant="primary"
                disabled={confirmCountdown > 0}
                onClick={() => {
                  setItems((prev) => prev.map((s) => s.id === cancelItem.id ? { ...s, canceled: true } : s))
                  if (typeof window !== 'undefined' && typeof window.__onEventLog === 'function') { /* no-op for safety */ }
                  if (typeof onEventLog === 'function') {
                    try {
                      onEventLog({
                        type: 'cancel',
                        item: { id: cancelItem.id, name: cancelItem.name, providerKey: cancelItem.providerKey, cycle: cancelItem.cycle },
                        amount: cancelItem.cost || 0,
                      })
                    } catch {}
                  }
                  setShowCancel(false)
                  setCancelItem(null)
                  if (confirmTimerRef.current) { clearInterval(confirmTimerRef.current); confirmTimerRef.current = null }
                }}
              >{`Chắc chắn (${confirmCountdown}s)`}</Button>
              <Button variant="ghost" onClick={() => { setShowCancel(false); setCancelItem(null) }}>Đóng</Button>
            </div>
          </div>
        </AuthModal>
      )}
    </>
  )
}

function providerKeyFromName(name = '') {
  const lower = String(name || '').toLowerCase().trim()
  // Explicit known providers
  if (lower.includes('spotify')) return 'spotify'
  if (lower.includes('netflix')) return 'netflix'
  if (lower.includes('openai')) return 'openai'
  if (lower.includes('gemini')) return 'gemini'
  if (lower.includes('claude')) return 'claude'
  // Heuristic: remove common plan descriptors to get a base vendor token
  const cleaned = lower
    .replace(/\b(plus|premium|pro|standard|basic|family|plan|monthly|yearly|annual|gói|dịch vụ|package|bundle)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  const vendor = (cleaned.split(/\s+/)[0] || cleaned || 'other').trim()
  return vendor || 'other'
}

function HistoryList({ logs = [], locale = 'vi-VN', initialGroup = false, email = '', t: tProp }) {
  const t = typeof tProp === 'function' ? tProp : ((k) => k)
  const formatTime = (iso) => {
    try { return new Date(iso).toLocaleString(locale) } catch { return iso }
  }
  const formatVnd = (v) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(v) || 0)
  const [group, setGroup] = React.useState(false)
  const [exportOpen, setExportOpen] = React.useState(false)
  const menuRef = React.useRef(null)
  React.useEffect(() => { setGroup(Boolean(initialGroup)) }, [initialGroup])

  // Download TikTok-style invoice image for a given log
  const downloadInvoiceForLog = (log) => {
    try {
      const w = 1240, h = 880
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')

      const now = log?.time ? new Date(log.time) : new Date()
      const emailSafe = String(email || (locale.startsWith('vi') ? 'khach' : 'guest')).replace(/[^a-zA-Z0-9._-]/g, '_')
      const dateLong = now.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
      const timeStr = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
      const invoiceNo = `INV${now.getTime().toString().slice(-8)}`
      const clientName = (log?.client?.name) || (email ? String(email).split('@')[0] : (locale.startsWith('vi') ? 'Khách hàng' : 'Customer'))
      const cycleMapVi = { month: 'Theo tháng', year: 'Theo năm', day: 'Theo ngày' }
      const cycleMapEn = { month: 'Monthly', year: 'Yearly', day: 'Daily' }
      const cycleLabelLocal = (c) => (locale.startsWith('vi') ? cycleMapVi : cycleMapEn)[c] || (locale.startsWith('vi') ? 'Theo tháng' : 'Monthly')
      const serviceName = log?.item?.name || '-'
      const cycle = cycleLabelLocal(log?.item?.cycle)

      // Background
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h)

      // Header
      ctx.fillStyle = '#111827'
      ctx.font = 'bold 36px Inter, Arial, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(locale.startsWith('vi') ? 'HÓA ĐƠN' : 'TAX INVOICE', w - 40, 140)
      ctx.font = '16px Inter, Arial, sans-serif'
      ctx.fillText((locale.startsWith('vi') ? 'Thanh toán qua VietQR' : 'Payment via VietQR'), w - 40, 170)
      ctx.fillText(`MBBank • ${PAYMENT.account}`, w - 40, 196)

      // Company block
      ctx.font = '14px Inter, Arial, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('TOOLX', w - 40, 40)
      ctx.fillText(`${locale.startsWith('vi') ? 'Website' : 'Website'}: toolx.local`, w - 40, 62)
      ctx.fillText(`${locale.startsWith('vi') ? 'Mã số thuế' : 'Tax Registration Number'} : —`, w - 40, 84)

      // Logo
      const logo = new Image()
      const base = (import.meta?.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/'
      const logoUrl = `${base}toolx-logo.svg`
      logo.src = logoUrl
      logo.decoding = 'async'
      logo.loading = 'eager'

      // Bill To
      ctx.textAlign = 'left'
      ctx.font = 'bold 16px Inter, Arial, sans-serif'
      ctx.fillText(locale.startsWith('vi') ? 'Thông tin hóa đơn' : 'Bill To', 40, 220)
      ctx.font = '14px Inter, Arial, sans-serif'
      let y = 250
      const billLines = [
        [locale.startsWith('vi') ? 'Tên khách hàng' : 'Client Name', clientName],
        [locale.startsWith('vi') ? 'Email hóa đơn' : 'Billing Email', email || (locale.startsWith('vi') ? 'khách' : 'guest')],
        [locale.startsWith('vi') ? 'Diễn giải' : 'Description', `${serviceName} — ${cycle}`],
      ]
      billLines.forEach(([label, val]) => {
        ctx.fillStyle = '#374151'; ctx.fillText(`${label}`, 40, y)
        ctx.fillStyle = '#111827'; ctx.fillText(`: ${val}`, 180, y)
        y += 26
      })

      // Invoice info
      ctx.font = 'bold 16px Inter, Arial, sans-serif'
      ctx.fillStyle = '#111827'
      ctx.fillText(locale.startsWith('vi') ? 'Thông tin chứng từ' : 'Invoice Info', w - 500, 220)
      ctx.font = '14px Inter, Arial, sans-serif'
      let ry = 250
      const infoLines = [
        [locale.startsWith('vi') ? 'Số chứng từ' : 'Invoice No.', invoiceNo],
        [locale.startsWith('vi') ? 'Ngày chứng từ' : 'Invoice Date', `${dateLong}`],
        [locale.startsWith('vi') ? 'Giờ' : 'Time', `${timeStr}`],
        [locale.startsWith('vi') ? 'Hình thức' : 'Method', `VietQR • ${PAYMENT.bank}`],
      ]
      infoLines.forEach(([label, val]) => {
        ctx.fillStyle = '#374151'; ctx.fillText(`${label}`, w - 500, ry)
        ctx.fillStyle = '#111827'; ctx.fillText(`: ${val}`, w - 360, ry)
        ry += 26
      })

      // Table
      const tableX = 40, tableY = 340, tableW = w - 80, rowH = 42
      ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1
      ctx.strokeRect(tableX, tableY, tableW, rowH)
      ctx.font = 'bold 14px Inter, Arial, sans-serif'
      ctx.fillStyle = '#111827'
      ctx.fillText(locale.startsWith('vi') ? 'Diễn giải' : 'Description', tableX + 12, tableY + 28)
      ctx.textAlign = 'right'
      ctx.fillText(locale.startsWith('vi') ? 'Số tiền (VND)' : 'Amount in VND', tableX + tableW - 12, tableY + 28)
      ctx.textAlign = 'left'
      ctx.strokeRect(tableX, tableY + rowH, tableW, rowH)
      ctx.font = '14px Inter, Arial, sans-serif'
      ctx.fillStyle = '#111827'
      ctx.fillText(`${serviceName} — ${cycle}`, tableX + 12, tableY + rowH + 26)
      ctx.textAlign = 'right'
      ctx.fillText(`${formatVnd(log?.amount || 0)}`, tableX + tableW - 12, tableY + rowH + 26)
      ctx.textAlign = 'left'

      // Totals
      const totalsY = tableY + rowH * 2 + 20
      ctx.font = 'bold 16px Inter, Arial, sans-serif'
      ctx.fillText(`${locale.startsWith('vi') ? 'Tổng thanh toán' : 'Total Amount Due'}: ${formatVnd(log?.amount || 0)}`, w - 380, totalsY)

      // Remarks
      const remY = totalsY + 44
      ctx.font = 'bold 14px Inter, Arial, sans-serif'
      ctx.fillStyle = '#111827'
      ctx.fillText(locale.startsWith('vi') ? 'Ghi chú' : 'Remarks', 40, remY)
      ctx.font = '13px Inter, Arial, sans-serif'
      ctx.fillStyle = '#374151'
      let ry2 = remY + 24
      const remarkLines = [
        `${locale.startsWith('vi') ? 'Ngân hàng' : 'Bank'}: ${PAYMENT.bank}`,
        `${locale.startsWith('vi') ? 'Số tài khoản' : 'Account'}: ${PAYMENT.account}`,
        `${locale.startsWith('vi') ? 'Xác nhận do khách hàng tạo — dùng để đối chiếu tạm thời.' : 'Customer-generated confirmation — for temporary reconciliation.'}`,
      ]
      remarkLines.forEach((t) => { ctx.fillText(t, 40, ry2); ry2 += 22 })

      const finalize = () => {
        const url = canvas.toDataURL('image/png')
        const a = document.createElement('a')
        const fnameBase = `toolx-invoice-${now.toISOString().slice(0,10)}-${emailSafe}`
        a.href = url; a.download = `${fnameBase}.png`
        try {
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        } catch (e) {
          try { window.open(url, '_blank') } catch {}
        }
      }
      logo.onload = () => { try { ctx.drawImage(logo, 40, 32, 120, 120) } catch {} finalize() }
      logo.onerror = () => { finalize() }
    } catch (err) {
      try { console.error('Download invoice failed:', err) } catch {}
    }
  }

  const exportExcel = () => {
    try {
      let rows = logs.map((log, idx) => ({
        STT: idx + 1,
        DichVu: log.item?.name || '',
        HanhDong: log.type === 'cancel' ? 'Hủy gói' : 'Gia hạn',
        ThoiGian: formatTime(log.time),
        ThanhTien: typeof log.amount === 'number' ? Number(log.amount) : 0,
        IP: log.client?.ip || '',
        ThanhPho: log.client?.city || '',
        Vung: log.client?.region || '',
        QuocGia: log.client?.country || '',
      }))
      if (!rows.length) {
        rows = [{ STT: '', DichVu: '', HanhDong: '', ThoiGian: '', ThanhTien: 0, IP: '', ThanhPho: '', Vung: '', QuocGia: '' }]
      }
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'History')
      const today = new Date(); const dd = String(today.getDate()).padStart(2, '0'); const mm = String(today.getMonth() + 1).padStart(2, '0'); const yyyy = today.getFullYear()
      const emailSafe = String(email || '').replace(/[^a-zA-Z0-9@._-]+/g, '_') || 'guest'
      const filename = `ToolX-${emailSafe}- ${dd}${mm}${yyyy}.xlsx`
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true })
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('Xuất Excel thất bại')
    }
  }

  const renewLogs = logs.filter((l) => l.type !== 'cancel')
  const cancelLogs = logs.filter((l) => l.type === 'cancel')
  React.useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target)) setExportOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])
  return (
    <div>
      <div className="history-actions">
        <button className="chip-button" onClick={() => setGroup((g) => !g)} aria-label="Group logs">
          <span className="chip-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </span>
          <span>{group ? 'Ungroup' : 'Group'}</span>
        </button>
              <div className="chip-dropdown" ref={menuRef}>
                <button className="chip-button" onClick={() => setExportOpen((o) => !o)} aria-haspopup="menu" aria-expanded={exportOpen} aria-label="Export options">
            <span className="chip-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v10" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M4 19h16" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </span>
            <span>Export</span>
          </button>
                {exportOpen && (
                  <div className="chip-menu" role="menu">
                    <button className="chip-menu-item" role="menuitem" onClick={() => { exportExcel(); setExportOpen(false) }}>
                <span className="chip-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </span>
                <span>Excel (.xlsx)</span>
                    </button>
                  </div>
                )}
              </div>
              {exportOpen && (
                <div className="app-overlay" onClick={() => setExportOpen(false)} aria-hidden="true" />
              )}
      </div>
      <div className="usage-list history-list">
        {group && <div className="group-header">{t('history_group_renew')}</div>}
        {!group && (
          <div className="usage-header">
            <div className="usage-col">{t('col_index')}</div>
            <div className="usage-col">{t('col_service')}</div>
            <div className="usage-col">{t('col_action')}</div>
            <div className="usage-col">{t('col_time')}</div>
            <div className="usage-col">{t('col_amount')}</div>
            <div className="usage-col">{t('col_device')}</div>
            <div className="usage-col">{t('col_invoice')}</div>
          </div>
        )}
        {group && (
          <div className="usage-header">
            <div className="usage-col">{t('col_index')}</div>
            <div className="usage-col">{t('col_service')}</div>
            <div className="usage-col">{t('col_action')}</div>
            <div className="usage-col">{t('col_time')}</div>
            <div className="usage-col">{t('col_amount')}</div>
            <div className="usage-col">{t('col_device')}</div>
            <div className="usage-col">{t('col_invoice')}</div>
          </div>
        )}
      {(!group ? logs : renewLogs).length === 0 ? (
        <div className="usage-row">
          <div className="usage-col" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            {t('history_empty')}
          </div>
        </div>
      ) : (group ? renewLogs : logs).map((log, idx) => (
        <div className="usage-row" key={log.id || idx}>
          <div className="usage-col" aria-label={t('col_index')}>{idx + 1}</div>
          <div className="usage-col" aria-label={t('col_service')}>{log.item?.name || '-'}</div>
          <div className="usage-col" aria-label={t('col_action')}>{log.type === 'cancel' ? t('action_cancel') : t('action_renew')}</div>
          <div className="usage-col" aria-label={t('col_time')}>{formatTime(log.time)}</div>
          <div className="usage-col" aria-label={t('col_amount')}>{typeof log.amount === 'number' ? formatVnd(log.amount || 0) : '-'}</div>
          <div className="usage-col" aria-label={t('col_device')}>
            <div className="client-info">
              <span>{t('client_ip')}: {log.client?.ip || 'n/a'}</span>{' '}•{' '}
              <span>{t('client_city')}: {log.client?.city || 'n/a'}</span>{' '}•{' '}
              <span>{t('client_region')}: {log.client?.region || 'n/a'}</span>{' '}•{' '}
              <span>{t('client_country')}: {log.client?.country || 'n/a'}</span>
            </div>
          </div>
          <div className="usage-col" aria-label={t('col_invoice')} style={{ textAlign: 'right' }}>
            {log.type === 'cancel' ? (
              <span className="link-muted">—</span>
            ) : (
              <button type="button" className="chip-button" onClick={() => downloadInvoiceForLog(log)} aria-label="Tải hóa đơn">
                <span className="chip-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v10" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M4 19h16" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </span>
                <span>{t('invoice_download')}</span>
              </button>
            )}
          </div>
        </div>
      ))}
        {group && (
          <>
            <div className="group-header">{t('history_group_cancel')}</div>
            <div className="usage-header">
              <div className="usage-col">{t('col_index')}</div>
              <div className="usage-col">{t('col_service')}</div>
              <div className="usage-col">{t('col_action')}</div>
              <div className="usage-col">{t('col_time')}</div>
              <div className="usage-col">{t('col_amount')}</div>
              <div className="usage-col">{t('client_info')}</div>
            </div>
            {cancelLogs.length === 0 ? (
              <div className="usage-row">
                <div className="usage-col" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                  {t('cancel_none')}
                </div>
              </div>
            ) : cancelLogs.map((log, idx) => (
              <div className="usage-row" key={(log.id || idx) + '-cancel'}>
                <div className="usage-col" aria-label={t('col_index')}>{idx + 1}</div>
                <div className="usage-col" aria-label={t('col_service')}>{log.item?.name || '-'}</div>
                <div className="usage-col" aria-label={t('col_action')}>{t('action_cancel')}</div>
                <div className="usage-col" aria-label={t('col_time')}>{formatTime(log.time)}</div>
              <div className="usage-col" aria-label={t('col_amount')}>{typeof log.amount === 'number' ? formatVnd(log.amount || 0) : '-'}</div>
                <div className="usage-col" aria-label={t('col_device')}>
                  <div className="client-info">
                    <span>{t('client_ip')}: {log.client?.ip || 'n/a'}</span>{' '}•{' '}
                    <span>{t('client_city')}: {log.client?.city || 'n/a'}</span>{' '}•{' '}
                    <span>{t('client_region')}: {log.client?.region || 'n/a'}</span>{' '}•{' '}
                    <span>{t('client_country')}: {log.client?.country || 'n/a'}</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}