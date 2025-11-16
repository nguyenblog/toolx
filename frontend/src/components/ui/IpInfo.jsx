import React from 'react'

export default function IpInfo() {
  const [ip, setIp] = React.useState('')
  const [city, setCity] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [nowText, setNowText] = React.useState('')
  const [device, setDevice] = React.useState('')

  React.useEffect(() => {
    let cancelled = false

    const fetchJson = async (url, timeoutMs = 3500) => {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.json()
      } finally {
        clearTimeout(id)
      }
    }

    const run = async () => {
      try {
        // Try primary: ipapi direct
        const data = await fetchJson('https://ipapi.co/json/')
        if (!cancelled) {
          setIp(data.ip || '')
          setCity(data.city || '')
        }
      } catch {
        // Fallback: ipify for IP, then ipapi by IP for city
        try {
          const ipify = await fetchJson('https://api.ipify.org?format=json')
          if (!cancelled) setIp(ipify.ip || '')
          try {
            const byIp = await fetchJson(`https://ipapi.co/${ipify.ip}/json/`)
            if (!cancelled) setCity(byIp.city || '')
          } catch {
            if (!cancelled) setCity('')
          }
        } catch {
          if (!cancelled) {
            setIp('')
            setCity('')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  // Detect device: OS, type (Mobile/Tablet/Desktop), and browser
  React.useEffect(() => {
    const ua = navigator.userAgent || ''
    const uad = navigator.userAgentData || null

    const getOS = () => {
      const platform = (uad && uad.platform) ? uad.platform : ''
      const src = (platform || ua).toLowerCase()
      if (src.includes('windows')) return 'Windows'
      if (src.includes('mac') && !src.includes('iphone') && !src.includes('ipad')) return 'macOS'
      if (src.includes('android')) return 'Android'
      if (src.includes('iphone') || src.includes('ipad') || src.includes('ios')) return 'iOS'
      if (src.includes('cros')) return 'ChromeOS'
      if (src.includes('linux')) return 'Linux'
      return 'Khác'
    }
    const getType = () => {
      const isTablet = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))
      const isMobile = /Mobi|Android|iPhone|iPod/i.test(ua) && !isTablet
      if (isTablet) return 'Tablet'
      if (isMobile) return 'Mobile'
      return 'Desktop'
    }
    const getBrowser = () => {
      if (/Edg\//.test(ua)) return 'Edge'
      if (/OPR\//.test(ua)) return 'Opera'
      if (/Chrome\//.test(ua) && !/Chromium/i.test(ua) && !/Edg\//.test(ua)) return 'Chrome'
      if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari'
      if (/Firefox\//.test(ua)) return 'Firefox'
      return 'Trình duyệt'
    }

    const os = getOS()
    const type = getType()
    const browser = getBrowser()
    setDevice(`${type} • ${os} • ${browser}`)
  }, [])

  // Format current time: "Thứ hh:mm dd/mm/yyyy"
  React.useEffect(() => {
    const pad2 = (n) => String(n).padStart(2, '0')
    const toVNDay = (d) => {
      // Sunday (0) -> CN, Monday (1) -> Thứ 2 ... Saturday (6) -> Thứ 7
      const map = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
      return map[d] || 'Thứ'
    }
    const compute = () => {
      const now = new Date()
      const day = toVNDay(now.getDay())
      const hh = pad2(now.getHours())
      const mm = pad2(now.getMinutes())
      const dd = pad2(now.getDate())
      const MM = pad2(now.getMonth() + 1)
      const yyyy = now.getFullYear()
      setNowText(`${day} ${hh}:${mm} ${dd}/${MM}/${yyyy}`)
    }
    compute()
    const id = setInterval(compute, 1000)
    return () => clearInterval(id)
  }, [])

  const text = loading
    ? `Đang lấy IP… • ${nowText} • Thiết bị: ${device}`
    : `IP: ${ip || 'N/A'} • Thành phố: ${city || 'N/A'} • ${nowText} • Thiết bị: ${device}`

  return (
    <div className="ip-info" aria-live="polite">
      <span className="ip-info-text">{text}</span>
    </div>
  )
}