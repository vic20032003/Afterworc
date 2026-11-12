'use strict';
/* Sign in with Google, Facebook, Apple and GitHub (OAuth 2.0 / OpenID Connect, authorization code flow).
   A provider is turned on by setting its keys in the environment; see .env.example. No extra packages: fetch + crypto. */
const crypto = require('crypto');

const env = k => (process.env[k] || '').trim();
const baseUrl = () => (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const redirectUri = id => `${baseUrl()}/api/auth/oauth/${id}/callback`;
const b64url = buf => Buffer.from(buf).toString('base64url');
const FB = 'v21.0';

class OAuthError extends Error {}

async function http(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { Accept: 'application/json', 'User-Agent': 'AfterWorc', ...(opts.headers || {}) }, signal: AbortSignal.timeout(10000) });
  let d = null; try { d = await r.json(); } catch { /* not JSON */ }
  if (!r.ok || !d || d.error) throw new OAuthError(`provider request failed (${r.status}${d && d.error ? ': ' + (d.error.message || d.error) : ''})`);
  return d;
}
const form = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null)).toString();
const postForm = (url, body) => http(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(body) });

/** Reads the claims of an ID token received directly from the provider's token endpoint over TLS
 *  (OpenID Connect Core 3.1.3.7: the TLS server check stands in for the signature check here). */
function idTokenClaims(tok, { iss, aud, nonce }) {
  let c;
  try { c = JSON.parse(Buffer.from(String(tok).split('.')[1], 'base64url').toString()); } catch { throw new OAuthError('unreadable ID token'); }
  if (c.iss !== iss) throw new OAuthError('ID token from the wrong issuer');
  if (![].concat(c.aud).includes(aud)) throw new OAuthError('ID token for another app');
  if (!c.exp || c.exp * 1000 < Date.now() - 60000) throw new OAuthError('ID token expired');
  if (nonce && c.nonce !== nonce) throw new OAuthError('ID token nonce mismatch');
  return c;
}
const truthy = v => v === true || v === 'true';

