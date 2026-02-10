const TWITTER_API_BASE = 'https://api.twitter.com';

interface TwitterTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

async function twitterFetch(endpoint: string, tokens: TwitterTokens, options: RequestInit = {}) {
  const res = await fetch(`${TWITTER_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`Twitter API error ${res.status}: ${JSON.stringify(error)}`);
  }
  return res.json();
}

export async function createTweet(tokens: TwitterTokens, text: string, replyToId?: string) {
  const body: Record<string, unknown> = { text };
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };
  return twitterFetch('/2/tweets', tokens, { method: 'POST', body: JSON.stringify(body) });
}

export async function createThread(tokens: TwitterTokens, tweets: string[]) {
  const results = [];
  let previousId: string | undefined;
  for (const text of tweets) {
    const result = await createTweet(tokens, text, previousId);
    results.push(result);
    previousId = result.data?.id;
  }
  return results;
}

export async function getUserTweets(tokens: TwitterTokens, userId: string, maxResults = 10) {
  return twitterFetch(`/2/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=created_at,public_metrics`, tokens);
}

export async function getUserProfile(tokens: TwitterTokens, username: string) {
  return twitterFetch(`/2/users/by/username/${username}?user.fields=description,public_metrics,profile_image_url`, tokens);
}

export async function searchTweets(tokens: TwitterTokens, query: string, maxResults = 10) {
  return twitterFetch(`/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}&tweet.fields=created_at,public_metrics,author_id`, tokens);
}

export async function deleteTweet(tokens: TwitterTokens, tweetId: string) {
  return twitterFetch(`/2/tweets/${tweetId}`, tokens, { method: 'DELETE' });
}

// OAuth 2.0 PKCE helpers
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(36).padStart(2, '0')).join('').slice(0, 128);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function getTwitterAuthUrl(clientId: string, redirectUri: string, state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://twitter.com/i/oauth2/authorize?${params}`;
}

export async function exchangeTwitterCode(code: string, codeVerifier: string, redirectUri: string): Promise<TwitterTokens> {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}
