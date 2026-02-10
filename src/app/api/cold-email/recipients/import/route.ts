import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// POST /api/cold-email/recipients/import - CSV import
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { campaign_id, csv_data } = await request.json()

    if (!campaign_id || !csv_data) {
      return NextResponse.json({ error: 'campaign_id and csv_data required' }, { status: 400 })
    }

    // Parse CSV (expecting: email,first_name,last_name,company)
    const lines = csv_data.trim().split('\n')
    const headers = lines[0].toLowerCase().split(',').map((h: string) => h.trim())
    const emailIdx = headers.indexOf('email')
    if (emailIdx === -1) return NextResponse.json({ error: 'CSV must have email column' }, { status: 400 })

    const firstNameIdx = headers.indexOf('first_name')
    const lastNameIdx = headers.indexOf('last_name')
    const companyIdx = headers.indexOf('company')

    const recipients = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c: string) => c.trim())
      const email = cols[emailIdx]
      if (!email || !email.includes('@')) {
        errors.push(`Row ${i + 1}: invalid email`)
        continue
      }
      recipients.push({
        campaign_id,
        email,
        first_name: firstNameIdx >= 0 ? cols[firstNameIdx] || null : null,
        last_name: lastNameIdx >= 0 ? cols[lastNameIdx] || null : null,
        company: companyIdx >= 0 ? cols[companyIdx] || null : null,
      })
    }

    if (!recipients.length) {
      return NextResponse.json({ error: 'No valid recipients found', errors }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vera_cold_email_recipients')
      .insert(recipients)
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
