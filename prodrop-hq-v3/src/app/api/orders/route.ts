import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { checkAfterHours } from '@/lib/utils'
import { sendSMS, buildOrderSMS } from '@/lib/utils/sms'

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')
  const priority  = searchParams.get('priority')
  const page      = parseInt(searchParams.get('page') || '1')
  const limit     = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = profile?.role

  let query = supabase
    .from('orders')
    .select(`
      id, order_number, status, priority, jobsite_address,
      part_description, equipment_brand, model_number,
      delivery_price, total_amount, is_after_hours,
      requested_at, eta_timestamp, picked_up_at, delivered_at,
      companies ( id, name ),
      contractors ( id, users ( full_name, phone ) ),
      suppliers ( id, name ),
      drivers ( id, vehicle_color, vehicle_make, vehicle_model, users ( full_name, phone ) )
    `, { count: 'exact' })
    .order('priority', { ascending: false })
    .order('requested_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  // Contractors only see their own company's orders
  if (role === 'contractor') {
    const { data: contractor } = await supabase
      .from('contractors').select('company_id').eq('user_id', user.id).single()
    if (contractor) query = query.eq('company_id', contractor.company_id)
  }

  // Drivers only see assigned orders
  if (role === 'driver') {
    const { data: driver } = await supabase
      .from('drivers').select('id').eq('user_id', user.id).single()
    if (driver) query = query.eq('driver_id', driver.id)
  }

  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, meta: { total: count, page, limit } })
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { jobsite_address, part_description, priority = 'standard', equipment_brand, model_number, notes } = body

  if (!jobsite_address || !part_description) {
    return NextResponse.json({ error: 'jobsite_address and part_description are required' }, { status: 400 })
  }

  // Get contractor info
  const { data: contractor } = await supabase
    .from('contractors')
    .select('id, company_id, companies ( name )')
    .eq('user_id', user.id)
    .single()

  if (!contractor) return NextResponse.json({ error: 'Contractor profile not found' }, { status: 404 })

  // Estimate price
  const priceMap: Record<string, number> = { standard: 35, rush: 50, emergency: 75 }
  const deliveryPrice = priceMap[priority] || 35
  const isAfterHours = checkAfterHours()
  const totalAmount = deliveryPrice + (isAfterHours ? 15 : 0)

  // Model lookup (optional)
  let matched_part_id = null
  if (model_number) {
    const { data: parts } = await supabase.rpc('lookup_parts_for_model', {
      p_model_number: model_number,
      p_brand: equipment_brand || null
    })
    if (parts?.length) matched_part_id = parts[0].part_id
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      company_id:      contractor.company_id,
      contractor_id:   contractor.id,
      status:          'new_request',
      priority,
      jobsite_address,
      part_description,
      equipment_brand: equipment_brand || null,
      model_number:    model_number || null,
      matched_part_id,
      delivery_price:  deliveryPrice,
      total_amount:    totalAmount,
      is_after_hours:  isAfterHours,
      notes:           notes || null,
    })
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

  // Insert first order item
  await supabase.from('order_items').insert({
    order_id: order.id, part_description, quantity: 1
  })

  // Send SMS notifications
  const companyName = (contractor.companies as Record<string, string>)?.name || 'Unknown'
  const dispatchPhone = process.env.DISPATCH_ALERT_PHONE
  if (dispatchPhone) {
    await sendSMS(dispatchPhone, `NEW ${priority === 'rush' ? '🚨RUSH ' : priority === 'emergency' ? '🔴EMERGENCY ' : ''}request ${order.order_number}: ${companyName} needs ${part_description} at ${jobsite_address}`)
  }

  if (user.phone) {
    await sendSMS(user.phone, `Your Prodrop request ${order.order_number} received. We'll confirm availability shortly.`)
  }

  // Log activity
  await adminClient.from('activity_logs').insert({
    actor_id: user.id, actor_role: 'contractor',
    action: 'order.created', entity_type: 'orders', entity_id: order.id,
    new_value: { status: 'new_request', priority }
  })

  return NextResponse.json({ data: order }, { status: 201 })
}
