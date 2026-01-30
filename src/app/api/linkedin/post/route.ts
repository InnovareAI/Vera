import { NextRequest, NextResponse } from 'next/server'
import { createLinkedInPost, getConnectedAccounts, PostAttachment } from '@/lib/unipile'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Default account ID from environment
const DEFAULT_ACCOUNT_ID = process.env.UNIPILE_ACCOUNT_ID

// GET /api/linkedin/post - Get connected LinkedIn accounts
export async function GET(request: NextRequest) {
    try {
        const accounts = await getConnectedAccounts()

        // Filter to only LinkedIn accounts
        const linkedInAccounts = accounts.filter(acc =>
            acc.provider?.toLowerCase() === 'linkedin'
        )

        return NextResponse.json({
            accounts: linkedInAccounts,
            defaultAccountId: DEFAULT_ACCOUNT_ID
        })
    } catch (error: any) {
        console.error('Error fetching LinkedIn accounts:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch LinkedIn accounts' },
            { status: 500 }
        )
    }
}

// POST /api/linkedin/post - Create a LinkedIn post
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            accountId,
            text,
            imageUrl,
            videoUrl,
            contentId,  // Optional: ID of the content in our DB for tracking
            workspaceId
        } = body

        if (!text) {
            return NextResponse.json(
                { error: 'Post text is required' },
                { status: 400 }
            )
        }

        // Use provided account ID or default from env
        const unipileAccountId = accountId || DEFAULT_ACCOUNT_ID

        if (!unipileAccountId) {
            return NextResponse.json(
                { error: 'No LinkedIn account connected. Please connect a LinkedIn account or set UNIPILE_ACCOUNT_ID.' },
                { status: 400 }
            )
        }

        // Build attachments array
        const attachments: PostAttachment[] = []

        if (imageUrl) {
            attachments.push({
                type: 'image',
                url: imageUrl
            })
        }

        if (videoUrl) {
            attachments.push({
                type: 'video',
                url: videoUrl
            })
        }

        console.log('📤 Creating LinkedIn post:', {
            accountId: unipileAccountId,
            textLength: text.length,
            hasImage: !!imageUrl,
            hasVideo: !!videoUrl
        })

        // Create the post
        const result = await createLinkedInPost(
            unipileAccountId,
            text,
            attachments.length > 0 ? attachments : undefined
        )

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to create post' },
                { status: 500 }
            )
        }

        // If we have a contentId, update the content status in the database
        if (contentId && workspaceId) {
            try {
                await supabase
                    .from('generated_content')
                    .update({
                        status: 'published',
                        published_at: new Date().toISOString(),
                        published_post_id: result.post_id,
                        published_platform: 'linkedin'
                    })
                    .eq('id', contentId)
                    .eq('workspace_id', workspaceId)
            } catch (dbError) {
                console.error('Failed to update content status:', dbError)
                // Don't fail the request, just log
            }
        }

        console.log('✅ LinkedIn post created successfully:', result.post_id)

        return NextResponse.json({
            success: true,
            post_id: result.post_id,
            message: 'Post published to LinkedIn successfully!'
        })
    } catch (error: any) {
        console.error('LinkedIn post error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create LinkedIn post' },
            { status: 500 }
        )
    }
}
