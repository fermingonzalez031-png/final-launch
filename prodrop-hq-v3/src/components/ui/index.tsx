import clsx from 'clsx'

// ── Badge ──────────────────────────────────────────────────────
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'cyan'
}
const badgeVariants: Record<string, string> = {
  gray:   'bg-gray-100 text-gray-600',
  green:  'bg-brand-50 text-brand-800',
  amber:  'bg-amber-100 text-amber-800',
  red:    'bg-red-100 text-red-800',
  blue:   'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  cyan:   'bg-cyan-100 text-cyan-800',
}
export function Badge({ variant = 'gray', className, children, ...props }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', badgeVariants[variant], className)} {...props}>
      {children}
    </span>
  )
}

// ── Button ──────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}
const btnVariants: Record<string, string> = {
  primary:   'bg-brand-400 hover:bg-brand-600 text-white',
  secondary: 'bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-100',
  ghost:     'border border-gray-300 text-gray-700 hover:bg-gray-50',
  danger:    'bg-red-100 hover:bg-red-200 text-red-800 border border-red-200',
}
const btnSizes: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}
export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed', btnVariants[variant], btnSizes[size], className)}
      {...props}
    >
      {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: boolean
}
export function Card({ className, padding = true, children, ...props }: CardProps) {
  return (
    <div className={clsx('bg-white border border-gray-200 rounded-xl shadow-sm', padding && 'p-5', className)} {...props}>
      {children}
    </div>
  )
}

// ── Input ──────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}
export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{label}</label>}
      <input
        id={inputId}
        className={clsx('block w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent', error ? 'border-red-300' : 'border-gray-300', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}
export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        id={inputId}
        className={clsx('block w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-y', error ? 'border-red-300' : 'border-gray-300', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── Select ──────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}
export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{label}</label>}
      <select
        id={inputId}
        className={clsx('block w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white', error ? 'border-red-300' : 'border-gray-300', className)}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── Spinner ──────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size]
  return <div className={clsx('animate-spin rounded-full border-2 border-brand-100 border-t-brand-400', s)} />
}

// ── StatusBadge ──────────────────────────────────────────────────
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'
export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}

// ── PriorityBadge ──────────────────────────────────────────────────
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/utils'
import type { OrderPriority } from '@/lib/types'
export function PriorityBadge({ priority }: { priority: OrderPriority }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', PRIORITY_COLORS[priority])}>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
