import React from 'react'

export default function TypingText({ text, speed = 60, startDelay = 200, repeat = false, loopDelay = 2000, className = '' }) {
  const [displayed, setDisplayed] = React.useState('')
  const [typing, setTyping] = React.useState(false)
  const timersRef = React.useRef({ start: null, interval: null, loop: null })

  const startTyping = React.useCallback(() => {
    let i = 0
    setDisplayed('')
    setTyping(true)
    timersRef.current.interval = setInterval(() => {
      i += 1
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(timersRef.current.interval)
        setTyping(false)
        if (repeat) {
          timersRef.current.loop = setTimeout(() => {
            startTyping()
          }, loopDelay)
        }
      }
    }, speed)
  }, [text, speed, repeat, loopDelay])

  React.useEffect(() => {
    // Cleanup any running timers before starting a new cycle
    if (timersRef.current.start) clearTimeout(timersRef.current.start)
    if (timersRef.current.interval) clearInterval(timersRef.current.interval)
    if (timersRef.current.loop) clearTimeout(timersRef.current.loop)

    timersRef.current.start = setTimeout(() => {
      startTyping()
    }, startDelay)

    return () => {
      if (timersRef.current.start) clearTimeout(timersRef.current.start)
      if (timersRef.current.interval) clearInterval(timersRef.current.interval)
      if (timersRef.current.loop) clearTimeout(timersRef.current.loop)
    }
  }, [text, speed, startDelay, repeat, loopDelay, startTyping])

  return (
    <span className={`typing ${className}`} aria-label="typing text">
      <span>{displayed}</span>
      <span className={`typing-caret ${typing ? 'blink' : ''}`}>|</span>
    </span>
  )
}