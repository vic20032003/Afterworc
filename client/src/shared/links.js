/* Page links. In the clickable demo (one static bundle, no server) the pages are site.html, app.html and admin.html. */
const DEMO = { '/': 'site.html', '/app': 'app.html', '/admin': 'admin.html' };
export function link(p) {
  if (!window.__AW_DEMO) return p;
  const [path, hash] = p.split('#');
  return (DEMO[path || '/'] || path) + (hash ? '#' + hash : '');
}
