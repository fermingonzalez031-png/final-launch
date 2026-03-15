'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/ui'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import type { Order } from '@/lib/types'

export default function DriverHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('drivers').select('id').eq('user_id', user.id).single()
        .then(({ data: driver }) => {
          if (!driver) return
          supabase.from('orders')
            .select('id, order_number, status, priority, part_description, jobsite_address, delivered_at, total_amount, companies(name)')
            .eq('driver_id', driver.id)
            .eq('status', 'delivered')
            .order('delivered_at', { ascending: false })
            .limit(50)
            .then(({ data }) => { setOrders((data || []) as Order[]); setLoading(false) })
        })
    })
  }, [])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Delivery history</h1>
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-100 border-t-brand-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">No completed deliveries yet</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Part</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Delivered</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-500">{o.order_number}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{(o.companies as { name?: string })?.name}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-700 max-w-xs truncate">{o.part_description}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {o.delivered_at ? formatDateTime(o.delivered_at) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">
                    {o.total_amount ? formatCurrency(o.total_amount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
