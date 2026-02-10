import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateLinkedInComment, type CommentGenerationContext } from '@/agents/commenting-agent'

export const dynamic = 'force-dynamic'

// POST /api/commenting/auto-generate - Auto-generate comments for all eligible posts
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { workspace_id } = body

    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // Fetch posts with status='discovered' that have comment_eligible_at <= now()
    const now = new Date().toISOString()

    const { data: eligiblePosts, error: postsError } = await supabase
      .from('vera_linkedin_posts_discovered')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('status', 'discovered')
      .lte('comment_eligible_at', now)
      .order('created_at', { ascending: true })

    if (postsError) throw postsError

    if (!eligiblePosts || eligiblePosts.length === 0) {
      return NextResponse.json({
        generated: 0,
        skipped: 0,
        errors: 0,
        message: 'No eligible posts found',
      })
    }

    // Fetch brand guidelines once
    const { data: brandGuidelines } = await supabase
      .from('vera_linkedin_brand_guidelines')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .single()

    // Check for existing comments to avoid duplicates
    const postIds = eligiblePosts.map(p => p.id)
    const { data: existingComments } = await supabase
      .from('vera_linkedin_comment_queue')
      .select('post_id, status')
      .in('post_id', postIds)
      .in('status', ['pending_approval', 'approved', 'scheduled', 'posting', 'posted'])

    const postsWithComments = new Set(
      (existingComments || []).map(c => c.post_id)
    )

    let generated = 0
    let skipped = 0
    let errors = 0

    for (const post of eligiblePosts) {
      // Skip if already has an active comment
      if (postsWithComments.has(post.id)) {
        skipped++
        continue
      }

      try {
        // Build proper CommentGenerationContext
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

        // Generate the comment
        const result = await generateLinkedInComment(context)

        // Save to comment queue
        const { error: saveError } = await supabase
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

        if (saveError) {
          console.error(`Error saving comment for post ${post.id}:`, saveError)
          errors++
          continue
        }

        // Update post status to processing
        await supabase
          .from('vera_linkedin_posts_discovered')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', post.id)

        generated++

        // 2-second delay between generations to avoid rate limits
        if (generated < eligiblePosts.length) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (genError) {
        console.error(`Error generating comment for post ${post.id}:`, genError)
        errors++
      }
    }

    return NextResponse.json({
      generated,
      skipped,
      errors,
      total_eligible: eligiblePosts.length,
    })
  } catch (error: unknown) {
    console.error('Auto-generate error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
