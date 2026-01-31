import React from 'react'

interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  label?: string | React.ReactNode
  id?: string
}

export default function Toggle({ checked, onChange, disabled, label, id }: ToggleProps) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none" htmlFor={id}>
      <span
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        aria-label={typeof label === 'string' ? label : undefined}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) onChange(!checked)
          }
        }}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/60
          ${checked ? 'bg-blue-600' : 'bg-slate-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`absolute top-1/2 left-1 transform -translate-y-1/2 rounded-full bg-white shadow transition-transform h-4 w-4 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </span>
      {label && <span className="text-sm text-slate-700" id={id}>{label}</span>}
      <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
    </label>
  )
}
