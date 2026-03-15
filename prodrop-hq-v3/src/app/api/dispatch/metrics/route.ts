import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  const [activeRes, newRes, enRouteRes, deliveredRes, driversRes, revenueRes] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).not('status', 'in', '("delivered","cancelled")'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new_request'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'en_route'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'delivered').gte('delivered_at', today + 'T00:00:00Z'),
    supabase.from('drivers').select('id, driver_status'),
    supabase.from('orders').select('total_amount').eq('status', 'delivered').gte('delivered_at', today + 'T00:00:00Z'),
  ])

  const revenue = revenueRes.data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
  const available = driversRes.data?.filter(d => d.driver_status === 'available').length || 0

  return NextResponse.json({
    data: {
      active_orders:   activeRes.count || 0,
      new_requests:    newRes.count || 0,
      en_route_now:    enRouteRes.count || 0,
      delivered_today: deliveredRes.count || 0,
      total_drivers:   driversRes.data?.length || 0,
      available_drivers: available,
      revenue_today:   Math.round(revenue * 100) / 100,
    }
  })
}
