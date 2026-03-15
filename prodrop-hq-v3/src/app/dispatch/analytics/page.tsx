'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import type { DispatchMetrics } from '@/lib/types'

function StatCard({ label, value, sub, color = 'text-gray-900' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-4xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AnalyticsPage() {
  const [metrics, setMetrics]     = useState<DispatchMetrics | null>(null)
  const [recentOrders, setRecent] = useState<Array<{ order_number: string; status: string; requested_at: string; part_description: string; total_amount: number }>>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const supabase = require('@/lib/supabase/client').createClient()

    Promise.all([
      fetch('/api/dispatch/metrics').then(r => r.json()),
      supabase.from('orders')
        .select('order_number, status, requested_at, part_description, total_amount')
        .order('requested_at', { ascending: false })
        .limit(20),
    ]).then(([metricsRes, ordersRes]) => {
      if (metricsRes.data) setMetrics(metricsRes.data)
      setRecent(ordersRes.data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-100 border-t-brand-400" />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active orders"    value={metrics.active_orders} />
          <StatCard label="New requests"     value={metrics.new_requests}  color={metrics.new_requests > 0 ? 'text-blue-600' : 'text-gray-900'} />
          <StatCard label="En route now"     value={metrics.en_route_now}  color="text-brand-600" />
          <StatCard label="Delivered today"  value={metrics.delivered_today} color="text-brand-600" />
          <StatCard label="Total drivers"    value={metrics.total_drivers} />
          <StatCard label="Available drivers" value={metrics.available_drivers} color={metrics.available_drivers > 0 ? 'text-brand-600' : 'text-red-600'} />
          <StatCard label="Revenue today"   value={formatCurrency(metrics.revenue_today)} color="text-gray-900" />
          <StatCard label="Service area" value="W'chester + Bronx" sub="Westchester County & the Bronx" />
        </div>
      )}

      {/* Recent orders table */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent orders</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Part</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Requested</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.map((o, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.order_number}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{o.part_description}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-500 capitalize">{o.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                    {new Date(o.requested_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">
                    {o.total_amount ? formatCurrency(o.total_amount) : '—'}
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
