import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('drivers')
    .select(`
      id, driver_status, vehicle_make, vehicle_model, vehicle_color,
      license_plate, current_lat, current_lng, location_updated_at,
      total_deliveries, notes,
      users ( id, full_name, phone, email )
    `)
    .order('driver_status')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
