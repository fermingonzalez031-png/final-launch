import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const zip = searchParams.get('zip')

  if (zip) {
    const { data } = await adminClient
      .from('service_areas')
      .select('id, name')
      .contains('zip_codes', [zip])
      .eq('is_active', true)
      .single()
    return NextResponse.json({ serviceable: !!data, area: data || null })
  }

  const { data } = await adminClient
    .from('service_areas')
    .select('id, name, cities, zip_codes, is_active')
    .eq('is_active', true)

  return NextResponse.json({ data })
}
