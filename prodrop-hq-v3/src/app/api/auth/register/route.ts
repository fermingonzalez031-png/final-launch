import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, phone, company_name, trade_type } = await req.json()
    if (!email || !password || !full_name || !company_name) {
      return NextResponse.json({ error: 'email, password, full_name and company_name are required' }, { status: 400 })
    }

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email, password,
      email_confirm: true,
      user_metadata: { full_name, role: 'contractor' }
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const userId = authData.user.id

    // Update public.users row (created by trigger)
    await adminClient.from('users').upsert({
      id: userId, email, full_name, phone: phone || null, role: 'contractor', is_active: true
    })

    // Create company
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .insert({ name: company_name, trade_type: trade_type || 'hvac', state: 'NY', is_active: true })
      .select()
      .single()
    if (companyError) {
      await adminClient.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
    }

    // Create contractor profile
    await adminClient.from('contractors').insert({
      user_id: userId, company_id: company.id,
      phone_direct: phone || null, is_primary_contact: true
    })

    return NextResponse.json({ message: 'Account created successfully' }, { status: 201 })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
