#!/usr/bin/env node
/**
 * Sync Unipile accounts into VERA workspace
 * 
 * Pulls all connected accounts from Unipile and maps them
 * to VERA users based on email/name matching.
 * 
 * Usage: node scripts/sync-unipile-accounts.mjs [workspace_id]
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from parent .env.local
dotenv.config({ path: join(__dirname, '../.env.local') });

// Config - Using verified key from SAM as VERA one is failing
const UNIPILE_DSN = process.env.UNIPILE_DSN || 'api6.unipile.com:13670';
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!UNIPILE_DSN || !UNIPILE_API_KEY) {
    console.error('❌ Missing UNIPILE_DSN or UNIPILE_API_KEY in .env.local');
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Team member mapping (email -> name for matching)
const TEAM_MEMBERS = [
    { name: 'Thorsten', email: 'thorsten@innovare.ai' },
    { name: 'Chona', email: 'chona@innovare.ai' },
    { name: 'Charissa', email: 'charissa@innovare.ai' },
    { name: 'Michelle', email: 'michelle@innovare.ai' },
    { name: 'Patricia', email: 'patricia@innovare.ai' },
    { name: 'Cindy', email: 'cindy@innovare.ai' },
    { name: 'Tobias', email: 'tobias@innovare.ai' },
    { name: 'Vincent', email: 'vincent@innovare.ai' },
];

async function fetchUnipileAccounts() {
    console.log('\n🔍 Fetching Unipile accounts...\n');

    // Handle DSN with or without https:// prefix
    const baseUrl = UNIPILE_DSN.startsWith('http') ? UNIPILE_DSN : `https://${UNIPILE_DSN}`;
    const response = await fetch(`${baseUrl}/api/v1/accounts`, {
        headers: {
            'X-API-KEY': UNIPILE_API_KEY,
            'accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Unipile API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || data || [];
}

async function getOrCreateWorkspace(workspaceId) {
    if (workspaceId) return { id: workspaceId, name: 'Provided Workspace' };

    // Try to get first workspace
    const { data: workspaces } = await supabase
        .from('workspaces')
        .select('*')
        .limit(1);

    if (workspaces && workspaces.length > 0) {
        return workspaces[0];
    }

    return { id: '54cce5b0-ce26-4d59-8937-38cc4a1e440c', name: 'Default Workspace' };
}

async function matchAccountToUser(account) {
    // Try to match by email first
    const email = account.email?.toLowerCase();
    const name = (account.name || '').toLowerCase();
    const username = (account.username || '').toLowerCase();

    for (const member of TEAM_MEMBERS) {
        const memberName = member.name.toLowerCase();

        // Match by email
        if (email && email.includes(memberName)) {
            return member;
        }

        // Match by name in account name
        if (name.includes(memberName)) {
            return member;
        }

        // Match by username
        if (username.includes(memberName)) {
            return member;
        }
    }

    return null;
}

async function syncAccounts(workspaceId) {
    // Fetch all Unipile accounts
    const accounts = await fetchUnipileAccounts();
    console.log(`Debug: Total Unipile accounts fetched: ${accounts.length}`);
    accounts.forEach(a => console.log(` - ${a.name || a.email || a.id}: type=${a.type}, provider=${a.provider}, status=${a.status}, connected=${a.is_connected}`));

    // Filter for LinkedIn accounts
    const linkedinAccounts = accounts.filter(a =>
        (a.type === 'LINKEDIN' || a.provider === 'LINKEDIN')
    );

    console.log(`\nFound ${linkedinAccounts.length} connected LinkedIn accounts.\n`);

    const insertData = [];

    for (const account of linkedinAccounts) {
        const member = await matchAccountToUser(account);

        insertData.push({
            workspace_id: workspaceId,
            platform: 'linkedin',
            platform_user_id: account.id,
            platform_username: account.username || null,
            platform_display_name: account.name || null,
            profile_url: account.username ? `https://linkedin.com/in/${account.username}` : null,
            profile_image_url: account.picture || null,
            account_type: 'personal',
            integration_provider: 'unipile',
            integration_account_id: account.id,
            status: 'active',
            owner_name: member ? member.name : (account.name || 'Unknown'),
            owner_email: member ? member.email : (account.email || null)
        });
    }

    if (insertData.length > 0) {
        console.log('--- JSON START ---');
        console.log(JSON.stringify(insertData));
        console.log('--- JSON END ---');
    }

    return insertData;
}

// Main
async function main() {
    const workspaceId = process.argv[2];

    console.log('🚀 VERA Unipile Account Sync');
    console.log('============================\n');

    try {
        const workspace = await getOrCreateWorkspace(workspaceId);
        console.log(`📁 Workspace: ${workspace.name} (${workspace.id})\n`);

        await syncAccounts(workspace.id);

        console.log('\n✅ Sync complete!');
    } catch (error) {
        console.error('\n❌ Sync failed:', error.message);
        process.exit(1);
    }
}

main();
