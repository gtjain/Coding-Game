// Build dist/index.html: one self-contained page (scripts inlined, audio as data: URIs).
// The claude.ai artifact viewer needs this; the multi-file version is for development.
// Usage: node tools/bundle.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const dataUri = f => 'data:audio/mpeg;base64,' + fs.readFileSync(path.join(root, f)).toString('base64');
const inline = js => '<script>\n' + js.replace(/<\/script/gi, '<\\/script') + '\n</script>';

const ctx = { window: {} };
vm.runInNewContext(read('audio/voices.js'), ctx);
const voices = Object.fromEntries(Object.entries(ctx.window.CH_VOICE).map(([t, f]) => [t, dataUri('audio/' + f)]));
const samples = Object.fromEntries(fs.readdirSync(path.join(root, 'audio/samples')).filter(f => f.endsWith('.mp3')).map(f => [f.replace('.mp3', ''), dataUri('audio/samples/' + f)]));
const audioJs = `window.CH_VOICE = ${JSON.stringify(voices)};\nwindow.CH_SAMPLES = ${JSON.stringify(samples)};`;

let html = read('index.html');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => inline(src === 'audio/voices.js' ? audioJs : read(src)));
if (/<script src=/.test(html)) throw new Error('unbundled script left');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
console.log(`dist/index.html: ${(html.length / 1024).toFixed(0)} KB, ${Object.keys(voices).length} clips, ${Object.keys(samples).length} samples`);
