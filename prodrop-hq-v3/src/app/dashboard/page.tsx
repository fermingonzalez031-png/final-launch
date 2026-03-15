'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/ui'
import { formatTimeAgo, formatCurrency } from '@/lib/utils'
import type { Order } from '@/lib/types'

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('orders')
      .select('id, order_number, status, priority, part_description, jobsite_address, requested_at, total_amount')
      .not('status', 'in', '("cancelled")')
      .order('requested_at', { ascending: false })
      .limit(10)
      .then(({ data }) => { setOrders(data || []); setLoading(false) })
  }, [])

  const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Westchester County &amp; Bronx delivery</p>
        </div>
        <Link href="/dashboard/orders/new" className="bg-brand-400 hover:bg-brand-600 text-white font-bold px-5 py-2.5 rounded-lg transition-colors text-sm">
          + New Request
        </Link>
      </div>

      {/* Active deliveries */}
      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Active deliveries</h2>
          <div className="space-y-3">
            {active.map(order => (
              <Link key={order.id} href={`/dashboard/orders/${order.id}`}
                className="block bg-white border border-brand-100 rounded-xl p-4 hover:border-brand-400 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-gray-400">{order.order_number}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">{order.part_description}</p>
                    <p className="text-xs text-gray-400 mt-1">{order.jobsite_address}</p>
                  </div>
                  <span className="text-xs text-gray-400">{formatTimeAgo(order.requested_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent orders</h2>
          <Link href="/dashboard/orders" className="text-sm text-brand-600 hover:text-brand-800 font-medium">View all</Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-100 border-t-brand-400" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 mb-4">No orders yet</p>
            <Link href="/dashboard/orders/new" className="text-brand-600 font-semibold text-sm hover:text-brand-800">
              Request your first delivery →
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Part</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/dashboard/orders/${o.id}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{o.order_number}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium max-w-xs truncate">{o.part_description}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-right text-gray-600">{o.total_amount ? formatCurrency(o.total_amount) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
