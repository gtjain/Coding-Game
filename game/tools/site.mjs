// Build game/site/ for GitHub Pages: index.html wrapped in a full HTML document (doctype, viewport
// for phones), plus js/ and audio/ as separate files. The claude.ai viewer adds this wrapper itself.
// Usage: node tools/site.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'site');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

let body = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/^<meta charset="utf-8">\s*/, '');
const head = [];
body = body.replace(/<title>[\s\S]*?<\/title>\s*/, m => { head.push(m.trim()); return ''; });
body = body.replace(/<link [^>]*>\s*/g, m => { head.push(m.trim()); return ''; });
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${head.join('\n')}
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font-size:14px}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${body}
</body>
</html>
`;
fs.writeFileSync(path.join(out, 'index.html'), html);
for (const dir of ['js', 'audio']) fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
fs.writeFileSync(path.join(out, '.nojekyll'), '');
const count = d => fs.readdirSync(d, { recursive: true }).length;
console.log(`site/: index.html + ${count(path.join(out, 'js'))} js entries + ${count(path.join(out, 'audio'))} audio entries`);
