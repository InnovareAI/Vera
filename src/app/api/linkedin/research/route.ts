import { NextRequest, NextResponse } from 'next/server'
import {
    researchLinkedInProfile,
    analyzeWritingStyle
} from '@/lib/unipile'

// Default account ID from environment
const DEFAULT_ACCOUNT_ID = process.env.UNIPILE_ACCOUNT_ID

// POST /api/linkedin/research - Research a LinkedIn profile for brand training
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { profileUrl, accountId } = body

        if (!profileUrl) {
            return NextResponse.json(
                { error: 'profileUrl is required' },
                { status: 400 }
            )
        }

        // Use provided account ID or default from env
        const unipileAccountId = accountId || DEFAULT_ACCOUNT_ID

        if (!unipileAccountId) {
            return NextResponse.json(
                { error: 'No Unipile account configured. Please set UNIPILE_ACCOUNT_ID environment variable.' },
                { status: 400 }
            )
        }

        console.log('🔍 Researching LinkedIn profile:', { profileUrl, accountId: unipileAccountId })

        // Research the profile
        const research = await researchLinkedInProfile(profileUrl, unipileAccountId)

        if (!research.profile) {
            return NextResponse.json(
                { error: 'Could not find LinkedIn profile. Check the URL and try again.' },
                { status: 404 }
            )
        }

        // Analyze writing style from their posts
        const writingStyle = analyzeWritingStyle(research.writingSamples)

        console.log('✅ LinkedIn research complete:', {
            profile: research.profile.name,
            postsFound: research.posts.length,
            writingSamples: research.writingSamples.length,
        })

        return NextResponse.json({
            profile: research.profile,
            posts: research.posts.slice(0, 20), // Limit returned posts
            writingSamples: research.writingSamples,
            stats: research.stats,
            writingStyle,
        })
    } catch (error: any) {
        console.error('LinkedIn research error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to research LinkedIn profile' },
            { status: 500 }
        )
    }
}
