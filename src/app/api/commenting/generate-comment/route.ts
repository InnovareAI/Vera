import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateLinkedInComment, type CommentGenerationContext } from '@/agents/commenting-agent'

export const dynamic = 'force-dynamic'

// POST /api/commenting/generate-comment - Generate a comment for a discovered post
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { workspace_id, post_id } = body

    if (!workspace_id || !post_id) {
      return NextResponse.json(
        { error: 'workspace_id and post_id are required' },
        { status: 400 }
      )
    }

    // Fetch the discovered post
    const { data: post, error: postError } = await supabase
      .from('vera_linkedin_posts_discovered')
      .select('*')
      .eq('id', post_id)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Fetch brand guidelines for the workspace
    const { data: brandGuidelines } = await supabase
      .from('vera_linkedin_brand_guidelines')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .single()

    // Build proper CommentGenerationContext for the agent
    const context: CommentGenerationContext = {
      post: {
        id: post.id,
        post_linkedin_id: post.social_id,
        post_social_id: post.social_id,
        post_text: post.post_content || '',
        post_type: 'feed',
        author: {
          linkedin_id: post.author_profile_id || '',
          name: post.author_name || 'Unknown',
          title: post.author_headline || undefined,
        },
        engagement: {
          likes_count: post.engagement_metrics?.likes || 0,
          comments_count: post.engagement_metrics?.comments || 0,
          shares_count: post.engagement_metrics?.shares || 0,
        },
        posted_at: new Date(post.post_date || post.created_at),
      },
      workspace: {
        workspace_id,
        company_name: brandGuidelines?.what_you_do?.split(' ')[0] || 'Our Company',
        expertise_areas: brandGuidelines?.industry_talking_points?.split(',').map((s: string) => s.trim()) || [],
        products: [],
        value_props: [],
        tone_of_voice: brandGuidelines?.tone_of_voice || 'professional',
        brand_guidelines: brandGuidelines || undefined,
      },
    }

    // Generate the comment via the commenting agent
    const result = await generateLinkedInComment(context)

    // Save to comment queue
    const { data: savedComment, error: saveError } = await supabase
      .from('vera_linkedin_comment_queue')
      .insert({
        workspace_id,
        post_id: post.id,
        post_social_id: post.social_id,
        comment_text: result.comment_text,
        comment_length: result.comment_text.length,
        confidence_score: result.confidence_score || null,
        reasoning: result.reasoning || null,
        quality_indicators: result.quality_indicators || null,
        extracted_facts: result.extracted_facts || null,
        suggested_approaches: result.suggested_approaches || null,
        generated_by: 'claude',
        generation_model: result.generation_metadata?.model || 'claude-haiku-4-5-20251001',
        status: 'pending_approval',
      })
      .select()
      .single()

    if (saveError) throw saveError

    // Update the post status to processing
    await supabase
      .from('vera_linkedin_posts_discovered')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', post_id)

    return NextResponse.json({
      comment: savedComment,
      post: {
        id: post.id,
        author_name: post.author_name,
        post_content: post.post_content?.substring(0, 200),
      },
    })
  } catch (error: unknown) {
    console.error('Generate comment error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
