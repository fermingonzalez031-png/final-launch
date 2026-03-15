import type { OrderStatus, OrderPriority, DriverStatus } from '@/lib/types'

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new_request:          'New Request',
  confirming_supplier:  'Confirming Supplier',
  supplier_confirmed:   'Supplier Confirmed',
  driver_assigned:      'Driver Assigned',
  picked_up:            'Picked Up',
  en_route:             'En Route',
  delivered:            'Delivered',
  issue:                'Issue',
  cancelled:            'Cancelled',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  new_request:          'bg-blue-100 text-blue-800',
  confirming_supplier:  'bg-yellow-100 text-yellow-800',
  supplier_confirmed:   'bg-purple-100 text-purple-800',
  driver_assigned:      'bg-brand-50 text-brand-800',
  picked_up:            'bg-cyan-100 text-cyan-800',
  en_route:             'bg-brand-50 text-brand-600',
  delivered:            'bg-gray-100 text-gray-600',
  issue:                'bg-red-100 text-red-800',
  cancelled:            'bg-gray-100 text-gray-400',
}

export const PRIORITY_LABELS: Record<OrderPriority, string> = {
  standard:  'Standard',
  rush:      'Rush',
  emergency: 'Emergency',
}

export const PRIORITY_COLORS: Record<OrderPriority, string> = {
  standard:  'bg-gray-100 text-gray-600',
  rush:      'bg-amber-100 text-amber-800',
  emergency: 'bg-red-100 text-red-800',
}

export const DRIVER_STATUS_COLORS: Record<DriverStatus, string> = {
  available:  'bg-brand-50 text-brand-800',
  assigned:   'bg-amber-100 text-amber-800',
  on_pickup:  'bg-cyan-100 text-cyan-800',
  delivering: 'bg-blue-100 text-blue-800',
  offline:    'bg-gray-100 text-gray-500',
}

export const KANBAN_COLUMNS: OrderStatus[] = [
  'new_request', 'confirming_supplier', 'supplier_confirmed',
  'driver_assigned', 'picked_up', 'en_route', 'delivered',
]

export const STATUS_FLOW: OrderStatus[] = [
  'new_request', 'confirming_supplier', 'supplier_confirmed',
  'driver_assigned', 'picked_up', 'en_route', 'delivered',
]

export function getNextStatus(current: OrderStatus): OrderStatus | null {
  const idx = STATUS_FLOW.indexOf(current)
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[idx + 1]
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  })
}

export function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function checkAfterHours(date: Date = new Date()): boolean {
  const day = date.getDay()
  const hour = date.getHours()
  if (day === 0 || day === 6) return true
  return hour < 7 || hour >= 18
}
