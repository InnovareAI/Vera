import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Calculates the next available posting slot for a team member,
 * ensuring a minimum stagger offset from others in the same workspace.
 */
async function calculateStaggeredPostTime(workspaceId, requestedDate = new Date()) {
    const { data: members, error } = await supabase
        .from('vera_workspace_members')
        .select('email, posting_stagger_minutes')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active');

    if (error) throw error;

    // Get recently scheduled posts for this workspace
    const { data: recentPosts } = await supabase
        .from('scheduled_posts')
        .select('scheduled_at')
        .eq('workspace_id', workspaceId)
        .gte('scheduled_at', requestedDate.toISOString())
        .order('scheduled_at', { ascending: false });

    let nextSlot = new Date(requestedDate);
    const staggerMinutes = members[0]?.posting_stagger_minutes || 30;

    // Logic: find the latest post and add the stagger
    if (recentPosts && recentPosts.length > 0) {
        const latestPostTime = new Date(recentPosts[0].scheduled_at);
        nextSlot = new Date(latestPostTime.getTime() + staggerMinutes * 60000);
    }

    return nextSlot;
}

/**
 * Scans for recent posts from team members and creates engagement tasks
 * for all other members in the workspace.
 */
async function syncTeamEngagementLoop(workspaceId) {
    console.log(`🚀 Starting Team Engagement Sync for Workspace: ${workspaceId}`);

    // 1. Get all active team members with engagement enabled
    const { data: members } = await supabase
        .from('vera_workspace_members')
        .select('email, name')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .eq('engagement_loop_enabled', true);

    if (!members || members.length < 2) {
        console.log('ℹ️ Not enough members for an engagement loop.');
        return;
    }

    // 2. Mock: In a real scenario, we would fetch the latest "published" posts 
    // from the `content_items` or via Unipile account pulse.
    // Here we simulate finding a new post from an admin.

    // For each member's latest post...
    // members.forEach(author => {
    //    const others = members.filter(m => m.email !== author.email);
    //    others.forEach(liker => {
    //        queueEngagement(workspaceId, postUrl, author.email, liker.email);
    //    });
    // });

    console.log(`✅ Engagement loop logic initialized for ${members.length} members.`);
}

async function queueEngagement(workspaceId, postUrl, authorEmail, targetEmail) {
    const { error } = await supabase
        .from('team_engagement_tasks')
        .upsert({
            workspace_id: workspaceId,
            post_url: postUrl,
            post_author_email: authorEmail,
            target_member_email: targetEmail,
            engagement_type: 'like',
            status: 'pending'
        }, { onConflict: 'post_url,target_member_email' });

    if (error) console.error('❌ Error queuing engagement:', error.message);
}

// Example execution
const INNOVATE_WORKSPACE_ID = '54cce5b0-ce26-4d59-8937-38cc4a1e440c';
syncTeamEngagementLoop(INNOVATE_WORKSPACE_ID);
