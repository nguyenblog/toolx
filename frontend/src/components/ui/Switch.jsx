import React from 'react'

export default function Switch({
  value, // 'left' | 'right'
  onChange,
  leftLabel,
  rightLabel,
  leftIcon,
  rightIcon,
  ariaLabel,
}) {
  const isLeft = value !== 'right'
  const isRight = value === 'right'
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      <div className="indicator" style={{ transform: `translateX(${isRight ? '100%' : '0'})` }} />
      <button
        className={`segment ${isLeft ? 'active' : ''}`}
        onClick={() => onChange('left')}
        onDoubleClick={() => onChange('right')}
        aria-pressed={isLeft}
      >
        {leftIcon ? leftIcon : leftLabel}
      </button>
      <button
        className={`segment ${isRight ? 'active' : ''}`}
        onClick={() => onChange('right')}
        onDoubleClick={() => onChange('left')}
        aria-pressed={isRight}
      >
        {rightIcon ? rightIcon : rightLabel}
      </button>
    </div>
  )
}