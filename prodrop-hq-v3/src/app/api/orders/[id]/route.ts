import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { sendSMS, buildOrderSMS } from '@/lib/utils/sms'
import { getNextStatus } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *, 
      companies ( id, name, phone, email ),
      contractors ( id, title, phone_direct, users ( full_name, phone, email ) ),
      suppliers ( id, name, phone, primary_contact ),
      supplier_locations ( id, branch_name, address, city ),
      drivers ( id, vehicle_make, vehicle_model, vehicle_color, license_plate, current_lat, current_lng, users ( full_name, phone ) ),
      order_items ( id, part_description, quantity, unit_price ),
      delivery_events ( id, event_type, from_status, to_status, actor_role, notes, created_at ),
      proof_of_delivery ( id, photo_url, recipient_name, notes, submitted_at )
    `)
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Fetch current order
  const { data: current } = await supabase
    .from('orders').select('status, driver_id, contractor_id, order_number, companies(name)')
    .eq('id', params.id).single()
  if (!current) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = profile?.role

  // Build update object
  const update: Record<string, unknown> = {}
  if (body.status)               update.status = body.status
  if (body.notes !== undefined)  update.notes = body.notes
  if (body.supplier_id)          update.supplier_id = body.supplier_id
  if (body.supplier_location_id) update.supplier_location_id = body.supplier_location_id
  if (body.driver_id)            update.driver_id = body.driver_id
  if (body.eta_minutes)          update.eta_minutes = body.eta_minutes
  if (body.delivery_price)       update.delivery_price = body.delivery_price
  if (body.issue_description)    update.issue_description = body.issue_description
  if (body.cancellation_reason)  update.cancellation_reason = body.cancellation_reason

  if (body.eta_minutes) {
    update.eta_timestamp = new Date(Date.now() + body.eta_minutes * 60000).toISOString()
  }

  const { data, error } = await supabase
    .from('orders').update(update).eq('id', params.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log delivery event for status changes
  if (body.status && body.status !== current.status) {
    await adminClient.from('delivery_events').insert({
      order_id: params.id,
      event_type: 'status_change',
      from_status: current.status,
      to_status: body.status,
      actor_id: user.id,
      actor_role: role,
      notes: body.notes || null,
    })

    // Driver availability sync
    if (body.driver_id || current.driver_id) {
      const driverId = body.driver_id || current.driver_id
      if (body.status === 'driver_assigned')  await adminClient.from('drivers').update({ driver_status: 'assigned' }).eq('id', driverId)
      if (body.status === 'picked_up')        await adminClient.from('drivers').update({ driver_status: 'on_pickup' }).eq('id', driverId)
      if (body.status === 'en_route')         await adminClient.from('drivers').update({ driver_status: 'delivering' }).eq('id', driverId)
      if (body.status === 'delivered' || body.status === 'cancelled') {
        await adminClient.from('drivers').update({ driver_status: 'available' }).eq('id', driverId)
        if (body.status === 'delivered') {
          await adminClient.from('drivers').update({ total_deliveries: supabase.rpc('increment', { x: 1 }) as unknown as number }).eq('id', driverId)
        }
      }
    }

    // SMS on key transitions
    const orderNum = current.order_number
    if (body.status === 'supplier_confirmed' && body.contractor_phone) {
      await sendSMS(body.contractor_phone, buildOrderSMS('supplier_confirmed', orderNum, `ETA: ${body.eta_minutes || 60} min. Price: $${body.delivery_price || 35}`))
    }
    if (body.status === 'driver_assigned' && body.contractor_phone) {
      await sendSMS(body.contractor_phone, buildOrderSMS('driver_assigned', orderNum, body.driver_info || ''))
    }
    if (body.status === 'picked_up' && body.contractor_phone) {
      await sendSMS(body.contractor_phone, buildOrderSMS('picked_up', orderNum))
    }
    if (body.status === 'delivered' && body.contractor_phone) {
      await sendSMS(body.contractor_phone, buildOrderSMS('delivered', orderNum))
    }
  }

  await adminClient.from('activity_logs').insert({
    actor_id: user.id, actor_role: role, action: 'order.updated',
    entity_type: 'orders', entity_id: params.id,
    old_value: { status: current.status }, new_value: update
  })

  return NextResponse.json({ data })
}
