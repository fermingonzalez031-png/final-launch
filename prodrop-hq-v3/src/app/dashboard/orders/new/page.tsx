'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PRIORITY_OPTIONS = [
  { value: 'standard', label: 'Standard — est. 60–90 min ($35+)', color: 'border-gray-300' },
  { value: 'rush',     label: 'Rush — est. 30–60 min ($50+)',    color: 'border-amber-400' },
  { value: 'emergency',label: 'Emergency — est. 15–30 min ($75+)',color: 'border-red-400' },
]

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    jobsite_address: '',
    part_description: '',
    priority: 'standard',
    equipment_brand: '',
    model_number: '',
    notes: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()

    if (!res.ok) { setError(json.error || 'Failed to submit request'); setLoading(false); return }
    router.push(`/dashboard/orders/${json.data.id}?submitted=1`)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Delivery Request</h1>
        <p className="text-gray-500 text-sm mt-1">Submit a request and we'll confirm availability and send an ETA.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Jobsite address */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Delivery location</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jobsite address <span className="text-red-500">*</span></label>
            <input
              required value={form.jobsite_address} onChange={e => set('jobsite_address', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="47 Maple Ave, Yonkers, NY 10701"
            />
          </div>
        </div>

        {/* Part info */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Part details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Part needed <span className="text-red-500">*</span></label>
              <textarea
                required value={form.part_description} onChange={e => set('part_description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                placeholder="Describe the part — e.g. 40/5 MFD 440V dual run capacitor, or Taco 007 circulator pump"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment brand</label>
                <input value={form.equipment_brand} onChange={e => set('equipment_brand', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="Goodman, Navien, Carrier…" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model number</label>
                <input value={form.model_number} onChange={e => set('model_number', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="GSXC18-036" />
              </div>
            </div>
          </div>
        </div>

        {/* Priority */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Delivery priority</h2>
          <div className="space-y-3">
            {PRIORITY_OPTIONS.map(opt => (
              <label key={opt.value}
                className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${form.priority === opt.value ? opt.color + ' bg-gray-50' : 'border-transparent hover:bg-gray-50'}`}>
                <input
                  type="radio" name="priority" value={opt.value}
                  checked={form.priority === opt.value}
                  onChange={() => set('priority', opt.value)}
                  className="accent-brand-400"
                />
                <span className="text-sm font-medium text-gray-800">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Additional notes</h2>
          <textarea
            value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            placeholder="Gate codes, special instructions, best entrance…"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-[2] bg-brand-400 hover:bg-brand-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Submitting…' : 'Submit Delivery Request'}
          </button>
        </div>
      </form>
    </div>
  )
}
