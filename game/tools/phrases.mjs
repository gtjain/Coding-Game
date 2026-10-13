// Collect every line the app can speak: any string under a `say` key, plus everything in `lines`.
// Usage: node tools/phrases.mjs > tools/phrases.json
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/catalog.js'), 'utf8'), ctx);
const cat = ctx.window.CH_CATALOG;

const out = new Set();
const strings = v => typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];
const walk = v => {
  if (Array.isArray(v)) return v.forEach(walk);
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k === 'say') strings(x).forEach(s => out.add(s)); else walk(x); }
};
strings(cat.lines).forEach(s => out.add(s));
walk(cat.games);
process.stdout.write(JSON.stringify([...out], null, 2) + '\n');
