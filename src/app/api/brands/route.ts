import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/brands - List all brands
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('brand_profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(data || [])
    } catch (error: any) {
        console.error('Error fetching brands:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST /api/brands - Create new brand
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const { data, error } = await supabase
            .from('brand_profiles')
            .insert({
                name: body.name,
                description: body.description || null,
                examples: body.examples || [],
                voice_samples: body.voice_samples || [],
                rules: body.rules || [],
                tone: body.tone || null,
                platform_guidelines: body.platform_guidelines || null,
                post_structures: body.post_structures || null,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data, { status: 201 })
    } catch (error: any) {
        console.error('Error creating brand:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
