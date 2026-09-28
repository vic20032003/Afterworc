'use strict';
/* Builds the React apps (account + staff console) when dist/ is missing or older than the sources. */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const root = path.join(__dirname, '..');
const out = path.join(root, 'dist', 'app', 'index.html');
function newest(dir) {
  let t = 0;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    t = Math.max(t, f.isDirectory() ? newest(p) : fs.statSync(p).mtimeMs);
  }
  return t;
}
const stale = !fs.existsSync(out) || (fs.existsSync(path.join(root, 'client')) && newest(path.join(root, 'client')) > fs.statSync(out).mtimeMs);
if (stale) {
  if (!fs.existsSync(path.join(root, 'node_modules', 'vite'))) { console.error('The app is not built and Vite is not installed. Run: npm install && npm run build'); process.exit(1); }
  console.log('Building the account and staff console…');
  execSync('npx vite build', { cwd: root, stdio: 'inherit' });
}
