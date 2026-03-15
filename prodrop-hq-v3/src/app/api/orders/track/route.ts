import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderNumber = searchParams.get('order_number')
  if (!orderNumber) return NextResponse.json({ error: 'order_number is required' }, { status: 400 })

  const { data, error } = await adminClient
    .from('orders')
    .select(`
      order_number, status, priority, jobsite_address, part_description,
      equipment_brand, eta_timestamp, eta_minutes,
      requested_at, confirmed_at, assigned_at, picked_up_at, delivered_at,
      is_after_hours,
      drivers ( vehicle_color, vehicle_make, vehicle_model, current_lat, current_lng ),
      delivery_events ( event_type, to_status, created_at, notes )
    `)
    .eq('order_number', orderNumber)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  return NextResponse.json({ data })
}
