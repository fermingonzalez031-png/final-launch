'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge, PriorityBadge } from '@/components/ui'
import { formatDateTime, STATUS_LABELS, getNextStatus } from '@/lib/utils'
import type { Order } from '@/lib/types'

export default function DriverDeliveryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPOD, setShowPOD] = useState(false)
  const [podFile, setPodFile] = useState<File | null>(null)
  const [podNote, setPodNote] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [podUploading, setPodUploading] = useState(false)
  const [podDone, setPodDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('orders')
      .select(`*, suppliers(name), supplier_locations(address, city, phone), companies(name), contractors(users(full_name, phone)), proof_of_delivery(id, photo_url, submitted_at)`)
      .eq('id', id).single()
      .then(({ data }) => { if (data) setOrder(data as Order); setLoading(false) })

    const channel = supabase.channel(`driver-order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        payload => setOrder(prev => ({ ...prev, ...payload.new } as Order)))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function advanceStatus() {
    if (!order) return
    const next = getNextStatus(order.status)
    if (!next || next === 'delivered') return
    setActionLoading(true)
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setOrder(o => o ? { ...o, status: next } : null)
    setActionLoading(false)
  }

  async function uploadPOD() {
    if (!podFile) return
    setPodUploading(true)
    const form = new FormData()
    form.append('file', podFile)
    form.append('order_id', id)
    if (recipientName) form.append('recipient_name', recipientName)
    if (podNote) form.append('notes', podNote)

    // Get GPS
    navigator.geolocation?.getCurrentPosition(pos => {
      form.append('delivery_lat', String(pos.coords.latitude))
      form.append('delivery_lng', String(pos.coords.longitude))
    })

    const res = await fetch('/api/uploads/proof-of-delivery', { method: 'POST', body: form })
    if (res.ok) {
      setPodDone(true)
      // Now mark delivered
      await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' }),
      })
      setOrder(o => o ? { ...o, status: 'delivered' } : null)
    }
    setPodUploading(false)
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-100 border-t-brand-400" />
    </div>
  )
  if (!order) return <div className="p-6 text-gray-500">Order not found.</div>

  const supplier      = order.suppliers as { name?: string } | undefined
  const supplierLoc   = order.supplier_locations as { address?: string; city?: string; phone?: string } | undefined
  const contractor    = (order.contractors as { users?: { full_name?: string; phone?: string } } | undefined)?.users
  const nextStatus    = getNextStatus(order.status)
  const podRecord     = (order as unknown as Record<string, unknown>).proof_of_delivery as Array<{ id: string; photo_url: string; submitted_at: string }> | undefined
  const hasPOD        = podRecord && podRecord.length > 0

  const delivered = order.status === 'delivered'
  const canPickup  = order.status === 'driver_assigned'
  const canEnRoute = order.status === 'picked_up'
  const canDeliver = order.status === 'en_route'

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          Back
        </button>
        <div className="flex items-start justify-between mb-2">
          <span className="font-mono text-xs text-gray-400">{order.order_number}</span>
          <div className="flex gap-2">
            <PriorityBadge priority={order.priority} />
            <StatusBadge status={order.status} />
          </div>
        </div>
        <h1 className="text-lg font-bold text-gray-900">{order.part_description}</h1>
      </div>

      {/* Pickup */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">PICKUP</span>
          <span className="text-sm font-semibold text-gray-700">{supplier?.name}</span>
        </div>
        <p className="text-gray-600 text-sm">{supplierLoc?.address}{supplierLoc?.city ? `, ${supplierLoc.city}` : ''}</p>
        {supplierLoc?.phone && (
          <a href={`tel:${supplierLoc.phone}`} className="inline-flex items-center gap-1 text-brand-600 text-sm font-medium mt-2 hover:text-brand-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            Call supplier
          </a>
        )}
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent((supplierLoc?.address || '') + ' ' + (supplierLoc?.city || ''))}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 text-sm font-medium mt-2 ml-4 hover:text-blue-800"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          Directions
        </a>
      </div>

      {/* Dropoff */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-brand-50 text-brand-700 text-xs font-bold px-2 py-1 rounded">DROPOFF</span>
          <span className="text-sm font-semibold text-gray-700">{order.companies ? (order.companies as { name?: string }).name : ''}</span>
        </div>
        <p className="text-gray-600 text-sm">{order.jobsite_address}</p>
        {contractor?.phone && (
          <a href={`tel:${contractor.phone}`} className="inline-flex items-center gap-1 text-brand-600 text-sm font-medium mt-2 hover:text-brand-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            Call contractor — {contractor.full_name}
          </a>
        )}
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(order.jobsite_address)}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 text-sm font-medium mt-2 ml-4 hover:text-blue-800"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          Directions
        </a>
      </div>

      {/* Action buttons */}
      {!delivered && (
        <div className="space-y-3">
          {canPickup && (
            <button onClick={advanceStatus} disabled={actionLoading}
              className="w-full bg-brand-400 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl text-lg transition-colors disabled:opacity-50 active:scale-[0.98]">
              {actionLoading ? 'Updating…' : '✓ Mark Picked Up'}
            </button>
          )}
          {canEnRoute && (
            <button onClick={advanceStatus} disabled={actionLoading}
              className="w-full bg-brand-400 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl text-lg transition-colors disabled:opacity-50 active:scale-[0.98]">
              {actionLoading ? 'Updating…' : '🚗 Mark En Route'}
            </button>
          )}
          {canDeliver && !showPOD && (
            <button onClick={() => setShowPOD(true)}
              className="w-full bg-brand-400 hover:bg-brand-600 text-white font-bold py-4 rounded-2xl text-lg transition-colors active:scale-[0.98]">
              📦 Mark Delivered
            </button>
          )}

          {/* POD form */}
          {canDeliver && showPOD && !podDone && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Proof of delivery</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo <span className="text-red-500">*</span></label>
                <input ref={fileRef} type="file" accept="image/*" capture="environment"
                  onChange={e => setPodFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:font-semibold hover:file:bg-brand-100" />
                {podFile && <p className="text-xs text-brand-600 mt-1">✓ {podFile.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received by</label>
                <input value={recipientName} onChange={e => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="Name of person who received" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={podNote} onChange={e => setPodNote(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                  placeholder="Any notes about the delivery" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPOD(false)}
                  className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={uploadPOD} disabled={!podFile || podUploading}
                  className="flex-[2] bg-brand-400 hover:bg-brand-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors">
                  {podUploading ? 'Uploading…' : 'Submit & Complete'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delivered state */}
      {(delivered || podDone) && (
        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-brand-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <p className="font-bold text-brand-800 text-lg">Delivery complete!</p>
          {order.delivered_at && <p className="text-brand-600 text-sm mt-1">{formatDateTime(order.delivered_at)}</p>}
          {hasPOD && <p className="text-brand-600 text-xs mt-2">Proof of delivery submitted ✓</p>}
          <button onClick={() => router.push('/driver')}
            className="mt-4 bg-brand-400 hover:bg-brand-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
            Back to dashboard
          </button>
        </div>
      )}
    </div>
  )
}
