import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const order_id = formData.get('order_id') as string
  const recipient_name = formData.get('recipient_name') as string | null
  const notes = formData.get('notes') as string | null
  const delivery_lat = formData.get('delivery_lat') ? parseFloat(formData.get('delivery_lat') as string) : null
  const delivery_lng = formData.get('delivery_lng') ? parseFloat(formData.get('delivery_lng') as string) : null

  if (!file || !order_id) return NextResponse.json({ error: 'file and order_id required' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Must be an image' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })

  // Get driver id
  const { data: driver } = await supabase.from('drivers').select('id').eq('user_id', user.id).single()
  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })

  // Verify order assignment
  const { data: order } = await supabase.from('orders')
    .select('driver_id, status').eq('id', order_id).single()
  if (!order || order.driver_id !== driver.id) return NextResponse.json({ error: 'Not your assigned order' }, { status: 403 })

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${order_id}/pod_${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('proof-of-delivery')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('proof-of-delivery').getPublicUrl(path)

  // Insert uploaded_files record
  await supabase.from('uploaded_files').insert({
    order_id, uploader_id: user.id,
    file_type: 'proof_of_delivery',
    storage_path: path, public_url: publicUrl,
    file_size_bytes: file.size, mime_type: file.type
  })

  // Insert proof_of_delivery record
  const { data: pod, error: podError } = await supabase.from('proof_of_delivery').insert({
    order_id, driver_id: driver.id,
    photo_url: publicUrl,
    delivery_lat, delivery_lng, recipient_name, notes
  }).select().single()

  if (podError) return NextResponse.json({ error: podError.message }, { status: 500 })
  return NextResponse.json({ data: pod }, { status: 201 })
}
