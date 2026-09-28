/* JSON API client shared by the account and the staff console. */
import { link } from './links.js';
export class ApiError extends Error { constructor(msg, data, status) { super(msg); this.data = data || {}; this.status = status; } }

export async function api(path, body, { method } = {}) {
  const r = await fetch('/api' + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'afterworc' },
    credentials: 'same-origin', body: body ? JSON.stringify(body) : undefined
  });
  if (r.status === 401) { location.href = link('/#login'); throw new ApiError('Log in to continue', {}, 401); }
  let d = {}; try { d = await r.json(); } catch { /* not JSON */ }
  if (!r.ok) throw new ApiError(d.error || 'Something went wrong. Try again.', d, r.status);
  return d;
}

async function postForm(path, fd) {
  const r = await fetch('/api' + path, { method: 'POST', headers: { 'X-Requested-With': 'afterworc' }, body: fd, credentials: 'same-origin' });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(d.error || 'Upload failed', d, r.status);
  return d;
}
/** Documents (delivery files, receipts, ID): up to 5 at once. */
export function uploadFiles(files) { const fd = new FormData(); [...files].slice(0, 5).forEach(f => fd.append('files', f)); return postForm('/account/files', fd).then(d => d.files); }
/** One image for the avatar or the portfolio (checked on the server). */
export function uploadImage(file) { const fd = new FormData(); fd.append('file', file); return postForm('/account/media', fd).then(d => d.file); }
