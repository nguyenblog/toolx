import React from 'react'

const Button = React.forwardRef(function Button({ children, onClick, variant = 'primary', className = '', disabled = false, loading = false, ...rest }, ref) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`btn btn-${variant} ${className} ${loading ? 'btn-loading' : ''}`}
      type="button"
      disabled={disabled}
      {...rest}
    >
      {loading && (
        <span className="spinner" aria-hidden="true" />
      )}
      <span className="btn-label">{children}</span>
    </button>
  )
})

export default Button