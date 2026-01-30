import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const getSupabase = () => createAdminClient()

// DEV MODE - store profiles in memory (will be lost on server restart)
const DEV_MODE = process.env.NODE_ENV === 'development'
const devProfiles: Map<string, any[]> = new Map()

export interface VoiceProfile {
    id: string
    workspace_id: string
    name: string
    personality: string[]
    do_list: string[]
    dont_list: string[]
    key_phrases: string[]
    avoid_phrases: string[]
    writing_style: {
        sentenceLength: string
        formality: string
        useOfEmoji: boolean
        useOfHashtags: boolean
        perspective: string
    }
    summary: string
    is_default: boolean
    created_at: string
    updated_at: string
}

// GET - fetch voice profiles for a workspace
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspace_id')

    if (!workspaceId) {
        return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }

    if (DEV_MODE) {
        // Return dev profiles from memory
        const profiles = devProfiles.get(workspaceId) || []
        return NextResponse.json(profiles)
    }

    try {
        const { data, error } = await getSupabase()
            .from('voice_profiles')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) throw error
        return NextResponse.json(data || [])
    } catch (error) {
        console.error('Error fetching voice profiles:', error)
        return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }
}

// POST - create a new voice profile
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { workspace_id, name, profile, is_default = false } = body

        if (!workspace_id || !name || !profile) {
            return NextResponse.json(
                { error: 'workspace_id, name, and profile are required' },
                { status: 400 }
            )
        }

        const newProfile: VoiceProfile = {
            id: `vp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            workspace_id,
            name,
            personality: profile.personality || [],
            do_list: profile.doList || [],
            dont_list: profile.dontList || [],
            key_phrases: profile.keyPhrases || [],
            avoid_phrases: profile.avoidPhrases || [],
            writing_style: profile.writingStyle || {},
            summary: profile.summary || '',
            is_default,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        if (DEV_MODE) {
            // Store in memory for dev mode
            const existing = devProfiles.get(workspace_id) || []

            // If setting as default, unset others
            if (is_default) {
                existing.forEach(p => p.is_default = false)
            }

            existing.push(newProfile)
            devProfiles.set(workspace_id, existing)

            return NextResponse.json(newProfile)
        }

        // If setting as default, unset others first
        if (is_default) {
            await getSupabase()
                .from('voice_profiles')
                .update({ is_default: false })
                .eq('workspace_id', workspace_id)
        }

        const { data, error } = await getSupabase()
            .from('voice_profiles')
            .insert({
                workspace_id,
                name,
                personality: newProfile.personality,
                do_list: newProfile.do_list,
                dont_list: newProfile.dont_list,
                key_phrases: newProfile.key_phrases,
                avoid_phrases: newProfile.avoid_phrases,
                writing_style: newProfile.writing_style,
                summary: newProfile.summary,
                is_default
            })
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error creating voice profile:', error)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }
}

// DELETE - delete a voice profile
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const workspaceId = searchParams.get('workspace_id')

    if (!id) {
        return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    if (DEV_MODE) {
        if (workspaceId) {
            const existing = devProfiles.get(workspaceId) || []
            devProfiles.set(workspaceId, existing.filter(p => p.id !== id))
        }
        return NextResponse.json({ success: true })
    }

    try {
        const { error } = await getSupabase()
            .from('voice_profiles')
            .delete()
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting voice profile:', error)
        return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 })
    }
}

// PATCH - update a voice profile (e.g., set as default)
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, workspace_id, is_default, name } = body

        if (!id) {
            return NextResponse.json({ error: 'id required' }, { status: 400 })
        }

        if (DEV_MODE) {
            const existing = devProfiles.get(workspace_id) || []

            // If setting as default, unset others
            if (is_default) {
                existing.forEach(p => p.is_default = false)
            }

            const profile = existing.find(p => p.id === id)
            if (profile) {
                if (is_default !== undefined) profile.is_default = is_default
                if (name) profile.name = name
                profile.updated_at = new Date().toISOString()
            }

            devProfiles.set(workspace_id, existing)
            return NextResponse.json(profile)
        }

        // If setting as default, unset others first
        if (is_default && workspace_id) {
            await getSupabase()
                .from('voice_profiles')
                .update({ is_default: false })
                .eq('workspace_id', workspace_id)
        }

        const updates: any = { updated_at: new Date().toISOString() }
        if (is_default !== undefined) updates.is_default = is_default
        if (name) updates.name = name

        const { data, error } = await getSupabase()
            .from('voice_profiles')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error updating voice profile:', error)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
}