/** Apple's client secret is a short-lived JWT signed with the .p8 key (ES256). */
function appleClientSecret() {
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: env('APPLE_KEY_ID') }));
  const t = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ iss: env('APPLE_TEAM_ID'), iat: t, exp: t + 300, aud: 'https://appleid.apple.com', sub: env('APPLE_CLIENT_ID') }));
  const key = env('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n');
  const sig = crypto.sign('sha256', Buffer.from(`${header}.${payload}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${header}.${payload}.${b64url(sig)}`;
}

/* Each provider: authUrl(params) and profile(code, ctx) -> { sub, email, emailVerified, name }. */
const PROVIDERS = {
  google: {
    name: 'Google',
    configured: () => !!(env('GOOGLE_CLIENT_ID') && env('GOOGLE_CLIENT_SECRET')),
    authUrl: ({ state, challenge, nonce }) => 'https://accounts.google.com/o/oauth2/v2/auth?' + form({
      client_id: env('GOOGLE_CLIENT_ID'), redirect_uri: redirectUri('google'), response_type: 'code', scope: 'openid email profile',
      state, nonce, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account'
    }),
    async profile(code, { verifier, nonce }) {
      const t = await postForm('https://oauth2.googleapis.com/token', {
        grant_type: 'authorization_code', code, redirect_uri: redirectUri('google'), client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'), code_verifier: verifier
      });
      const c = idTokenClaims(t.id_token, { iss: 'https://accounts.google.com', aud: env('GOOGLE_CLIENT_ID'), nonce });
      return { sub: String(c.sub), email: c.email, emailVerified: truthy(c.email_verified), name: c.name || '' };
    }
  },

  facebook: {
    name: 'Facebook',
    configured: () => !!(env('FACEBOOK_APP_ID') && env('FACEBOOK_APP_SECRET')),
    authUrl: ({ state, challenge }) => `https://www.facebook.com/${FB}/dialog/oauth?` + form({
      client_id: env('FACEBOOK_APP_ID'), redirect_uri: redirectUri('facebook'), response_type: 'code', scope: 'email public_profile',
      state, code_challenge: challenge, code_challenge_method: 'S256'
    }),
    async profile(code, { verifier }) {
      const t = await http(`https://graph.facebook.com/${FB}/oauth/access_token?` + form({
        client_id: env('FACEBOOK_APP_ID'), client_secret: env('FACEBOOK_APP_SECRET'), redirect_uri: redirectUri('facebook'), code, code_verifier: verifier
      }));
      const proof = crypto.createHmac('sha256', env('FACEBOOK_APP_SECRET')).update(t.access_token).digest('hex');
      const me = await http(`https://graph.facebook.com/${FB}/me?` + form({ fields: 'id,name,email', access_token: t.access_token, appsecret_proof: proof }));
      // Facebook gives no "verified" flag, so its e-mail is never used to join an existing account.
      return { sub: String(me.id), email: me.email, emailVerified: false, name: me.name || '' };
    }
  },

  apple: {
    name: 'Apple',
    configured: () => !!(env('APPLE_CLIENT_ID') && env('APPLE_TEAM_ID') && env('APPLE_KEY_ID') && env('APPLE_PRIVATE_KEY')),
    // Asking for name/email makes Apple POST the result back (form_post), so the callback also accepts POST.
    authUrl: ({ state, nonce }) => 'https://appleid.apple.com/auth/authorize?' + form({
      client_id: env('APPLE_CLIENT_ID'), redirect_uri: redirectUri('apple'), response_type: 'code', response_mode: 'form_post', scope: 'name email', state, nonce
    }),
    async profile(code, { nonce, user }) {
      const t = await postForm('https://appleid.apple.com/auth/token', {
        grant_type: 'authorization_code', code, redirect_uri: redirectUri('apple'), client_id: env('APPLE_CLIENT_ID'), client_secret: appleClientSecret()
      });
      const c = idTokenClaims(t.id_token, { iss: 'https://appleid.apple.com', aud: env('APPLE_CLIENT_ID'), nonce });
      let name = '';
      try { const n = JSON.parse(user || '{}').name || {}; name = [n.firstName, n.lastName].filter(Boolean).join(' '); } catch { /* Apple sends the name only the first time */ }
      return { sub: String(c.sub), email: c.email, emailVerified: truthy(c.email_verified), name };
    }
  },

  github: {
    name: 'GitHub',
    configured: () => !!(env('GITHUB_CLIENT_ID') && env('GITHUB_CLIENT_SECRET')),
    authUrl: ({ state, challenge }) => 'https://github.com/login/oauth/authorize?' + form({
      client_id: env('GITHUB_CLIENT_ID'), redirect_uri: redirectUri('github'), scope: 'read:user user:email', state,
      code_challenge: challenge, code_challenge_method: 'S256', allow_signup: 'true'
    }),
    async profile(code, { verifier }) {
      const t = await postForm('https://github.com/login/oauth/access_token', {
        client_id: env('GITHUB_CLIENT_ID'), client_secret: env('GITHUB_CLIENT_SECRET'), code, redirect_uri: redirectUri('github'), code_verifier: verifier
      });
      const auth = { Authorization: `Bearer ${t.access_token}`, 'X-GitHub-Api-Version': '2022-11-28' };
      const me = await http('https://api.github.com/user', { headers: auth });
      const emails = await http('https://api.github.com/user/emails', { headers: auth });
      const primary = (Array.isArray(emails) ? emails : []).find(e => e.primary && e.verified) || (Array.isArray(emails) ? emails : []).find(e => e.verified);
      return { sub: String(me.id), email: primary ? primary.email : null, emailVerified: !!primary, name: me.name || me.login || '' };
    }
  }
};

const list = () => Object.entries(PROVIDERS).map(([id, p]) => ({ id, name: p.name, enabled: p.configured() }));
function pkce() {
  const verifier = b64url(crypto.randomBytes(32));
  return { verifier, challenge: b64url(crypto.createHash('sha256').update(verifier).digest()) };
}

module.exports = { PROVIDERS, list, pkce, OAuthError, idTokenClaims, redirectUri };
