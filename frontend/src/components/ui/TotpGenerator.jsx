import React from 'react'

function base32ToBytes(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const map = {}
  for (let i = 0; i < alphabet.length; i++) map[alphabet[i]] = i
  const cleaned = (input || '').toUpperCase().replace(/\s+/g, '').replace(/=+$/g, '')
  let bits = 0
  let value = 0
  const out = []
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    const v = map[ch]
    if (v == null) continue
    value = (value << 5) | v
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((value >>> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

function counterToBytes(counter) {
  const buf = new ArrayBuffer(8)
  const view = new DataView(buf)
  const hi = Math.floor(counter / 0x100000000)
  const lo = counter >>> 0
  view.setUint32(0, hi)
  view.setUint32(4, lo)
  return new Uint8Array(buf)
}

async function computeTotp(secretBytes, counter, digits = 6) {
  if (!secretBytes || secretBytes.length === 0) return ''
  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const msg = counterToBytes(counter)
  const sig = await crypto.subtle.sign('HMAC', key, msg)
  const h = new Uint8Array(sig)
  const offset = h[h.length - 1] & 0x0f
  const code = ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | (h[offset + 3])
  const mod = 10 ** digits
  const otp = (code % mod).toString().padStart(digits, '0')
  return otp
}

export default function TotpGenerator({ t = (k) => k }) {
  const [secret, setSecret] = React.useState('')
  const [digits, setDigits] = React.useState(6)
  const [period, setPeriod] = React.useState(30)
  const [code, setCode] = React.useState('')
  const [left, setLeft] = React.useState(0)
  const [error, setError] = React.useState('')
  const [noSave, setNoSave] = React.useState(false)
  const [passphrase, setPassphrase] = React.useState('')

  const bytesToBase64 = (bytes) => {
    let binary = ''
    const arr = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes)
    for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i])
    return btoa(binary)
  }
  const base64ToBytes = (b64) => {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
  async function deriveKey(pass, salt) {
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey'])
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }
  async function encryptSecret(plain, pass) {
    const enc = new TextEncoder()
    const salt = new Uint8Array(16); crypto.getRandomValues(salt)
    const iv = new Uint8Array(12); crypto.getRandomValues(iv)
    const key = await deriveKey(pass, salt)
    const data = enc.encode(plain)
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
    return { c: bytesToBase64(new Uint8Array(ct)), iv: bytesToBase64(iv), s: bytesToBase64(salt), v: 1 }
  }
  async function decryptSecret(obj, pass) {
    const dec = new TextDecoder()
    const iv = base64ToBytes(obj.iv)
    const salt = base64ToBytes(obj.s)
    const ct = base64ToBytes(obj.c)
    const key = await deriveKey(pass, salt)
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
    return dec.decode(pt)
  }

  // Load behind-the-scenes config from session
  React.useEffect(() => {
    try {
      const ns = sessionStorage.getItem('toolx.totp.nosave') === '1'
      const pp = sessionStorage.getItem('toolx.totp.passphrase') || ''
      setNoSave(ns)
      setPassphrase(pp)
    } catch {}
  }, [])

  React.useEffect(() => {
    try {
      if (noSave) return
      // Load digits/period
      const d = parseInt(sessionStorage.getItem('toolx.totp.digits') || '6', 10)
      const p = parseInt(sessionStorage.getItem('toolx.totp.period') || '30', 10)
      if (d === 6 || d === 8) setDigits(d)
      if ([15, 20, 30, 60].includes(p)) setPeriod(p)
      // Load secret (encrypted preferred)
      const encJson = sessionStorage.getItem('toolx.totp.secret.enc')
      if (encJson) {
        const obj = JSON.parse(encJson)
        if (passphrase) {
          decryptSecret(obj, passphrase).then((plain) => {
            setSecret(plain)
            setError('')
          }).catch(() => {
            setError(t('totp_error_bad_passphrase'))
          })
          return
        } else {
          setError(t('totp_error_need_passphrase'))
        }
      } else {
        const s = sessionStorage.getItem('toolx.totp.secret') || ''
        if (s) setSecret(s)
      }
    } catch {}
  }, [noSave, passphrase])

  React.useEffect(() => {
    try {
      if (noSave) return
      sessionStorage.setItem('toolx.totp.digits', String(digits))
      sessionStorage.setItem('toolx.totp.period', String(period))
    } catch {}
  }, [digits, period, noSave])

  React.useEffect(() => {
    const run = async () => {
      try {
        if (noSave) return
        // Save secret automatically: encrypt if passphrase exists
        if (passphrase) {
          const obj = await encryptSecret(secret, passphrase)
          sessionStorage.setItem('toolx.totp.secret.enc', JSON.stringify(obj))
          sessionStorage.removeItem('toolx.totp.secret')
          setError('')
        } else {
          sessionStorage.setItem('toolx.totp.secret', secret)
          sessionStorage.removeItem('toolx.totp.secret.enc')
        }
      } catch {
        setError(t('totp_error_save_failed'))
      }
    }
    run()
  }, [secret, passphrase, noSave])

  React.useEffect(() => {
    let id = null
    const tick = async () => {
      try {
        const now = Math.floor(Date.now() / 1000)
        const counter = Math.floor(now / period)
        const secLeft = period - (now % period)
        setLeft(secLeft)
        const keyBytes = base32ToBytes(secret)
        const otp = await computeTotp(keyBytes, counter, digits)
        setCode(otp)
        setError('')
      } catch (e) {
        setError(t('totp_error_generate_failed'))
      }
    }
    tick()
    id = setInterval(tick, 1000)
    return () => { if (id) clearInterval(id) }
  }, [secret, digits, period])

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); alert(t('totp_alert_copy_success')) } catch { alert(t('totp_alert_copy_failed')) }
  }

  const clearStorage = () => {
    try {
      sessionStorage.removeItem('toolx.totp.secret')
      sessionStorage.removeItem('toolx.totp.secret.enc')
      sessionStorage.removeItem('toolx.totp.digits')
      sessionStorage.removeItem('toolx.totp.period')
      alert(t('totp_clear_success'))
    } catch {}
  }

  // Allow pasting "otpauth://" URI to auto-fill secret/digits/period
  const parseOtpauth = (text) => {
    try {
      if (!text || !text.startsWith('otpauth://')) return null
      // Example: otpauth://totp/Label?secret=JBSWY3DPEHPK3PXP&digits=6&period=30
      const query = text.split('?')[1] || ''
      const params = new URLSearchParams(query)
      const sec = params.get('secret') || ''
      const d = parseInt(params.get('digits') || '6', 10)
      const p = parseInt(params.get('period') || '30', 10)
      return { secret: sec, digits: (d === 6 || d === 8) ? d : 6, period: [15,20,30,60].includes(p) ? p : 30 }
    } catch {
      return null
    }
  }

  return (
    <div className="totp-card" role="region" aria-label={t('totp_aria_label')}>
      <div className="totp-title">{t('totp_title')}</div>
      <div className="totp-controls">
        <label className="totp-label" htmlFor="totpSecret">{t('totp_secret_label')}</label>
        <input
          id="totpSecret"
          className="totp-input"
          placeholder={t('totp_secret_placeholder')}
          value={secret}
          onChange={(e) => {
            const v = e.target.value
            const parsed = parseOtpauth(v)
            if (parsed) {
              setSecret(parsed.secret)
              setDigits(parsed.digits)
              setPeriod(parsed.period)
            } else {
              setSecret(v)
            }
          }}
          aria-label={t('totp_code_aria_label')}
        />
        {/* Công tắc bảo mật được xử lý phía sau; UI tối giản, không hiển thị toggle */}
        <div className="totp-row">
          <label htmlFor="totpDigits">{t('totp_digits')}</label>
          <select id="totpDigits" className="totp-select" value={digits} onChange={(e) => setDigits(parseInt(e.target.value, 10))}>
            <option value={6}>6</option>
            <option value={8}>8</option>
          </select>
          <label htmlFor="totpPeriod" style={{ marginLeft: 12 }}>{t('totp_period')}</label>
          <select id="totpPeriod" className="totp-select" value={period} onChange={(e) => setPeriod(parseInt(e.target.value, 10))}>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </div>
      </div>
      <div className="totp-code-wrap">
        <div className="totp-code" aria-live="polite">{code || '— — — — — —'}</div>
        <button className="chip-button" onClick={copyCode} aria-label="Copy code">{t('totp_copy')}</button>
        <button className="chip-button" onClick={clearStorage} aria-label="Clear saved">{t('totp_clear_button') || 'Clear'}</button>
      </div>
      <div className="totp-countdown">
        <div className="totp-countdown-bar" style={{ width: `${Math.max(0, Math.min(100, (left / period) * 100))}%` }} />
        <span className="totp-left">{String(t('totp_left')).replace('{left}', String(left))}</span>
      </div>
      {error && <div className="totp-error" role="alert">{error}</div>}
      <p className="totp-note">{t('totp_note') || 'Paste secret (Base32) to generate new codes, similar to 2fa.cn.'}</p>
    </div>
  )
}