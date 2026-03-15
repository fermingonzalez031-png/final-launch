import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const update: Record<string, unknown> = {}

  if (body.driver_status) update.driver_status = body.driver_status
  if (body.current_lat !== undefined) {
    update.current_lat = body.current_lat
    update.current_lng = body.current_lng
    update.location_updated_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('drivers')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
