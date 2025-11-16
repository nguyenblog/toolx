import React from 'react'

const Input = React.forwardRef(function Input({ value, onChange, placeholder, className = '', type = 'text', size, style, ...rest }, ref) {
  return (
    <input
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`input ${className}`}
      type={type}
      size={size}
      style={style}
      {...rest}
    />
  )
})

export default Input