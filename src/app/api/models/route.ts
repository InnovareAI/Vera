import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

// GET /api/models - List all AI models
export async function GET() {
    try {
        const { data, error } = await getSupabase()
            .from('models')
            .select('*')
            .eq('is_active', true)
            .order('provider', { ascending: true })

        if (error) throw error

        return NextResponse.json(data || [])
    } catch (error: any) {
        console.error('Error fetching models:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
