'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge, PriorityBadge } from '@/components/ui'
import { formatTimeAgo, DRIVER_STATUS_COLORS } from '@/lib/utils'
import type { Order, Driver, DriverStatus } from '@/lib/types'

export default function DriverDashboardPage() {
  const [orders, setOrders]         = useState<Order[]>([])
  const [driver, setDriver]         = useState<Driver | null>(null)
  const [userId, setUserId]         = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [togglingStatus, setToggling] = useState(false)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [driverRes, ordersRes] = await Promise.all([
      supabase.from('drivers')
        .select('id, driver_status, vehicle_make, vehicle_model, vehicle_color, total_deliveries')
        .eq('user_id', user.id).single(),
      supabase.from('orders')
        .select('id, order_number, status, priority, part_description, jobsite_address, requested_at, eta_timestamp, suppliers(name), supplier_locations(address)')
        .not('status', 'in', '("delivered","cancelled")')
        .eq('driver_id', (await supabase.from('drivers').select('id').eq('user_id', user.id).single()).data?.id || '')
        .order('requested_at', { ascending: false }),
    ])

    if (driverRes.data) setDriver(driverRes.data as Driver)
    setOrders((ordersRes.data || []) as Order[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    const supabase = createClient()
    const channel = supabase.channel('driver-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadData])

  async function toggleAvailability() {
    if (!driver) return
    setToggling(true)
    const newStatus: DriverStatus = driver.driver_status === 'available' ? 'offline' : 'available'
    await fetch(`/api/drivers/${driver.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_status: newStatus }),
    })
    setDriver(d => d ? { ...d, driver_status: newStatus } : null)
    setToggling(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-100 border-t-brand-400" />
      </div>
    )
  }

  const statusColor = driver ? DRIVER_STATUS_COLORS[driver.driver_status] : 'bg-gray-100 text-gray-500'

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">

      {/* Driver status card */}
      {driver && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Your status</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusColor}`}>
                {driver.driver_status.charAt(0).toUpperCase() + driver.driver_status.slice(1)}
              </span>
              <p className="text-xs text-gray-400 mt-1">
                {[driver.vehicle_color, driver.vehicle_make, driver.vehicle_model].filter(Boolean).join(' ')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{driver.total_deliveries}</p>
              <p className="text-xs text-gray-400">total deliveries</p>
            </div>
          </div>
          <button
            onClick={toggleAvailability}
            disabled={togglingStatus || ['assigned', 'on_pickup', 'delivering'].includes(driver.driver_status)}
            className={`mt-4 w-full py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${
              driver.driver_status === 'available'
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                : 'bg-brand-400 hover:bg-brand-600 text-white'
            }`}
          >
            {togglingStatus ? 'Updating…' : driver.driver_status === 'available' ? 'Go Offline' : 'Go Available'}
          </button>
        </div>
      )}

      {/* Active deliveries */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Active deliveries ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <rect x="1" y="3" width="15" height="13" strokeLinecap="round" strokeLinejoin="round"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <p className="text-gray-400 font-medium">No active deliveries</p>
            <p className="text-gray-300 text-sm mt-1">
              {driver?.driver_status === 'offline' ? 'Go available to receive deliveries' : 'Waiting for assignment'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const supplierAddr = (order.supplier_locations as { address?: string } | undefined)?.address
              const supplierName = (order.suppliers as { name?: string } | undefined)?.name
              return (
                <Link key={order.id} href={`/driver/deliveries/${order.id}`}
                  className="block bg-white border border-gray-200 rounded-2xl p-4 hover:border-brand-400 transition-colors active:scale-[0.98]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-400">{order.order_number}</span>
                      <PriorityBadge priority={order.priority} />
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="font-semibold text-gray-900 mb-2">{order.part_description}</p>
                  <div className="space-y-1.5">
                    {supplierAddr && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">PICKUP</span>
                        <span className="text-gray-600">{supplierName} — {supplierAddr}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-xs bg-brand-50 text-brand-700 font-semibold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">DROP</span>
                      <span className="text-gray-600">{order.jobsite_address}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{formatTimeAgo(order.requested_at)}</span>
                    <span className="text-sm font-semibold text-brand-600">View details →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
