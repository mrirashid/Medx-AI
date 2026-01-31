import { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

type BaseProps = { label?: string; error?: string; helper?: string }

type InputProps = InputHTMLAttributes<HTMLInputElement> & BaseProps
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & BaseProps
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & BaseProps & { children: ReactNode }

const baseField = 'w-full rounded-md border border-muted-300 bg-white px-3 py-2 text-sm text-muted-900 placeholder:text-muted-400 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200'

function fieldClass(error?: string, className?: string) {
  const err = error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
  return [baseField, err, className].filter(Boolean).join(' ')
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, helper, className = '', ...props }, ref) => (
  <label className={`block w-full ${className}`}>
    {label && <span className="mb-1 block text-sm font-medium text-muted-700">{label}</span>}
    <input ref={ref} className={fieldClass(error)} {...props} />
    {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : helper ? <span className="mt-1 block text-xs text-muted-500">{helper}</span> : null}
  </label>
))

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, helper, className = '', ...props }, ref) => (
  <label className={`block w-full ${className}`}>
    {label && <span className="mb-1 block text-sm font-medium text-muted-700">{label}</span>}
    <textarea ref={ref} className={fieldClass(error)} {...props} />
    {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : helper ? <span className="mt-1 block text-xs text-muted-500">{helper}</span> : null}
  </label>
))

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, helper, className = '', children, ...props }, ref) => (
  <label className={`block w-full ${className}`}>
    {label && <span className="mb-1 block text-sm font-medium text-muted-700">{label}</span>}
    <select ref={ref} className={fieldClass(error)} {...props}>{children}</select>
    {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : helper ? <span className="mt-1 block text-xs text-muted-500">{helper}</span> : null}
  </label>
))

export { Input, Textarea, Select }
export default Input
