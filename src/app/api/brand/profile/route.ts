import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET - Fetch brand profile(s)
export async function GET(request: NextRequest) {
    try {
        const supabase = createAdminClient()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (id) {
            // Fetch specific profile
            const { data, error } = await supabase
                .from('brand_profiles')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            return NextResponse.json(data)
        }

        // Fetch all profiles or default
        const { data, error } = await supabase
            .from('brand_profiles')
            .select('*')
            .order('is_default', { ascending: false })
            .order('updated_at', { ascending: false })

        if (error) throw error
        return NextResponse.json(data || [])

    } catch (error) {
        console.error('Brand profile fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch brand profiles' }, { status: 500 })
    }
}

// POST - Create or update brand profile
export async function POST(request: NextRequest) {
    try {
        const supabase = createAdminClient()
        const body = await request.json()
        const { id, ...profileData } = body

        if (id) {
            // Update existing
            const { data, error } = await supabase
                .from('brand_profiles')
                .update(profileData)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return NextResponse.json(data)
        }

        // Create new
        const { data, error } = await supabase
            .from('brand_profiles')
            .insert(profileData)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data)

    } catch (error) {
        console.error('Brand profile save error:', error)
        return NextResponse.json({ error: 'Failed to save brand profile' }, { status: 500 })
    }
}

// DELETE - Remove brand profile
export async function DELETE(request: NextRequest) {
    try {
        const supabase = createAdminClient()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Profile ID required' }, { status: 400 })
        }

        const { error } = await supabase
            .from('brand_profiles')
            .delete()
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Brand profile delete error:', error)
        return NextResponse.json({ error: 'Failed to delete brand profile' }, { status: 500 })
    }
}
