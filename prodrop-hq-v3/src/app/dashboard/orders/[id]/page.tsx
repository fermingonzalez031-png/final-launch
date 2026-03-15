'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge, PriorityBadge } from '@/components/ui'
import { formatDateTime, formatCurrency, STATUS_LABELS } from '@/lib/utils'
import type { Order, DeliveryEvent } from '@/lib/types'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const justSubmitted = searchParams.get('submitted') === '1'
  const [order, setOrder] = useState<Order | null>(null)
  const [events, setEvents] = useState<DeliveryEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('orders')
      .select(`*, companies(name), drivers(vehicle_color, vehicle_make, vehicle_model, users(full_name, phone)), suppliers(name), delivery_events(id, to_status, actor_role, notes, created_at)`)
      .eq('id', id).single()
      .then(({ data }) => {
        if (data) {
          setOrder(data as Order)
          const rawEvents = (data as unknown as Record<string, unknown>).delivery_events
          setEvents((Array.isArray(rawEvents) ? rawEvents : []) as DeliveryEvent[])
        }
        setLoading(false)
      })

    // Realtime subscription
    const channel = supabase.channel(`order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        payload => setOrder(prev => ({ ...prev, ...payload.new } as Order)))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-100 border-t-brand-400" /></div>
  if (!order) return <div className="p-6"><p className="text-gray-500">Order not found.</p></div>

  const driver = order.drivers as (Order['drivers'] & { users?: { full_name?: string; phone?: string } }) | undefined

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {justSubmitted && (
        <div className="mb-6 bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <div>
            <p className="font-semibold text-brand-800">Request submitted!</p>
            <p className="text-sm text-brand-600">We'll confirm availability and send an ETA by text shortly.</p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/orders" className="text-sm text-gray-400 hover:text-gray-600">Orders</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-mono text-gray-600">{order.order_number}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{order.part_description}</h1>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={order.priority} />
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-3">Delivery details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Jobsite</span><span className="font-medium text-right max-w-48 text-gray-900">{order.jobsite_address}</span></div>
            {order.eta_timestamp && <div className="flex justify-between"><span className="text-gray-500">ETA</span><span className="font-medium text-gray-900">{formatDateTime(order.eta_timestamp)}</span></div>}
            {order.delivery_price && <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-semibold text-gray-900">{formatCurrency(order.delivery_price)}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Requested</span><span className="text-gray-900">{formatDateTime(order.requested_at)}</span></div>
          </div>
        </div>

        {driver && (
          <div className="bg-white border border-brand-100 rounded-xl p-5">
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Your driver</h3>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-gray-900">{driver.users?.full_name}</p>
              <p className="text-gray-500">{[driver.vehicle_color, driver.vehicle_make, driver.vehicle_model].filter(Boolean).join(' ')}</p>
              {driver.users?.phone && (
                <a href={`tel:${driver.users.phone}`} className="inline-flex items-center gap-1 text-brand-600 font-medium hover:text-brand-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  {driver.users.phone}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-4">Status timeline</h3>
        <div className="space-y-0">
          {events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((ev, i) => (
            <div key={ev.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-brand-400 mt-1 flex-shrink-0" />
                {i < events.length - 1 && <div className="w-0.5 flex-1 bg-brand-100 my-1" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-semibold text-gray-900">{ev.to_status ? STATUS_LABELS[ev.to_status] : ev.event_type}</p>
                <p className="text-xs text-gray-400">{formatDateTime(ev.created_at)}</p>
                {ev.notes && <p className="text-xs text-gray-500 mt-1">{ev.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
