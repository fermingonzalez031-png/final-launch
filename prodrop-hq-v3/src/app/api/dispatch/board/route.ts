import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { KANBAN_COLUMNS } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // All non-cancelled orders (last 20 delivered)
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, priority, jobsite_address,
      part_description, equipment_brand, model_number,
      delivery_price, total_amount, is_after_hours,
      requested_at, eta_timestamp,
      companies ( name ),
      contractors ( users ( full_name, phone ) ),
      suppliers ( name ),
      drivers ( id, driver_status, vehicle_color, vehicle_make, vehicle_model, users ( full_name, phone ) )
    `)
    .neq('status', 'cancelled')
    .order('priority', { ascending: false })
    .order('requested_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by status
  const columns: Record<string, typeof orders> = {}
  for (const s of KANBAN_COLUMNS) columns[s] = []
  columns['issue'] = []

  for (const o of orders || []) {
    const col = o.status as OrderStatus
    if (columns[col]) columns[col]!.push(o)
  }
  // Cap delivered at 10
  if (columns['delivered']) columns['delivered'] = columns['delivered']!.slice(0, 10)

  const counts: Record<string, number> = {}
  for (const [k, v] of Object.entries(columns)) counts[k] = v?.length || 0

  // Available drivers
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, driver_status, current_lat, current_lng, vehicle_color, vehicle_make, vehicle_model, users ( full_name, phone )')
    .neq('driver_status', 'offline')

  return NextResponse.json({
    data: {
      columns,
      counts,
      available_drivers: drivers?.filter(d => d.driver_status === 'available') || []
    }
  })
}
