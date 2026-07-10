import { useId, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helperText?: string
}

export function Input({ label, error, helperText, required, className = '', id, ...rest }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <input
        id={inputId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`h-11 rounded-control border bg-surface px-3 text-base text-text placeholder:text-text-muted
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-bg
          ${error ? 'border-danger' : 'border-border-strong'} ${className}`}
        {...rest}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-sm text-text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
