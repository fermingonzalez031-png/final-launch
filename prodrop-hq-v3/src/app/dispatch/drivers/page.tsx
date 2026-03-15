'use client'

import { useEffect, useState } from 'react'
import { DRIVER_STATUS_COLORS } from '@/lib/utils'
import type { Driver } from '@/lib/types'

type DriverWithUser = Driver & { users?: { full_name?: string; phone?: string; email?: string } }

export default function DispatchDriversPage() {
  const [drivers, setDrivers] = useState<DriverWithUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/drivers')
      .then(r => r.json())
      .then(({ data }) => { setDrivers(data || []); setLoading(false) })
    const interval = setInterval(() => {
      fetch('/api/drivers').then(r => r.json()).then(({ data }) => setDrivers(data || []))
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  async function setStatus(driverId: string, status: string) {
    await fetch(`/api/drivers/${driverId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_status: status })
    })
    setDrivers(ds => ds.map(d => d.id === driverId ? { ...d, driver_status: status as Driver['driver_status'] } : d))
  }

  const available  = drivers.filter(d => d.driver_status === 'available')
  const busy       = drivers.filter(d => ['assigned', 'on_pickup', 'delivering'].includes(d.driver_status))
  const offline    = drivers.filter(d => d.driver_status === 'offline')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <div className="flex gap-3 text-sm">
          <span className="bg-brand-50 text-brand-800 font-semibold px-3 py-1 rounded-full">{available.length} available</span>
          <span className="bg-amber-100 text-amber-800 font-semibold px-3 py-1 rounded-full">{busy.length} on delivery</span>
          <span className="bg-gray-100 text-gray-600 font-semibold px-3 py-1 rounded-full">{offline.length} offline</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-100 border-t-brand-400" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drivers.map(driver => {
            const statusColor = DRIVER_STATUS_COLORS[driver.driver_status]
            const isAvailable = driver.driver_status === 'available'
            const isOffline   = driver.driver_status === 'offline'
            return (
              <div key={driver.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center font-bold text-brand-700 text-sm">
                      {driver.users?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'DR'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{driver.users?.full_name || 'Driver'}</p>
                      {driver.users?.phone && (
                        <a href={`tel:${driver.users.phone}`} className="text-xs text-brand-600 hover:text-brand-800">{driver.users.phone}</a>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor}`}>
                    {driver.driver_status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <p>{[driver.vehicle_color, driver.vehicle_make, driver.vehicle_model].filter(Boolean).join(' ') || 'Vehicle not set'}</p>
                  {driver.license_plate && <p>Plate: {driver.license_plate}</p>}
                  <p>{driver.total_deliveries} total deliveries</p>
                  {driver.location_updated_at && (
                    <p className="text-gray-400">GPS updated {new Date(driver.location_updated_at).toLocaleTimeString()}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isAvailable && (
                    <button onClick={() => setStatus(driver.id, 'available')}
                      className="flex-1 text-xs font-semibold py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg transition-colors">
                      Set Available
                    </button>
                  )}
                  {!isOffline && (
                    <button onClick={() => setStatus(driver.id, 'offline')}
                      className="flex-1 text-xs font-semibold py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors">
                      Set Offline
                    </button>
                  )}
                  {isOffline && (
                    <button onClick={() => setStatus(driver.id, 'available')}
                      className="flex-1 text-xs font-semibold py-1.5 bg-brand-400 hover:bg-brand-600 text-white rounded-lg transition-colors">
                      Bring Online
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {drivers.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <p>No drivers yet. Add drivers via Supabase dashboard or the admin panel.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
