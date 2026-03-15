'use client'

import { useState } from 'react'
import Link from 'next/link'
import { STATUS_LABELS } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

const STATUS_FLOW: OrderStatus[] = [
  'new_request', 'confirming_supplier', 'supplier_confirmed',
  'driver_assigned', 'picked_up', 'en_route', 'delivered'
]

interface TrackingData {
  order_number: string
  status: OrderStatus
  priority: string
  part_description: string
  jobsite_address: string
  eta_timestamp?: string
  requested_at: string
  picked_up_at?: string
  delivered_at?: string
  drivers?: { vehicle_color?: string; vehicle_make?: string; vehicle_model?: string }
  delivery_events?: Array<{ to_status: string; created_at: string; notes?: string }>
}

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [data, setData]               = useState<TrackingData | null>(null)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault()
    if (!orderNumber.trim()) return
    setLoading(true); setError(''); setData(null)
    const res = await fetch(`/api/orders/track?order_number=${encodeURIComponent(orderNumber.trim())}`)
    const json = await res.json()
    if (!res.ok || !json.data) { setError('Order not found. Check your order number and try again.'); setLoading(false); return }
    setData(json.data)
    setLoading(false)
  }

  const currentIdx = data ? STATUS_FLOW.indexOf(data.status) : -1

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-brand-400">pro</span><span className="text-gray-900">drop</span>
          </Link>
          <Link href="/dashboard/orders/new" className="text-sm text-brand-600 font-semibold hover:text-brand-800">
            New request →
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track your delivery</h1>
          <p className="text-gray-500">Enter your order number to see live status</p>
        </div>

        <form onSubmit={handleTrack} className="flex gap-3 mb-8">
          <input
            value={orderNumber} onChange={e => setOrderNumber(e.target.value)}
            placeholder="PD-2024-0001"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 font-mono"
          />
          <button type="submit" disabled={loading}
            className="bg-brand-400 hover:bg-brand-600 text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50">
            {loading ? '…' : 'Track'}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-red-700 text-sm mb-6">{error}</div>
        )}

        {data && (
          <div className="space-y-4">
            {/* Status header */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-sm text-gray-400 mb-1">{data.order_number}</p>
                  <h2 className="text-xl font-bold text-gray-900">{data.part_description}</h2>
                  <p className="text-gray-500 text-sm mt-1">{data.jobsite_address}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  data.status === 'delivered' ? 'bg-brand-50 text-brand-800' :
                  data.status === 'en_route'  ? 'bg-amber-100 text-amber-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {STATUS_LABELS[data.status]}
                </span>
              </div>
              {data.eta_timestamp && data.status !== 'delivered' && (
                <div className="bg-brand-50 rounded-lg px-4 py-2 text-sm">
                  <span className="text-brand-700 font-semibold">ETA: </span>
                  <span className="text-brand-800">{new Date(data.eta_timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                {STATUS_FLOW.map((s, i) => (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        i < currentIdx ? 'bg-brand-400' :
                        i === currentIdx ? 'bg-brand-400 ring-4 ring-brand-100' :
                        'bg-gray-200'
                      }`} />
                      <span className={`text-xs mt-1 text-center leading-tight hidden sm:block ${
                        i === currentIdx ? 'text-brand-700 font-semibold' : i < currentIdx ? 'text-gray-500' : 'text-gray-300'
                      }`} style={{ maxWidth: '60px' }}>
                        {STATUS_LABELS[s].split(' ')[0]}
                      </span>
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentIdx ? 'bg-brand-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Driver info */}
            {data.drivers && data.status !== 'delivered' && (
              <div className="bg-white border border-brand-100 rounded-2xl p-5">
                <p className="text-sm font-semibold text-gray-700 mb-1">Your driver</p>
                <p className="text-gray-600 text-sm">
                  {[data.drivers.vehicle_color, data.drivers.vehicle_make, data.drivers.vehicle_model].filter(Boolean).join(' ')}
                </p>
              </div>
            )}

            {/* Delivered confirmation */}
            {data.status === 'delivered' && (
              <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 text-center">
                <div className="w-14 h-14 bg-brand-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <p className="font-bold text-brand-800 text-lg">Delivered!</p>
                {data.delivered_at && <p className="text-brand-600 text-sm mt-1">{new Date(data.delivered_at).toLocaleString()}</p>}
              </div>
            )}

            <div className="text-center pt-2">
              <Link href="/dashboard/orders/new" className="text-sm text-brand-600 font-semibold hover:text-brand-800">
                Need another part? Request a delivery →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
