const MEDIUM_API_BASE = 'https://api.medium.com';

interface MediumTokens {
  access_token: string;
  refresh_token?: string;
}

async function mediumFetch(endpoint: string, tokens: MediumTokens, options: RequestInit = {}) {
  const res = await fetch(`${MEDIUM_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ errors: [{ message: res.statusText }] }));
    throw new Error(`Medium API error ${res.status}: ${JSON.stringify(error)}`);
  }
  return res.json();
}

export async function getMediumUser(tokens: MediumTokens) {
  return mediumFetch('/v1/me', tokens);
}

export async function getUserPublications(tokens: MediumTokens, userId: string) {
  return mediumFetch(`/v1/users/${userId}/publications`, tokens);
}

export interface CreatePostOptions {
  title: string;
  content: string;
  contentFormat: 'html' | 'markdown';
  tags?: string[];
  publishStatus?: 'draft' | 'public' | 'unlisted';
  canonicalUrl?: string;
  publicationId?: string;
}

export async function createPost(tokens: MediumTokens, userId: string, options: CreatePostOptions) {
  const endpoint = options.publicationId
    ? `/v1/publications/${options.publicationId}/posts`
    : `/v1/users/${userId}/posts`;
  return mediumFetch(endpoint, tokens, {
    method: 'POST',
    body: JSON.stringify({
      title: options.title,
      contentFormat: options.contentFormat,
      content: options.content,
      tags: options.tags || [],
      publishStatus: options.publishStatus || 'draft',
      canonicalUrl: options.canonicalUrl,
    }),
  });
}

// OAuth helpers
export function getMediumAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'basicProfile,publishPost,listPublications',
    state,
    response_type: 'code',
    redirect_uri: redirectUri,
  });
  return `https://medium.com/m/oauth/authorize?${params}`;
}

export async function exchangeMediumCode(code: string, redirectUri: string): Promise<MediumTokens> {
  const res = await fetch('https://api.medium.com/v1/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.MEDIUM_CLIENT_ID!,
      client_secret: process.env.MEDIUM_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Medium token exchange failed: ${res.status}`);
  return res.json();
}
