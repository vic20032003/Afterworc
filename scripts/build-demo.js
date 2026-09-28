'use strict';
/* Builds the clickable demo into dist/demo: public site (index.html, site.html), account (app.html), staff console (admin.html),
   all running on the in-browser demo backend. Usage: npm run build:demo */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const root = path.join(__dirname, '..');
const out = path.join(root, 'dist', 'demo');
const run = cmd => execSync(cmd, { cwd: root, stdio: 'inherit' });

run('node scripts/capture-demo.js');
run('npx vite build --config vite.demo.config.js');

fs.renameSync(path.join(out, 'demo-app.html'), path.join(out, 'app.html'));
fs.renameSync(path.join(out, 'demo-admin.html'), path.join(out, 'admin.html'));
fs.cpSync(path.join(root, 'public', 'assets'), path.join(out, 'assets'), { recursive: true });
fs.cpSync(path.join(root, 'public', 'fonts'), path.join(out, 'fonts'), { recursive: true });
const fcss = path.join(out, 'fonts', 'fonts.css');
fs.writeFileSync(fcss, fs.readFileSync(fcss, 'utf8').split('url(/fonts/').join('url('));

// The public site links to /app and /admin; in the demo those are app.html and admin.html.
const siteJs = path.join(out, 'assets', 'site.js');
let js = fs.readFileSync(siteJs, 'utf8');
js = js.split('href="/app"').join('href="app.html"').split('href="/admin"').join('href="admin.html"').split("location.href='/app'").join("location.href='app.html'");
fs.writeFileSync(siteJs, js);

// Public site page: relative paths, the demo backend first, the site's scripts deferred so they run after it.
let html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
html = html.replace(/(href|src)="\/(assets|fonts)\//g, '$1="$2/')
  .replace(/<script src="assets\/(card|i18n|i18n-extra|legal|site)\.js"><\/script>/g, '<script defer src="assets/$1.js"></script>')
  .replace('<script defer src="assets/card.js"></script>', '<script type="module" src="app/demo-site.js"></script>\n<script defer src="assets/card.js"></script>')
  .replace('<title>AfterWorc · Build your workforce. We run the rest.</title>', '<title>AfterWorc Demo</title>');
fs.writeFileSync(path.join(out, 'index.html'), html);
// Same page as site.html (the account's "back to site" links) and as page.html: head and body content only, for hosts that wrap the page themselves.
fs.writeFileSync(path.join(out, 'site.html'), html);
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*/g, '');
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];
const title = head.match(/<title>.*?<\/title>/)[0];
fs.writeFileSync(path.join(out, 'page.html'), (title + '\n' + head.replace(title, '') + body).replace(/\n\s*\n/g, '\n').trim() + '\n');
console.log('Demo built in dist/demo');
