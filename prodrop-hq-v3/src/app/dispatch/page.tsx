'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge, PriorityBadge } from '@/components/ui'
import { formatTimeAgo, KANBAN_COLUMNS, STATUS_LABELS, getNextStatus } from '@/lib/utils'
import type { Order, OrderStatus, Driver, DispatchMetrics } from '@/lib/types'

function MetricCard({ label, value, color = 'text-gray-900' }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function OrderCard({ order, onOpen }: { order: Order; onOpen: (o: Order) => void }) {
  const company = (order.companies as { name?: string } | undefined)?.name || '—'
  const driverName = (order.drivers as { users?: { full_name?: string } } | undefined)?.users?.full_name
  return (
    <div onClick={() => onOpen(order)}
      className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-brand-400 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-gray-400">{order.order_number}</span>
        <PriorityBadge priority={order.priority} />
      </div>
      <p className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{order.part_description}</p>
      <p className="text-xs text-gray-500 mb-2 truncate">{company}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{formatTimeAgo(order.requested_at)}</span>
        {driverName && <span className="text-xs text-brand-600 font-medium">{driverName}</span>}
      </div>
    </div>
  )
}

function OrderModal({ order, onClose, onStatusChange, drivers }: {
  order: Order; onClose: () => void; onStatusChange: () => void; drivers: Driver[]
}) {
  const [loading, setLoading] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState(order.driver_id || '')
  const [supplierId, setSupplierId] = useState(order.supplier_id || '')
  const [etaMinutes, setEtaMinutes] = useState(60)
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])

  const company = (order.companies as { name?: string })?.name || '—'
  const contractor = (order.contractors as { users?: { full_name?: string; phone?: string } })?.users
  const nextStatus = getNextStatus(order.status)

  useEffect(() => {
    createClient().from('suppliers').select('id, name').eq('is_active', true)
      .then(({ data }) => setSuppliers(data || []))
  }, [])

  async function advance() {
    if (!nextStatus) return
    setLoading(true)
    const body: Record<string, unknown> = { status: nextStatus }
    if (selectedDriver) body.driver_id = selectedDriver
    if (supplierId) body.supplier_id = supplierId
    if (nextStatus === 'supplier_confirmed') body.eta_minutes = etaMinutes
    if (contractor?.phone) body.contractor_phone = contractor.phone

    await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    setLoading(false)
    onStatusChange()
    onClose()
  }

  async function assignDriver() {
    if (!selectedDriver) return
    setLoading(true)
    await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_id: selectedDriver, status: 'driver_assigned', contractor_phone: contractor?.phone })
    })
    setLoading(false)
    onStatusChange()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-xs text-gray-400">{order.order_number}</span>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">{order.part_description}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <StatusBadge status={order.status} />
            <PriorityBadge priority={order.priority} />
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-400 text-xs">Company</p><p className="font-medium">{company}</p></div>
            <div><p className="text-gray-400 text-xs">Contact</p>
              <p className="font-medium">{contractor?.full_name || '—'}</p>
              {contractor?.phone && <a href={`tel:${contractor.phone}`} className="text-xs text-brand-600">{contractor.phone}</a>}
            </div>
            <div className="col-span-2"><p className="text-gray-400 text-xs">Jobsite</p><p className="font-medium">{order.jobsite_address}</p></div>
            {order.equipment_brand && <div><p className="text-gray-400 text-xs">Equipment</p><p className="font-medium">{order.equipment_brand} {order.model_number}</p></div>}
          </div>

          {/* Assign supplier */}
          {(order.status === 'new_request' || order.status === 'confirming_supplier') && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Assign Supplier</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-400 focus:outline-none">
                <option value="">-- Select supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* ETA when confirming */}
          {order.status === 'confirming_supplier' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">ETA (minutes)</label>
              <select value={etaMinutes} onChange={e => setEtaMinutes(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-400 focus:outline-none">
                {[30,45,60,75,90,120].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          )}

          {/* Assign driver */}
          {(order.status === 'supplier_confirmed' || order.status === 'driver_assigned') && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Assign Driver</label>
              <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-400 focus:outline-none">
                <option value="">-- Select driver --</option>
                {drivers.filter(d => d.driver_status === 'available').map(d => {
                  const dUser = (d as Driver & { users?: { full_name?: string } }).users
                  return <option key={d.id} value={d.id}>{dUser?.full_name || d.id}</option>
                })}
              </select>
              {order.status === 'supplier_confirmed' && (
                <button onClick={assignDriver} disabled={!selectedDriver || loading}
                  className="mt-2 w-full bg-brand-400 hover:bg-brand-600 text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-50 transition-colors">
                  {loading ? 'Assigning…' : 'Assign Driver'}
                </button>
              )}
            </div>
          )}
        </div>

        {nextStatus && !['delivered', 'cancelled'].includes(order.status) && (
          <div className="p-5 border-t border-gray-100">
            <button onClick={advance} disabled={loading}
              className="w-full bg-brand-400 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Updating…' : `→ Mark: ${STATUS_LABELS[nextStatus]}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DispatchPage() {
  const [columns, setColumns] = useState<Record<string, Order[]>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [metrics, setMetrics] = useState<DispatchMetrics | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  const loadBoard = useCallback(async () => {
    const [boardRes, metricsRes] = await Promise.all([
      fetch('/api/dispatch/board').then(r => r.json()),
      fetch('/api/dispatch/metrics').then(r => r.json()),
    ])
    if (boardRes.data) {
      setColumns(boardRes.data.columns)
      setCounts(boardRes.data.counts)
      setDrivers(boardRes.data.available_drivers || [])
    }
    if (metricsRes.data) setMetrics(metricsRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadBoard()
    // Realtime subscription
    const supabase = createClient()
    const channel = supabase.channel('dispatch-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadBoard())
      .subscribe()
    // Polling fallback every 15s
    const interval = setInterval(loadBoard, 15000)
    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [loadBoard])

  const colLabels: Record<string, string> = {
    new_request: 'New Request', confirming_supplier: 'Confirming',
    supplier_confirmed: 'Confirmed', driver_assigned: 'Assigned',
    picked_up: 'Picked Up', en_route: 'En Route', delivered: 'Delivered', issue: 'Issue',
  }
  const colBorders: Record<string, string> = {
    new_request: 'border-t-blue-500', confirming_supplier: 'border-t-yellow-500',
    supplier_confirmed: 'border-t-purple-500', driver_assigned: 'border-t-brand-400',
    picked_up: 'border-t-cyan-500', en_route: 'border-t-brand-600',
    delivered: 'border-t-gray-400', issue: 'border-t-red-500',
  }

  return (
    <div className="h-full flex flex-col">
      {/* Metrics bar */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-4 border-b border-gray-100 bg-white">
          <MetricCard label="Active" value={metrics.active_orders} color="text-gray-900" />
          <MetricCard label="New" value={metrics.new_requests} color={metrics.new_requests > 0 ? 'text-blue-600' : 'text-gray-900'} />
          <MetricCard label="En Route" value={metrics.en_route_now} color="text-brand-600" />
          <MetricCard label="Delivered Today" value={metrics.delivered_today} color="text-brand-600" />
          <MetricCard label="Drivers" value={metrics.total_drivers} />
          <MetricCard label="Available" value={metrics.available_drivers} color={metrics.available_drivers > 0 ? 'text-brand-600' : 'text-red-600'} />
          <MetricCard label="Revenue Today" value={`$${metrics.revenue_today.toFixed(0)}`} color="text-gray-900" />
        </div>
      )}

      {/* Kanban */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-100 border-t-brand-400" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-3 min-w-max h-full">
            {[...KANBAN_COLUMNS, 'issue' as OrderStatus].map(status => (
              <div key={status} className="w-52 flex-shrink-0 flex flex-col">
                <div className={`bg-gray-50 border border-gray-200 border-t-4 rounded-xl overflow-hidden flex flex-col flex-1 ${colBorders[status] || 'border-t-gray-300'}`}>
                  <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">{colLabels[status] || status}</span>
                    <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{counts[status] || 0}</span>
                  </div>
                  <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                    {(columns[status] || []).map(order => (
                      <OrderCard key={order.id} order={order} onOpen={setSelectedOrder} />
                    ))}
                    {(!columns[status] || columns[status].length === 0) && (
                      <p className="text-center text-xs text-gray-300 pt-4">Empty</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={loadBoard}
          drivers={drivers}
        />
      )}
    </div>
  )
}
